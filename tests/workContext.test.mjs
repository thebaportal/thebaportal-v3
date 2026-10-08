// Regression tests for src/lib/projects/workContext.ts — the one resolved context
// behind both the Work area's "Context in use" strip and its AI request.
// Run (Node 22, built-in runner, no dependencies):  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkContext, WORK_CONTEXT, extractRequirementItems, extractLinkedStories, testingScopeCandidates } from "../src/lib/projects/workContext.ts";

const AREAS = ["problem-analysis", "stakeholder-analysis", "requirements", "process-analysis", "user-stories", "business-case", "testing"];
const project = { name: "Claims Modernisation", problem_statement: "Claims stall between teams.", methodology: "agile" };
const art = (id, type, status, version, content, extra = {}) => ({ id, type, status, version, content, title: undefined, ...extra });
const REQ = `# Requirements Package

## Business Requirements
BR-001: Claims above $25,000 require secondary approval.
BR-002: Every claim must have a single owner.

## Functional Requirements
FR-001: Submit a claim through one intake form.
  Includes attachments up to 10 MB.
FR-002: Show the claim queue to managers.
FR-003: Notify the claimant on every status change.

## Open Questions
FR-003 notification channel is unconfirmed.`;
const STORIES = `## Stories

---
**US-001 · HIGH**
As a **claimant**, I want to submit one form so that nothing is lost.
**Notes:** (Satisfies: FR-001)

---
**US-002 · MEDIUM**
As a **manager**, I want to see the queue so that I can assign work.
**Notes:** (Satisfies: FR-002, BR-002)

---
**US-003 · LOW**
As a **claimant**, I want status emails so that I stay informed. Mentions FR-003 but has no satisfies tag.
`;
const artifacts = [
  art("pa1", "problem_analysis", "superseded", 1, "OLD PA"),
  art("pa2", "problem_analysis", "approved", 2, "## Problem Statement\nPA APPROVED CONTENT"),
  art("pa3", "problem_analysis", "draft", 3, "PA DRAFT CONTENT"),
  art("sa1", "stakeholder_analysis", "approved", 1, "SA APPROVED CONTENT"),
  art("pm1", "process_map", "approved", 1, "PROCESS APPROVED CONTENT"),
  art("rq1", "requirements", "approved", 1, REQ),
  art("us1", "user_stories", "approved", 1, STORIES),
  art("dl1", "decision_lab_output", "approved", 1, "DL ONE", { title: "Intake tool" }),
  art("dl2", "decision_lab_output", "approved", 1, "DL TWO", { title: "Approval routing" }),
  art("dl3", "decision_lab_output", "draft", 1, "DL DRAFT"),
  art("bc1", "brd", "approved", 1, "BC APPROVED CONTENT"),
];
const notes = [{ id: "n1", source_label: "Meeting", source_text: "NOTE: SMEs say approvals take two weeks.", created_at: "2026-10-01T10:00:00Z" }];
const CATS = ["requirement", "business_rule", "unresolved_question", "contradiction", "edge_case"];
const findings = CATS.map((c, i) => ({ id: `f${i}`, session_id: "s1", category: c, finding_text: `FINDING-${c}` }));
const decisions = [
  { id: "d1", decision_text: "DECISION-accepted use SharePoint", status: "accepted", created_at: "2026-10-01" },
  { id: "d2", decision_text: "DECISION-open routing owner", status: "open", created_at: "2026-10-02" },
  { id: "d3", decision_text: "DECISION-deferred mobile app", status: "deferred", created_at: "2026-10-03" },
  { id: "d4", decision_text: "DECISION-rejected buy new CRM", status: "rejected", created_at: "2026-10-04" },
];
const build = (area, over = {}) => buildWorkContext({ area, project, notes, artifacts, findings, decisions, ...over });

