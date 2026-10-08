// Work-area context — the single source of truth for what a Work area sends to
// the model AND what its "Context in use" strip shows. Both come from the same
// resolved list of parts (buildWorkContext), so they cannot drift apart.
//
// Model: the project is the shared brain; each Work area is a relevance lens
// over it. Context flows automatically, but authority does not — every layer
// keeps its own trust level in the prompt:
//   - project notes: BA-supplied, unvalidated source material
//   - approved artifacts: trusted project evidence (drafts are never included)
//   - accepted BA Intelligence findings: validated, with per-category rules
//   - logged decisions: status preserved — only Accepted is authoritative
// These are context inputs, never prerequisites: every area can start blank.
//
// Pure and framework-free on purpose (no React, no imports) so it can be
// unit-tested directly with Node: see tests/workContext.test.mjs.

export type WorkAreaId =
  | "problem-analysis" | "stakeholder-analysis" | "requirements" | "process-analysis"
  | "user-stories" | "business-case" | "testing";

export interface CtxProject {
  name: string; problem_statement?: string; methodology?: string;
  industry?: string; country?: string; relevant_context?: string;
}
export interface CtxNote { id: string; source_label: string | null; source_text: string; created_at: string; }
export interface CtxArtifact {
  id: string; type: string; title?: string; content: string; status: string; version: number;
  reasoning_context?: Record<string, unknown> | null;
}
export interface CtxFinding { id: string; session_id: string; category: string; finding_text: string; }
export interface CtxDecision {
  id: string; decision_text: string; made_by?: string; decision_date?: string;
  status: string; impact_notes?: string; created_at: string;
}

// ── Relevance per Work area ──────────────────────────────────────────────────
// Which approved artifact types and which accepted finding categories each area
// draws on. Decisions are project-level and go to every area with their status.
// Testing's Requirements are not listed here: Testing only ever receives the
// requirement items the BA selected in its scope picker (see resolveTesting).
const ALL_FINDINGS = ["requirement", "business_rule", "unresolved_question", "contradiction", "edge_case"];
export const WORK_CONTEXT: Record<WorkAreaId, { artifactTypes: string[]; findingCategories: string[] }> = {
  "problem-analysis":     { artifactTypes: [],                                                                     findingCategories: ["contradiction", "unresolved_question", "business_rule"] },
  "stakeholder-analysis": { artifactTypes: ["problem_analysis"],                                                   findingCategories: ["contradiction", "unresolved_question"] },
  "requirements":         { artifactTypes: ["problem_analysis", "stakeholder_analysis", "process_map", "decision_lab_output"], findingCategories: ALL_FINDINGS },
  "process-analysis":     { artifactTypes: ["problem_analysis", "stakeholder_analysis", "requirements"],          findingCategories: ["business_rule", "edge_case", "contradiction", "unresolved_question"] },
  "user-stories":         { artifactTypes: ["requirements"],                                                       findingCategories: ["business_rule", "edge_case"] },
  "business-case":        { artifactTypes: ["problem_analysis", "stakeholder_analysis", "requirements", "decision_lab_output"], findingCategories: ["business_rule", "contradiction", "unresolved_question"] },
  "testing":              { artifactTypes: [],                                                                     findingCategories: ["edge_case", "business_rule"] },
};

export const CONTEXT_TYPE_LABEL: Record<string, string> = {
  problem_analysis: "Problem Analysis", stakeholder_analysis: "Stakeholder Analysis",
  decision_lab_output: "Decision Lab Analysis", requirements: "Requirements",
  user_stories: "User Stories", process_map: "Process Analysis", brd: "Business Case", test_case: "Test Cases",
};
// A project can hold several distinct approved Decision Lab outputs at once; every
// other type is one evolving document, so only its latest approved version counts.
export const MULTI_INSTANCE_TYPES = ["decision_lab_output"];

