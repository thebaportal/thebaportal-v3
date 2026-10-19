// Project impact — Slice 1. Changes propagate as awareness before they propagate
// as edits: when trusted project knowledge changes, surface the connected work
// that may be affected, and let the Business Analyst decide what, if anything,
// gets revised. Nothing here edits, rewrites or judges content.
//
// Deterministic, from recorded data only:
//   trigger     an Approved version is superseded by a newly Approved version
//               (0011 guarantees each lineage then has exactly one current Approved)
//   detection   current work (a lineage's Approved version and/or its working
//               Draft) whose recorded source_artifact_ids contain that superseded
//               version. No relevance tables, no inferred links, no AI, direct
//               dependencies only.
//   grouping    one item per affected work lineage — its Approved and Draft are
//               one project item, never counted twice
//   reviewed    an impact_reviews row for the exact (affected version, superseded
//               source, current source) suppresses that change; a later Approved
//               source version is a different change and raises a fresh impact
//   coverage    work with no recorded sources is "connection information
//               unavailable" — never reported as unaffected
//
// Pure and framework-free (like workContext.ts) so it runs unchanged in the
// browser, in the API's server-side re-check, and under `node --test`.

import { requirementIds, extractRequirementItems, CONTEXT_TYPE_LABEL } from "./workContext.ts";

export interface ImpactArtifact {
  id: string; type: string; status: string; version: number; content: string; title?: string | null;
  source_artifact_ids?: string[] | null;
  lineage_id?: string | null;
  reasoning_context?: Record<string, unknown> | null;
}
export interface ImpactReview { artifact_id: string; superseded_source_id: string; new_source_id: string; }

export interface VersionRef { id: string; version: number }
export interface RequirementItemChanges { added: string[]; removed: string[]; changed: string[] }
export interface ImpactChange {
  affected: VersionRef & { status: "approved" | "draft" };   // the version of this work that recorded the old source
  source: { type: string; label: string; lineageId: string | null };
  used: VersionRef;                                          // superseded version in source_artifact_ids
  current: VersionRef;                                       // that source lineage's current Approved version
  requirementItems: RequirementItemChanges | null;           // Requirements sources only; null = no stable ids to compare
  referencedChanged: string[];                               // changed/removed ids this work's own content mentions
}
export interface ImpactItem {
  key: string;                                               // `${type}:${lineageId ?? ""}`
  type: string; label: string; title: string; lineageId: string | null;
  approved: VersionRef | null; draft: VersionRef | null;     // the work's current state
  changes: ImpactChange[];                                   // open (unreviewed) changes only
}
export interface ImpactSummary {
  items: ImpactItem[];
  unavailable: { key: string; label: string; imported: boolean }[];
  connectedCount: number;                                    // current work lineages that record any source
}

const WORKING = ["draft", "in_review"];
export const lineageKey = (a: Pick<ImpactArtifact, "type" | "lineage_id">) => `${a.type}:${a.lineage_id ?? ""}`;
const ref = (a: ImpactArtifact): VersionRef => ({ id: a.id, version: a.version });
const labelOf = (a: ImpactArtifact) => {
  const base = a.type === "test_case" ? "Testing" : CONTEXT_TYPE_LABEL[a.type] ?? a.type;   // work-area name, as on Project Home
  return a.lineage_id && a.title && a.title !== base ? `${base} — ${a.title}` : base;
};
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Requirement items that differ between two versions, by stable id only:
 * added (id only in the newer), removed (id only in the older), changed (same id,
 * different text after whitespace normalisation). Different ids are never matched.
 * null when neither version contains a stable requirement id.
 */
export function compareRequirementItems(older: string, newer: string): RequirementItemChanges | null {
  const before = requirementIds(older), after = requirementIds(newer);
  if (!before.length && !after.length) return null;
  const inBefore = new Set(before), inAfter = new Set(after);
  return {
    added: after.filter(id => !inBefore.has(id)),
    removed: before.filter(id => !inAfter.has(id)),
    changed: before.filter(id => inAfter.has(id)
      && squash(extractRequirementItems(older, [id])) !== squash(extractRequirementItems(newer, [id]))),
  };
}

export function computeImpacts(artifacts: ImpactArtifact[], reviews: ImpactReview[] = []): ImpactSummary {
  const byId = new Map(artifacts.map(a => [a.id, a]));
  const reviewed = new Set(reviews.map(r => `${r.artifact_id}|${r.superseded_source_id}|${r.new_source_id}`));

  // Current state of every lineage: its Approved version and its working Draft.
  const lineages = new Map<string, { approved?: ImpactArtifact; draft?: ImpactArtifact }>();
  for (const a of artifacts) {
    const slot = a.status === "approved" ? "approved" : WORKING.includes(a.status) ? "draft" : null;
    if (!slot) continue;
    const l = lineages.get(lineageKey(a)) ?? {};
    const prev = l[slot];
    if (!prev || a.version > prev.version) l[slot] = a;   // the database allows one of each; stay safe regardless
    lineages.set(lineageKey(a), l);
  }

  const items: ImpactItem[] = [], unavailable: ImpactSummary["unavailable"] = [];
  let connectedCount = 0;
  for (const [key, l] of lineages) {
    const versions = [l.approved, l.draft].filter((v): v is ImpactArtifact => !!v);
    const head = l.draft ?? l.approved!;
    if (!versions.some(v => (v.source_artifact_ids ?? []).length)) {
      unavailable.push({ key, label: labelOf(head), imported: versions.some(v => v.reasoning_context?.origin === "imported") });
      continue;
    }
    connectedCount++;
    const changes: ImpactChange[] = [];
    for (const v of versions) {
      const mentioned = new Set(v.content.match(/\b(?:CAP|BR|FR|NFR|US)-\d+\b/g) ?? []);
      for (const sid of new Set(v.source_artifact_ids ?? [])) {
        const used = byId.get(sid);
        if (!used || used.status !== "superseded") continue;
        const current = lineages.get(lineageKey(used))?.approved;
        if (!current || current.id === used.id) continue;
        if (reviewed.has(`${v.id}|${used.id}|${current.id}`)) continue;
        const requirementItems = used.type === "requirements" ? compareRequirementItems(used.content, current.content) : null;
        changes.push({
          affected: { ...ref(v), status: v.status === "approved" ? "approved" : "draft" },
          source: { type: used.type, label: labelOf(used), lineageId: used.lineage_id ?? null },
          used: ref(used), current: ref(current), requirementItems,
          referencedChanged: requirementItems ? [...requirementItems.changed, ...requirementItems.removed].filter(id => mentioned.has(id)) : [],
        });
      }
    }
    if (!changes.length) continue;
    items.push({
      key, type: head.type, label: labelOf(head), title: head.title ?? labelOf(head), lineageId: head.lineage_id ?? null,
      approved: l.approved ? ref(l.approved) : null, draft: l.draft ? ref(l.draft) : null,
      // by source, then the Approved version before the working Draft
      changes: changes.sort((a, b) => a.source.label.localeCompare(b.source.label) || a.used.version - b.used.version
        || (a.affected.status === b.affected.status ? 0 : a.affected.status === "approved" ? -1 : 1)),
    });
  }
  items.sort((a, b) => a.label.localeCompare(b.label));
  unavailable.sort((a, b) => a.label.localeCompare(b.label));
  return { items, unavailable, connectedCount };
}

/** The source transitions an item's changes represent, deduplicated: "Requirements v2 → v3". */
export function sourceTransitions(item: ImpactItem): string[] {
  return [...new Set(item.changes.map(c => `${c.source.label} v${c.used.version} → v${c.current.version}`))];
}