// ── The core guarantee: strip and AI request come from the same resolved parts ──
test("strip and AI request are generated from the same resolved context (every area)", () => {
  for (const area of AREAS) for (const scope of [[], ["FR-001", "BR-002"]]) {
    const c = build(area, { testingScopeIds: scope });
    assert.deepEqual(c.strip, c.parts.map(p => p.strip).filter(Boolean), `${area}: strip = parts' labels`);
    assert.equal(c.text, ["[ESTABLISHED PROJECT CONTEXT]", ...c.parts.map(p => p.prompt), "[USER INPUT]"].join("\n\n"), `${area}: text = parts' prompts`);
    for (const p of c.parts) assert.ok(c.text.includes(p.prompt), `${area}: prompt includes ${p.kind}`);
    // Semantic correspondence of every strip label with what the model receives
    for (const label of c.strip) {
      let m;
      if (label === "Project context") assert.ok(c.text.includes(`Project: ${project.name}`));
      else if (label === "Project notes") assert.ok(c.text.includes("[BA-SUPPLIED PROJECT NOTES]") && c.text.includes("NOTE: SMEs"));
      else if ((m = label.match(/^(\d+) findings?$/))) assert.equal((c.text.match(/^- FINDING-/gm) || []).length, Number(m[1]), `${area}: finding count`);
      else if ((m = label.match(/^(\d+) decisions?$/))) assert.equal((c.text.match(/^- DECISION-/gm) || []).length, Number(m[1]), `${area}: decision count`);
      else if (label === "No requirements in scope") assert.ok(c.text.includes("No requirements are in scope"));
      else if ((m = label.match(/^Requirements v(\d+) · (\d+) in scope$/))) assert.ok(c.text.includes(`Approved Requirements (v${m[1]})`) && c.text.includes(`only the ${m[2]} of`));
      else if ((m = label.match(/^User Stories v(\d+) · (\d+) linked$/))) assert.ok(c.text.includes(`Approved User Stories (v${m[1]})`));
      else if ((m = label.match(/^(.+) v(\d+)$/))) assert.ok(c.text.includes(`Approved ${m[1]} (v${m[2]})`), `${area}: ${label}`);
      else if ((m = label.match(/^Decision Lab Analysis(?: \((\d+)\))?$/))) assert.equal((c.text.match(/Approved Decision Lab Analysis — /g) || []).length, Number(m[1] ?? 1));
      else assert.fail(`${area}: unexpected strip label "${label}"`);
    }
    // …and nothing reaches the model without a strip label
    for (const [marker, label] of [["[BA-SUPPLIED PROJECT NOTES]", "Project notes"], ["[VALIDATED BA INTELLIGENCE]", /findings?$/], ["[PROJECT DECISIONS]", /decisions?$/]])
      if (c.text.includes(marker)) assert.ok(c.strip.some(s => typeof label === "string" ? s === label : label.test(s)), `${area}: ${marker} shown`);
    for (const [, type, label] of [...c.text.matchAll(/Approved (Problem Analysis|Stakeholder Analysis|Process Analysis|Requirements|User Stories|Business Case) \(v\d+\)/g)].map(m => [m[0], m[1], m[1]]))
      assert.ok(c.strip.some(s => s.startsWith(label)), `${area}: ${type} in prompt is shown in strip`);
  }
});

test("relevance per area matches the approved model", () => {
  assert.deepEqual(WORK_CONTEXT["problem-analysis"].findingCategories.sort(), ["business_rule", "contradiction", "unresolved_question"]);
  assert.deepEqual(WORK_CONTEXT["stakeholder-analysis"].findingCategories.sort(), ["contradiction", "unresolved_question"]);
  assert.deepEqual(WORK_CONTEXT["requirements"].findingCategories.sort(), [...CATS].sort());
  assert.deepEqual(WORK_CONTEXT["process-analysis"].findingCategories.sort(), ["business_rule", "contradiction", "edge_case", "unresolved_question"]);
  assert.deepEqual(WORK_CONTEXT["user-stories"].findingCategories.sort(), ["business_rule", "edge_case"]);
  assert.deepEqual(WORK_CONTEXT["business-case"].findingCategories.sort(), ["business_rule", "contradiction", "unresolved_question"]);
  assert.deepEqual(WORK_CONTEXT["testing"].findingCategories.sort(), ["business_rule", "edge_case"]);
  const strip = a => build(a).strip;
  assert.deepEqual(strip("problem-analysis"), ["Project context", "Project notes", "3 findings", "4 decisions"]);
  assert.deepEqual(strip("stakeholder-analysis"), ["Project context", "Project notes", "Problem Analysis v2", "2 findings", "4 decisions"]);
  assert.deepEqual(strip("requirements"), ["Project context", "Project notes", "Problem Analysis v2", "Stakeholder Analysis v1", "Process Analysis v1", "Decision Lab Analysis (2)", "5 findings", "4 decisions"]);
  assert.deepEqual(strip("process-analysis"), ["Project context", "Project notes", "Problem Analysis v2", "Stakeholder Analysis v1", "Requirements v1", "4 findings", "4 decisions"]);
  assert.deepEqual(strip("user-stories"), ["Project context", "Project notes", "Requirements v1", "2 findings", "4 decisions"]);
  assert.deepEqual(strip("business-case"), ["Project context", "Project notes", "Problem Analysis v2", "Stakeholder Analysis v1", "Requirements v1", "Decision Lab Analysis (2)", "3 findings", "4 decisions"]);
  assert.deepEqual(strip("testing"), ["Project context", "Project notes", "No requirements in scope", "2 findings", "4 decisions"]);
  // Testing never receives contradictions / open questions in this patch
  assert.ok(!build("testing").text.includes("FINDING-contradiction") && !build("testing").text.includes("FINDING-unresolved_question"));
});