// Labels/colours match BAIntelligenceClient's CATEGORY_META so both surfaces read alike.
export const FINDING_CATEGORY_META: { id: string; label: string; color: string }[] = [
  { id: "requirement",         label: "Potential Requirements", color: "var(--teal)" },
  { id: "business_rule",       label: "Business Rules",         color: "#3b72ac" },
  { id: "unresolved_question", label: "Unresolved Questions",   color: "#b5741f" },
  { id: "contradiction",       label: "Contradictions",         color: "#a83f32" },
  { id: "edge_case",           label: "Possible Edge Cases",    color: "#74628f" },
];
const FINDING_CATEGORY_GUIDANCE: Record<string, string> = {
  requirement: "may inform requirement drafting, do not copy directly into a formal requirement",
  business_rule: "treat as a constraint or governing logic on requirements, not a requirement itself",
  unresolved_question: "do not infer or assume an answer, carry into Open Questions if relevant",
  contradiction: "do not silently resolve, surface as an unresolved conflict in Open Questions if relevant",
  edge_case: "use for completeness and acceptance thinking, do not turn into a standalone requirement by itself",
};

// Decision authority. Order = prompt order. Unknown statuses are treated as Open.
const DECISION_STATUS: { status: string; heading: string }[] = [
  { status: "accepted", heading: "Accepted — authoritative project decisions" },
  { status: "open",     heading: "Open — unresolved, not yet decided; do not treat as settled" },
  { status: "deferred", heading: "Deferred — deliberately postponed; do not treat as settled and do not reopen unprompted" },
  { status: "rejected", heading: "Rejected — explicitly decided against; do not recommend these again without stating that the project rejected them" },
];

