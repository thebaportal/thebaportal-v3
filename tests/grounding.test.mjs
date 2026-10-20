// Regression tests for src/lib/projects/grounding.ts — no AI call without project
// evidence; a project name or a prompt chip is never evidence.
// Run (Node 22, built-in runner, no dependencies):  node --test tests/grounding.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessGrounding, isSubstantive, evidenceStatement, EVIDENCE_RULES } from "../src/lib/projects/grounding.ts";
import { buildWorkContext } from "../src/lib/projects/workContext.ts";

const PROMPTS = ["Clarify the core business problem", "Identify root causes", "Define scope and constraints", "Identify key stakeholders", "Draft test cases"];
const bare = { name: "Customer Onboarding", methodology: "agile", industry: "Banking", country: "Canada" };
const art = (id, type, status, version, content, extra = {}) => ({ id, type, status, version, content, ...extra });
function check({ area = "problem-analysis", project = bare, notes = [], artifacts = [], findings = [], decisions = [], conversation = [], message = "Identify root causes", testingScopeIds } = {}) {
  const ctx = buildWorkContext({ area, project, notes, artifacts, findings, decisions, conversation, testingScopeIds });
  return assessGrounding({ project, notes, parts: ctx.parts, decisions, conversation, message, prompts: PROMPTS });
}

test("project name only + prompt chip → not grounded (no AI call)", () => {
  const g = check();
  assert.equal(g.grounded, false);
  assert.deepEqual(g.supplied, []);
  assert.ok(g.missing.includes("project brief or context"));
});

test("industry, country and methodology are labels, not evidence", () => {
  assert.equal(check({ project: { ...bare, industry: "Retail banking", country: "UK", methodology: "waterfall" } }).grounded, false);
});

test("a chip plus the project name is still not evidence", () => {
  assert.equal(check({ message: "Identify root causes for Customer Onboarding" }).grounded, false);
  assert.equal(check({ message: "identify root causes." }).grounded, false);
});

test("substantive text from the BA in the composer → grounded", () => {
  const g = check({ message: "Identify root causes. New customers wait 12 days for account approval and a third abandon sign-up." });
  assert.equal(g.grounded, true);
  assert.deepEqual(g.supplied, ["the Business Analyst's message"]);
});

test("project brief or context alone → grounded (Project Context is one source, not a requirement)", () => {
  assert.equal(check({ project: { ...bare, problem_statement: "Onboarding takes too long." } }).grounded, true);
  assert.equal(check({ project: { ...bare, relevant_context: "Regulated KYC checks apply." } }).grounded, true);
});

test("project notes → grounded", () => {
  assert.equal(check({ notes: [{ id: "n1", source_label: "Workshop", source_text: "Ops says the KYC queue is the bottleneck.", created_at: "2026-10-01T00:00:00Z" }] }).grounded, true);
});

test("relevant approved work, including imported evidence → grounded without any Project Context", () => {
  const pa = art("pa1", "problem_analysis", "approved", 1, "## Problem Statement\nApprovals stall.");
  assert.equal(check({ area: "stakeholder-analysis", artifacts: [pa] }).grounded, true);
  const imported = art("pa2", "problem_analysis", "approved", 1, "## Problem\nImported analysis.", { reasoning_context: { origin: "imported" } });
  const g = check({ area: "requirements", artifacts: [imported] });
  assert.equal(g.grounded, true);
  assert.match(g.supplied.join(" "), /approved work \(Problem Analysis v1\)/);
});

test("approved work this area does NOT use is not grounding for it (relevance rules unchanged)", () => {
  const brd = art("b1", "brd", "approved", 1, "## Business case");
  assert.equal(check({ area: "problem-analysis", artifacts: [brd] }).grounded, false);
});

test("this area's own current Approved version or working Draft → grounded", () => {
  assert.equal(check({ artifacts: [art("p1", "problem_analysis", "approved", 1, "## Problem Statement\nX")] }).grounded, true);
  assert.equal(check({ artifacts: [art("p1", "problem_analysis", "draft", 1, "## Problem Statement\nX")] }).grounded, true);
});

test("accepted findings → grounded; accepted decisions → grounded; open decisions only → not", () => {
  assert.equal(check({ findings: [{ id: "f1", session_id: "s1", category: "contradiction", finding_text: "Ops and sales disagree on SLA." }] }).grounded, true);
  assert.equal(check({ decisions: [{ id: "d1", decision_text: "Use one form", status: "accepted", created_at: "2026-10-01" }] }).grounded, true);
  assert.equal(check({ decisions: [{ id: "d1", decision_text: "Maybe one form", status: "open", created_at: "2026-10-01" }] }).grounded, false);
});

test("an earlier conversation with a reply → grounded; earlier chips only → not", () => {
  assert.equal(check({ conversation: [{ role: "user", content: "Customers drop off at the ID upload step every day." }, { role: "assistant", content: "Noted." }] }).grounded, true);
  assert.equal(check({ conversation: [{ role: "user", content: "Identify root causes" }] }).grounded, false);
});

test("Testing with no requirements in scope and only a chip → not grounded", () => {
  assert.equal(check({ area: "testing", message: "Draft test cases", testingScopeIds: [] }).grounded, false);
});

test("isSubstantive ignores prompt chips and the project name", () => {
  assert.equal(isSubstantive("Identify root causes", PROMPTS, "Customer Onboarding"), false);
  assert.equal(isSubstantive("Customers abandon sign-up at the ID check", PROMPTS, "Customer Onboarding"), true);
});

test("the request states exactly what was and was not supplied, and that labels are not evidence", () => {
  const thin = evidenceStatement({ grounded: true, supplied: ["the Business Analyst's message"], missing: ["project brief or context", "project notes"] });
  assert.match(thin, /Supplied: the Business Analyst's message\./);
  assert.match(thin, /Not supplied: project brief or context; project notes\./);
  assert.match(thin, /project name, industry, methodology and the task wording are labels, not evidence/);
  assert.match(evidenceStatement({ grounded: false, supplied: [], missing: [] }), /nothing beyond the project name/);
});

test("system rules: never invent facts from the name, separate facts/assumptions/missing, never claim unsupplied context", () => {
  assert.match(EVIDENCE_RULES, /overrides any instruction above to infer, assume or generate immediately/);
  assert.match(EVIDENCE_RULES, /Do not invent facts because of what the project is called/);
  assert.match(EVIDENCE_RULES, /Do not infer the project's industry, regulatory regime, product type, systems, stakeholders or policies from generic terms such as account, approval, ID, onboarding, customer or document/);
  assert.match(EVIDENCE_RULES, /present it only conditionally, as an example .*never as a fact or as assumed project context/);
  assert.match(EVIDENCE_RULES, /facts that were supplied, assumptions you are making, and information that is missing/);
  assert.match(EVIDENCE_RULES, /Never say or imply that you have context, documents, data or information that was not supplied/);
  assert.match(EVIDENCE_RULES, /I don't yet have enough project evidence to determine which ones apply/);
});
