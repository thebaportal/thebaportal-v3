// ── Project attention ────────────────────────────────────────────────────────
// Single source of truth for "what needs a BA's attention" on a project.
// Project Home's Attention zone and any future contextual workstream alerts
// must both render from this, never compute their own version.
//
// Locked product rule (2026-09-18): Attention only evaluates a relationship
// the project has actually established as expected. It never infers a
// requirement merely because an upstream artifact exists, and it never
// treats an empty/unstarted work area as a problem — that is "missing
// context," handled locally inside the work area, not here.
//
// V1 rule set is deliberately narrow. Two rules below are fully deterministic
// from data that exists today. Coverage-gap detection ("this requirement has
// no test case") is intentionally NOT implemented yet — it requires a
// declared testing scope/baseline, which does not exist in the product yet
// (see the "Bring existing work into the project" capability, designed
// separately). Building it against "every approved requirement" would
// violate the scope-aware principle this file exists to enforce.

export type AttentionCategory = "coverage_gap" | "stale_work" | "unresolved_issue";
export type AttentionSeverity = "material" | "noncritical";

export interface AttentionItem {
  id: string;
  category: AttentionCategory;
  categoryLabel: string;
  text: string;
  severity: AttentionSeverity;
  actionLabel: string;
}

interface AttentionArtifact {
  id: string;
  type: string;
  status: string;
  source_artifact_ids?: string[] | null;
}

interface AttentionFinding {
  id: string;
  review_status: string;
}

const TYPE_LABEL: Record<string, string> = {
  problem_analysis: "Problem Analysis",
  stakeholder_analysis: "Stakeholder Analysis",
  requirements: "Requirements",
  process_map: "Process Analysis",
  user_stories: "User Stories",
  brd: "Business Case",
  test_case: "Testing",
};

export function computeAttention(
  artifacts: AttentionArtifact[],
  findings: AttentionFinding[]
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const byId = new Map(artifacts.map(a => [a.id, a]));

  // Potentially stale work — an active artifact was built from a source that
  // has since been superseded (a newer version was approved) or archived.
  // This is a real, deterministic relationship break: the artifacts table
  // already marks the previous approved version "superseded" the moment a
  // new one is approved (see the PATCH handler in the artifacts API).
  for (const a of artifacts) {
    if (a.status === "superseded" || a.status === "archived") continue;
    const staleSource = (a.source_artifact_ids ?? [])
      .map(id => byId.get(id))
      .find(src => src && (src.status === "superseded" || src.status === "archived"));
    if (staleSource) {
      items.push({
        id: `stale-${a.id}`,
        category: "stale_work",
        categoryLabel: "Potentially stale work",
        text: `${TYPE_LABEL[a.type] ?? a.type} was built on a version of ${TYPE_LABEL[staleSource.type] ?? staleSource.type} that has since changed.`,
        severity: "material",
        actionLabel: "Review impact",
      });
    }
  }

  // Unresolved issues — BA Intelligence findings still sitting as "proposed",
  // neither accepted into the project nor rejected.
  const proposed = findings.filter(f => f.review_status === "proposed");
  if (proposed.length > 0) {
    items.push({
      id: "unresolved-findings",
      category: "unresolved_issue",
      categoryLabel: "Unresolved issues",
      text: `${proposed.length} finding${proposed.length === 1 ? "" : "s"} from BA Intelligence ${proposed.length === 1 ? "hasn't" : "haven't"} been reviewed yet.`,
      severity: "noncritical",
      actionLabel: "Review findings",
    });
  }

  return items;
}
