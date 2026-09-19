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
// V1 rule set is deliberately narrow, all three fully deterministic from data
// that exists today. Coverage-gap detection ("this requirement has no test
// case") only evaluates ids the BA explicitly declared in scope for a given
// Testing artifact (reasoning_context.scope_ids) — never every approved
// Requirement that merely exists in the project. That is the scope-aware
// principle this file exists to enforce, not a placeholder for a future rule.

import { extractItemIds, parseTestCaseCoverage } from "@/lib/rtm";

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
  content?: string;
  source_artifact_ids?: string[] | null;
  reasoning_context?: { scope_ids?: string[] } | null;
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

  // Coverage gaps — only ever evaluated against a BA-declared scope on an
  // approved Testing artifact, never against every approved Requirement in
  // the project. An id the BA never brought into scope for this round is not
  // a gap, it simply was not expected here.
  const scopedTestCases = artifacts.filter(
    a => a.type === "test_case" && a.status === "approved" && (a.reasoning_context?.scope_ids?.length ?? 0) > 0
  );
  for (const tc of scopedTestCases) {
    const scopeIds = tc.reasoning_context!.scope_ids!;
    const covered = new Set(parseTestCaseCoverage(tc.content ?? "").flatMap(row => row.covers));
    const gaps = scopeIds.filter(id => !covered.has(id));
    if (gaps.length > 0) {
      items.push({
        id: `coverage-gap-${tc.id}`,
        category: "coverage_gap",
        categoryLabel: "Coverage gaps",
        text: `${gaps.length} item${gaps.length === 1 ? "" : "s"} in this testing round's declared scope ${gaps.length === 1 ? "has" : "have"} no linked test case: ${gaps.join(", ")}.`,
        severity: "material",
        actionLabel: "Review coverage",
      });
    }
  }

  return items;
}

// Re-exported so callers that only need id extraction (e.g. the scope
// checklist in the import flow) don't need to import from rtm.ts directly
// for what is conceptually attention/scope machinery.
export { extractItemIds };
