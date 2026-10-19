// Regression tests for src/lib/projects/impact.ts — Slice 1 possible impacts:
// deterministic, recorded source versions only, grouped per work lineage.
// Run (Node 22, built-in runner, no dependencies):  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeImpacts, compareRequirementItems, sourceTransitions } from "../src/lib/projects/impact.ts";

const a = (id, type, status, version, content = "", extra = {}) => ({ id, type, status, version, content, source_artifact_ids: [], lineage_id: null, ...extra });
const REQ_V2 = `## Functional Requirements
FR-001: Submit a claim through one intake form.
FR-002: Show the claim queue to managers.
FR-003: Notify the claimant by email.`;
const REQ_V3 = `## Functional Requirements
FR-001: Submit a claim   through one intake form.
FR-003: Notify the claimant by SMS.
FR-004: Export the queue.`;
// Requirements v2 superseded by v3; Problem Analysis v1 superseded by v2.
const base = () => [
  a("req2", "requirements", "superseded", 2, REQ_V2), a("req3", "requirements", "approved", 3, REQ_V3),
  a("pa1", "problem_analysis", "superseded", 1, "PA one"), a("pa2", "problem_analysis", "approved", 2, "PA two"),
];

test("an Approved version superseded by a newly Approved one flags current work that recorded it", () => {
  const r = computeImpacts([...base(), a("us2", "user_stories", "approved", 2, "**US-001** (Satisfies: FR-003)", { source_artifact_ids: ["req2"] })]);
  assert.equal(r.items.length, 1);
  const [item] = r.items;
  assert.equal(item.label, "User Stories");
  assert.deepEqual(item.approved, { id: "us2", version: 2 });
  assert.equal(item.draft, null);
  assert.equal(item.changes.length, 1);
  const c = item.changes[0];
  assert.deepEqual([c.affected.id, c.used.id, c.current.id], ["us2", "req2", "req3"]);
  assert.deepEqual(sourceTransitions(item), ["Requirements v2 → v3"]);
});

test("Approved + working Draft of the same work are ONE item, never counted twice", () => {
  const r = computeImpacts([...base(),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req2"] }),
    a("us3", "user_stories", "draft", 3, "", { source_artifact_ids: ["req2"] })]);
  assert.equal(r.items.length, 1);
  assert.deepEqual(r.items[0].approved, { id: "us2", version: 2 });
  assert.deepEqual(r.items[0].draft, { id: "us3", version: 3 });
  assert.equal(r.items[0].changes.length, 2);                      // one per affected version (exact review keys)
  assert.deepEqual(r.items[0].changes.map(c => c.affected.status), ["approved", "draft"]);   // Approved listed first
  assert.deepEqual(sourceTransitions(r.items[0]), ["Requirements v2 → v3"]);   // but one transition
});

test("a Draft already rebuilt on the current source is not affected; the item shows only the Approved change", () => {
  const r = computeImpacts([...base(),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req2"] }),
    a("us3", "user_stories", "draft", 3, "", { source_artifact_ids: ["req3"] })]);
  assert.equal(r.items.length, 1);
  assert.deepEqual(r.items[0].changes.map(c => c.affected.id), ["us2"]);
  assert.deepEqual(r.items[0].draft, { id: "us3", version: 3 });
});

test("several changed sources on one item are listed as separate transitions", () => {
  const r = computeImpacts([...base(), a("brd1", "brd", "approved", 1, "", { source_artifact_ids: ["req2", "pa1"] })]);
  assert.equal(r.items.length, 1);
  assert.deepEqual(sourceTransitions(r.items[0]).sort(), ["Problem Analysis v1 → v2", "Requirements v2 → v3"]);
});

test("count = affected work lineages", () => {
  const r = computeImpacts([...base(),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req2"] }),
    a("us3", "user_stories", "draft", 3, "", { source_artifact_ids: ["req2"] }),
    a("tc1", "test_case", "draft", 1, "", { source_artifact_ids: ["req2"] }),
    a("sa1", "stakeholder_analysis", "approved", 1, "", { source_artifact_ids: ["pa1"] })]);
  assert.equal(r.items.length, 3);
});

test("only work that RECORDED the superseded version is affected — no relevance inference", () => {
  // Business Case's context config includes Requirements, but this version recorded only Problem Analysis v2 (current).
  const r = computeImpacts([...base(), a("brd1", "brd", "approved", 1, "", { source_artifact_ids: ["pa2"] })]);
  assert.equal(r.items.length, 0);
  assert.equal(r.connectedCount, 1);
});

test("work with no recorded sources is 'connection information unavailable', never unaffected", () => {
  const r = computeImpacts([...base(),
    a("us2", "user_stories", "approved", 2),
    a("sa1", "stakeholder_analysis", "approved", 1, "", { reasoning_context: { origin: "imported" } })]);
  assert.equal(r.items.length, 0);
  const labels = r.unavailable.map(u => u.label);
  assert.ok(labels.includes("User Stories") && labels.includes("Stakeholder Analysis"));
  assert.equal(r.unavailable.find(u => u.label === "Stakeholder Analysis").imported, true);
  // the source lineages themselves have no recorded sources either
  assert.ok(labels.includes("Requirements") && labels.includes("Problem Analysis"));
  assert.equal(r.connectedCount, 0);
});