// ── Item ids (CAP/BR/FR/NFR requirements, US stories) ────────────────────────
const REQUIREMENT_ID = /\b(?:CAP|BR|FR|NFR)-\d+\b/g;
// Leading id of a line, after list/table/bold markers: "- **FR-001**: x", "| FR-001 |", "FR-001-AC-1: x".
function leadingRequirementId(line: string): string | null {
  const m = line.replace(/^[\s>|*•·\-–—#]+/, "").replace(/^\*\*/, "").match(/^((?:CAP|BR|FR|NFR)-\d+)(?!\d)/);
  return m ? m[1] : null;
}
/** Requirement ids (CAP/BR/FR/NFR) in an artifact — the candidates Testing's scope picker offers. */
export function requirementIds(content: string): string[] {
  return [...new Set([...content.matchAll(REQUIREMENT_ID)].map(m => m[0]))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Only the lines of a Requirements artifact that belong to the selected ids, under their section headings. */
export function extractRequirementItems(content: string, ids: string[]): string {
  const wanted = new Set(ids);
  const out: string[] = [];
  let heading = "", emittedHeading = "", capturing = false;
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^#{1,6}\s/.test(line)) { heading = line.trim(); capturing = false; continue; }
    const lead = leadingRequirementId(line);
    if (lead) {
      capturing = wanted.has(lead);
      if (capturing) {
        if (heading && heading !== emittedHeading) { out.push("", heading); emittedHeading = heading; }
        out.push(line);
      }
      continue;
    }
    if (!line.trim() || /^-{3,}\s*$/.test(line.trim())) { capturing = false; continue; }
    if (capturing) out.push(line);
  }
  return out.join("\n").trim();
}

/**
 * User stories reliably linked to the selected requirements. The User Stories
 * generator writes an explicit "(Satisfies: FR-003)" tag only when the link is
 * genuinely clear; that tag is the only signal trusted here. Stories without it,
 * or whose tag names no selected requirement, are left out — never guessed.
 */
export function extractLinkedStories(content: string, ids: string[]): { storyIds: string[]; text: string } {
  const wanted = new Set(ids);
  const blocks: string[] = [];
  let current: string[] | null = null;
  const flush = () => { if (current) blocks.push(current.join("\n").trim()); current = null; };
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*\*\*US-\d+/.test(line)) { flush(); current = [line]; continue; }
    if (/^#{1,6}\s/.test(line)) { flush(); continue; }
    if (current) current.push(line);
  }
  flush();
  const linked = blocks.filter(block => [...block.matchAll(/Satisfies:\s*([^)\n]+)/gi)]
    .some(m => [...m[1].matchAll(REQUIREMENT_ID)].some(id => wanted.has(id[0]))));
  return {
    storyIds: linked.map(b => b.match(/US-\d+/)![0]),
    text: linked.map(b => b.replace(/\n-{3,}\s*$/, "").trim()).join("\n\n"),
  };
}

// ── Resolution ───────────────────────────────────────────────────────────────
/** One resolved context part: the exact prompt block and the exact strip label, produced together. */
export interface ContextPart {
  kind: "project" | "notes" | "artifact" | "testing-scope" | "findings" | "decisions";
  strip: string | null;          // label in "Context in use"; null = not shown separately
  prompt: string;                // block sent to the model
  artifactIds?: string[];
  findingIds?: string[];
  sessionIds?: string[];
  decisionIds?: string[];
}
export interface WorkContext<F extends CtxFinding = CtxFinding> {
  parts: ContextPart[];
  strip: string[];               // = parts' strip labels, in order
  text: string;                  // = header + parts' prompt blocks + [USER INPUT]
  sourceIds: string[];
  findingIds: string[];
  sessionIds: string[];
  findings: F[];                 // the relevant accepted findings (for the BA Intelligence panel)
}

const latestApproved = (artifacts: CtxArtifact[], type: string) =>
  artifacts.filter(a => a.type === type && a.status === "approved").sort((a, b) => b.version - a.version)[0];

function artifactHeader(a: CtxArtifact, label: string, extra = ""): string {
  const imported = a.reasoning_context?.origin === "imported";
  return `Approved ${label}${a.title && a.title !== label ? ` — ${a.title}` : ""} (v${a.version})${imported ? " [imported from an external source; its approved status was asserted by the Business Analyst on import]" : ""}${extra}:`;
}

export function buildWorkContext<F extends CtxFinding>(input: {
  area: WorkAreaId; project: CtxProject; notes: CtxNote[]; artifacts: CtxArtifact[];
  findings: F[]; decisions: CtxDecision[]; testingScopeIds?: string[];
  methodologyLabel?: (m: string) => string;
}): WorkContext<F> {
  const { area, project, notes, artifacts, findings, decisions } = input;
  const cfg = WORK_CONTEXT[area];
  const parts: ContextPart[] = [];

  // Project context (always)
  const p = [`Project: ${project.name}`];
  if (project.problem_statement) p.push(`Problem Statement: ${project.problem_statement}`);
  if (project.methodology) p.push(`Methodology: ${input.methodologyLabel?.(project.methodology) ?? project.methodology}`);
  if (project.industry) p.push(`Industry: ${project.industry}`);
  if (project.country) p.push(`Country: ${project.country}`);
  if (project.relevant_context) p.push(`Additional Context: ${project.relevant_context}`);
  parts.push({ kind: "project", strip: "Project context", prompt: p.join("\n") });

  // Project notes — automatic, explicitly unvalidated
  if (notes.length) {
    const lines = [
      "[BA-SUPPLIED PROJECT NOTES]",
      "Notes the Business Analyst added to the project, oldest first. They are unvalidated source material — use them as context, but do not treat any note as an approved artifact, accepted requirement, business rule or decision merely because it was supplied.",
    ];
    for (const n of notes) {
      const date = new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      lines.push(`\n- ${date} · ${n.source_label || "Project note"}:\n${n.source_text}`);
    }
    parts.push({ kind: "notes", strip: "Project notes", prompt: lines.join("\n") });
  }

  // Approved artifacts — trusted evidence; drafts never included
  for (const type of cfg.artifactTypes) {
    const label = CONTEXT_TYPE_LABEL[type] ?? type;
    if (MULTI_INSTANCE_TYPES.includes(type)) {
      const approved = artifacts.filter(a => a.type === type && a.status === "approved");
      if (!approved.length) continue;
      parts.push({
        kind: "artifact", strip: approved.length > 1 ? `${label} (${approved.length})` : label,
        prompt: approved.map(a => `${artifactHeader(a, label)}\n${a.content}`).join("\n\n"),
        artifactIds: approved.map(a => a.id),
      });
    } else {
      const a = latestApproved(artifacts, type);
      if (!a) continue;
      parts.push({ kind: "artifact", strip: `${label} v${a.version}`, prompt: `${artifactHeader(a, label)}\n${a.content}`, artifactIds: [a.id] });
    }
  }

  // Testing — only the requirements the BA selected, plus stories explicitly linked to them
  if (area === "testing") parts.push(...resolveTesting(artifacts, input.testingScopeIds ?? []));

  // Accepted findings — relevant categories only, category semantics preserved
  const relevant = findings.filter(f => cfg.findingCategories.includes(f.category));
  if (relevant.length) {
    const lines = [
      "[VALIDATED BA INTELLIGENCE]",
      "Findings below were reviewed and explicitly accepted by the Business Analyst from stakeholder input analysis. They are validated context, not formal requirements. Each category below has its own handling rule, stated in brackets.",
    ];
    for (const meta of FINDING_CATEGORY_META) {
      const items = relevant.filter(f => f.category === meta.id);
      if (!items.length) continue;
      lines.push(`\n${meta.label} (${FINDING_CATEGORY_GUIDANCE[meta.id]}):`);
      for (const f of items) lines.push(`- ${f.finding_text}`);
    }
    parts.push({
      kind: "findings", strip: `${relevant.length} finding${relevant.length === 1 ? "" : "s"}`, prompt: lines.join("\n"),
      findingIds: relevant.map(f => f.id), sessionIds: [...new Set(relevant.map(f => f.session_id))],
    });
  }

  // Decisions — status preserved; only Accepted is authoritative
  if (decisions.length) {
    const lines = [
      "[PROJECT DECISIONS]",
      "Decisions logged on this project, grouped by status. Only Accepted decisions are authoritative project positions. Do not present Open, Deferred or Rejected decisions as settled truth.",
    ];
    const known = DECISION_STATUS.map(d => d.status);
    for (const group of DECISION_STATUS) {
      const items = decisions.filter(d => (known.includes(d.status) ? d.status : "open") === group.status);
      if (!items.length) continue;
      lines.push(`\n${group.heading}:`);
      for (const d of items) {
        const meta = [d.decision_date, d.made_by ? `made by ${d.made_by}` : ""].filter(Boolean).join(", ");
        lines.push(`- ${d.decision_text}${meta ? ` (${meta})` : ""}${d.impact_notes ? ` — impact: ${d.impact_notes}` : ""}`);
      }
    }
    parts.push({ kind: "decisions", strip: `${decisions.length} decision${decisions.length === 1 ? "" : "s"}`, prompt: lines.join("\n"), decisionIds: decisions.map(d => d.id) });
  }

  const text = ["[ESTABLISHED PROJECT CONTEXT]", ...parts.map(x => x.prompt), "[USER INPUT]"].join("\n\n");
  return {
    parts,
    strip: parts.map(x => x.strip).filter((s): s is string => !!s),
    text,
    sourceIds: parts.flatMap(x => x.artifactIds ?? []),
    findingIds: parts.flatMap(x => x.findingIds ?? []),
    sessionIds: [...new Set(parts.flatMap(x => x.sessionIds ?? []))],
    findings: relevant,
  };
}

/** Testing scope: requirement ids offered by the picker (latest approved Requirements only). */
export function testingScopeCandidates(artifacts: CtxArtifact[]): string[] {
  const req = latestApproved(artifacts, "requirements");
  return req ? requirementIds(req.content) : [];
}

function resolveTesting(artifacts: CtxArtifact[], scopeIds: string[]): ContextPart[] {
  const req = latestApproved(artifacts, "requirements");
  const candidates = req ? requirementIds(req.content) : [];
  const selected = scopeIds.filter(id => candidates.includes(id));
  if (!req || !selected.length) {
    return [{
      kind: "testing-scope", strip: "No requirements in scope",
      prompt: "[TESTING SCOPE]\nNo requirements are in scope for this testing round. Do not assume any approved requirement is in scope. Work only from the Business Analyst's own input below.",
    }];
  }
  const parts: ContextPart[] = [{
    kind: "testing-scope", strip: `Requirements v${req.version} · ${selected.length} in scope`,
    prompt: `[TESTING SCOPE]\n${artifactHeader(req, "Requirements", ` — only the ${selected.length} of ${candidates.length} items the Business Analyst selected for this testing round (${selected.join(", ")}). Write tests only for these; do not cover requirements that are not listed`)}\n${extractRequirementItems(req.content, selected)}`,
    artifactIds: [req.id],
  }];
  const stories = latestApproved(artifacts, "user_stories");
  if (stories) {
    const linked = extractLinkedStories(stories.content, selected);
    if (linked.storyIds.length) {
      parts.push({
        kind: "artifact", strip: `User Stories v${stories.version} · ${linked.storyIds.length} linked`,
        prompt: `${artifactHeader(stories, "User Stories", ` — only stories explicitly linked (Satisfies) to the selected requirements: ${linked.storyIds.join(", ")}`)}\n${linked.text}`,
        artifactIds: [stories.id],
      });
    }
  }
  return parts;
}