test("drafts are never authoritative context; latest approved version is used", () => {
  const t = build("business-case").text;
  assert.ok(t.includes("PA APPROVED CONTENT") && !t.includes("PA DRAFT CONTENT") && !t.includes("OLD PA") && !t.includes("DL DRAFT"));
});

test("project notes are automatic everywhere and labelled unvalidated", () => {
  for (const area of AREAS) { const t = build(area).text; assert.ok(t.includes("NOTE: SMEs") && /unvalidated source material/.test(t), area); }
});

test("decisions keep their status and authority", () => {
  const t = build("requirements").text;
  const pos = s => t.indexOf(s);
  assert.ok(pos("Accepted — authoritative") < pos("DECISION-accepted") && pos("DECISION-accepted") < pos("Open — unresolved"));
  assert.ok(pos("Open — unresolved") < pos("DECISION-open") && pos("DECISION-open") < pos("Deferred — deliberately postponed"));
  assert.ok(pos("Deferred — deliberately postponed") < pos("DECISION-deferred") && pos("DECISION-deferred") < pos("Rejected — explicitly decided against"));
  assert.ok(pos("Rejected — explicitly decided against") < pos("DECISION-rejected"));
  assert.ok(/Only Accepted decisions are authoritative/.test(t));
});

test("Testing: empty scope sends no requirements", () => {
  const c = build("testing", { testingScopeIds: [] });
  assert.ok(c.strip.includes("No requirements in scope"));
  for (const s of ["BR-001", "FR-001", "FR-002", "US-001"]) assert.ok(!c.text.includes(s), s);
  assert.deepEqual(c.sourceIds, []);
});

test("Testing: only the selected requirements reach the model, with linked stories only", () => {
  const c = build("testing", { testingScopeIds: ["FR-001", "BR-002"] });
  assert.ok(c.strip.includes("Requirements v1 · 2 in scope"));
  assert.ok(c.text.includes("FR-001: Submit a claim") && c.text.includes("Includes attachments up to 10 MB") && c.text.includes("BR-002: Every claim"));
  for (const s of ["BR-001:", "FR-002:", "FR-003"]) assert.ok(!c.text.includes(s), `not selected: ${s}`);
  assert.ok(c.strip.includes("User Stories v1 · 2 linked"));
  assert.ok(c.text.includes("US-001") && c.text.includes("US-002") && !c.text.includes("US-003"), "only Satisfies-linked stories");
  assert.deepEqual(c.sourceIds.sort(), ["rq1", "us1"]);
});

test("Testing: stories without an explicit Satisfies link are never sent", () => {
  const c = build("testing", { testingScopeIds: ["FR-003"] });
  assert.ok(c.text.includes("FR-003: Notify") && !c.text.includes("US-003") && !c.strip.some(s => s.startsWith("User Stories")));
  assert.deepEqual(extractLinkedStories(STORIES, ["FR-003"]).storyIds, []);
});

test("Testing scope candidates are requirement ids from the latest approved Requirements", () => {
  assert.deepEqual(testingScopeCandidates(artifacts), ["BR-001", "BR-002", "FR-001", "FR-002", "FR-003"]);
  assert.deepEqual(testingScopeCandidates([art("r", "requirements", "draft", 1, REQ)]), []);
  assert.equal(extractRequirementItems(REQ, ["FR-002"]), "## Functional Requirements\nFR-002: Show the claim queue to managers.");
});

test("no prerequisites: an empty project still gives every area a valid context", () => {
  for (const area of AREAS) {
    const c = buildWorkContext({ area, project, notes: [], artifacts: [], findings: [], decisions: [] });
    assert.deepEqual(c.strip, area === "testing" ? ["Project context", "No requirements in scope"] : ["Project context"]);
    assert.ok(c.text.startsWith("[ESTABLISHED PROJECT CONTEXT]") && c.text.endsWith("[USER INPUT]"));
  }
});