test("superseded history of the downstream work is never flagged", () => {
  const r = computeImpacts([...base(),
    a("us1", "user_stories", "superseded", 1, "", { source_artifact_ids: ["req2"] }),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req3"] })]);
  assert.equal(r.items.length, 0);
});

test("archived or missing sources raise nothing (only supersession by a new Approved version triggers)", () => {
  const r = computeImpacts([a("reqA", "requirements", "archived", 4, REQ_V3),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["reqA", "gone"] })]);
  assert.equal(r.items.length, 0);
});

test("a review suppresses exactly its (affected, superseded, current) change", () => {
  const arts = [...base(),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req2"] }),
    a("us3", "user_stories", "draft", 3, "", { source_artifact_ids: ["req2"] })];
  const one = computeImpacts(arts, [{ artifact_id: "us2", superseded_source_id: "req2", new_source_id: "req3" }]);
  assert.deepEqual(one.items[0].changes.map(c => c.affected.id), ["us3"]);   // the Draft's change is still open
  const both = computeImpacts(arts, [
    { artifact_id: "us2", superseded_source_id: "req2", new_source_id: "req3" },
    { artifact_id: "us3", superseded_source_id: "req2", new_source_id: "req3" }]);
  assert.equal(both.items.length, 0);
  assert.equal(both.connectedCount, 1);
});

test("a later newly Approved source version raises a fresh impact despite the earlier review", () => {
  const arts = [a("req2", "requirements", "superseded", 2, REQ_V2), a("req3", "requirements", "superseded", 3, REQ_V3),
    a("req4", "requirements", "approved", 4, REQ_V3 + "\nFR-005: New."),
    a("us2", "user_stories", "approved", 2, "", { source_artifact_ids: ["req2"] })];
  const r = computeImpacts(arts, [{ artifact_id: "us2", superseded_source_id: "req2", new_source_id: "req3" }]);
  assert.equal(r.items.length, 1);
  assert.deepEqual(sourceTransitions(r.items[0]), ["Requirements v2 → v4"]);
});

test("Decision Lab: each decision is its own lineage and its own item", () => {
  const dl = (id, lineage, status, version, src) => a(id, "decision_lab_output", status, version, "", { lineage_id: lineage, title: `Decision ${lineage}`, source_artifact_ids: src });
  const r = computeImpacts([...base(),
    dl("dA1", "dA1", "superseded", 1, ["req2"]), dl("dA2", "dA1", "approved", 2, ["req2"]),
    dl("dB1", "dB1", "draft", 1, ["req2"])]);
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.items.map(i => i.lineageId).sort(), ["dA1", "dB1"]);
  assert.deepEqual(r.items.find(i => i.lineageId === "dA1").changes.map(c => c.affected.id), ["dA2"]);   // history dA1 not flagged
  // A decision's own revision supersedes within ITS lineage only
  const own = computeImpacts([dl("dA1", "dA1", "superseded", 1, []), dl("dA2", "dA1", "approved", 2, []),
    a("brd1", "brd", "approved", 1, "", { source_artifact_ids: ["dA1"] })]);
  assert.deepEqual(sourceTransitions(own.items[0]), ["Decision Lab Analysis — Decision dA1 v1 → v2"]);
});

test("requirement comparison: added / removed / changed by stable id; whitespace-only is unchanged", () => {
  assert.deepEqual(compareRequirementItems(REQ_V2, REQ_V3), { added: ["FR-004"], removed: ["FR-002"], changed: ["FR-003"] });
});

test("requirement comparison never matches different ids (a renumbered item is removed + added)", () => {
  const r = compareRequirementItems("FR-001: Submit a claim.", "FR-010: Submit a claim.");
  assert.deepEqual(r, { added: ["FR-010"], removed: ["FR-001"], changed: [] });
});

test("requirement comparison is unavailable (null) when neither version has stable ids", () => {
  assert.equal(compareRequirementItems("Some prose.", "Other prose."), null);
});

test("Requirements changes carry item ids and which changed ids this work references", () => {
  const r = computeImpacts([...base(), a("tc1", "test_case", "approved", 1, "**TC-001** Covers: FR-003, FR-001", { source_artifact_ids: ["req2"] })]);
  const c = r.items[0].changes[0];
  assert.deepEqual(c.requirementItems, { added: ["FR-004"], removed: ["FR-002"], changed: ["FR-003"] });
  assert.deepEqual(c.referencedChanged, ["FR-003"]);
  const other = computeImpacts([...base(), a("sa1", "stakeholder_analysis", "approved", 1, "", { source_artifact_ids: ["pa1"] })]);
  assert.equal(other.items[0].changes[0].requirementItems, null);   // non-Requirements sources: no item comparison
});
