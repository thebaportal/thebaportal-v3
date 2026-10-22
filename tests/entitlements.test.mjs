// Regression tests for the pure parts of Pro gating: plan interpretation and Decision Lab gate replies.
// Run (Node 22, built-in runner):  node --test tests/entitlements.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isProTier, FREE_DECISION_LAB_ANALYSES } from "../src/lib/entitlements.ts";
import { isGateMessage } from "../src/lib/decisionLabGate.ts";

test("pro and enterprise carry Pro capabilities; everything else is Free", () => {
  assert.equal(isProTier("pro"), true);
  assert.equal(isProTier("enterprise"), true);
  for (const t of ["free", "", null, undefined, "PRO", "Pro", " pro", "premium", true, 1, { tier: "pro" }]) assert.equal(isProTier(t), false, String(t));
});

test("Free allowance is 5 full Decision Lab analyses per month", () => {
  assert.equal(FREE_DECISION_LAB_ANALYSES, 5);
});

test("gate replies (model asks for more options) are recognised so they never consume quota", () => {
  assert.equal(isGateMessage("I can see one option in what you've described. Add another…"), true);
  assert.equal(isGateMessage("I couldn't identify multiple options to compare."), true);
  assert.equal(isGateMessage("## Recommendation\nOption A, because…"), false);
});
