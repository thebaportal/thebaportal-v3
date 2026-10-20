// Regression tests for src/lib/stripeSubscription.ts — Pro access from Stripe state.
// Run (Node 22, built-in runner, no dependencies):  node --test tests/stripeSubscription.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { subscriptionPeriodEnd, subscriptionProfileUpdate, checkoutSessionOwner, checkCheckoutSession } from "../src/lib/stripeSubscription.ts";

const T1 = 1793311901, T2 = 1795990301;   // 2026-10-29, 2026-11-29 (unix seconds)
const sub = (o = {}) => ({ id: "sub_1", status: "active", cancel_at_period_end: false, customer: "cus_1", metadata: { supabase_user_id: "u1" }, items: { data: [{ current_period_end: T1 }] }, ...o });
const session = (o = {}) => ({ id: "cs_test_1", mode: "subscription", status: "complete", payment_status: "paid", client_reference_id: "u1", metadata: { supabase_user_id: "u1" }, subscription: sub(), ...o });

test("period end is read from the subscription item (clover/basil API), not the top level", () => {
  assert.equal(subscriptionPeriodEnd(sub()), new Date(T1 * 1000).toISOString());
  assert.equal(subscriptionPeriodEnd(sub({ current_period_end: undefined })), new Date(T1 * 1000).toISOString());
});

test("period end: latest across items; legacy top-level only as a fallback; null when absent", () => {
  assert.equal(subscriptionPeriodEnd(sub({ items: { data: [{ current_period_end: T1 }, { current_period_end: T2 }] } })), new Date(T2 * 1000).toISOString());
  assert.equal(subscriptionPeriodEnd(sub({ items: { data: [] }, current_period_end: T1 })), new Date(T1 * 1000).toISOString());
  assert.equal(subscriptionPeriodEnd(sub({ items: { data: [] } })), null);
});

test("renewal moves the period end forward", () => {
  assert.equal(subscriptionProfileUpdate(sub({ items: { data: [{ current_period_end: T2 }] } })).subscription_current_period_end, new Date(T2 * 1000).toISOString());
});

test("profile state: active → pro; cancel scheduled → pro + 'canceled'; past_due / canceled / incomplete → free", () => {
  const u = o => subscriptionProfileUpdate(sub(o));
  assert.deepEqual([u().subscription_tier, u().subscription_status], ["pro", "active"]);
  assert.deepEqual([u({ cancel_at_period_end: true }).subscription_tier, u({ cancel_at_period_end: true }).subscription_status], ["pro", "canceled"]);
  assert.equal(u({ status: "trialing" }).subscription_tier, "pro");
  for (const status of ["past_due", "canceled", "incomplete", "incomplete_expired", "unpaid"]) assert.equal(u({ status }).subscription_tier, "free", status);
  assert.equal(u({ status: "canceled", cancel_at_period_end: true }).subscription_tier, "free");
  assert.equal(u().stripe_subscription_id, "sub_1");
  assert.equal(u({ customer: { id: "cus_9" } }).stripe_customer_id, "cus_9");
});

test("session owner comes from Checkout's own fields and must agree", () => {
  assert.equal(checkoutSessionOwner(session()), "u1");
  assert.equal(checkoutSessionOwner(session({ client_reference_id: null })), "u1");                       // older sessions: metadata only
  assert.equal(checkoutSessionOwner(session({ metadata: {} })), "u1");
  assert.equal(checkoutSessionOwner(session({ client_reference_id: "u2" })), null);                      // conflicting references
  assert.equal(checkoutSessionOwner(session({ subscription: sub({ metadata: { supabase_user_id: "u2" } }) })), null);
  assert.equal(checkoutSessionOwner(session({ client_reference_id: null, metadata: {}, subscription: sub({ metadata: {} }) })), null);
});

test("possession of a session id is not enough: another user's paid session is refused", () => {
  assert.deepEqual(checkCheckoutSession(session(), "u2"), { ok: false, reason: "not_owned" });
});

test("only a completed, paid subscription checkout with an active subscription grants Pro", () => {
  assert.equal(checkCheckoutSession(session(), "u1").ok, true);
  assert.equal(checkCheckoutSession(session({ status: "open" }), "u1").reason, "not_complete");
  assert.equal(checkCheckoutSession(session({ status: "expired" }), "u1").reason, "not_complete");
  assert.equal(checkCheckoutSession(session({ status: "open", payment_status: "unpaid", subscription: null }), "u1").reason, "not_complete");   // real open session shape
  assert.equal(checkCheckoutSession(session({ payment_status: "unpaid" }), "u1").reason, "not_paid");
  assert.equal(checkCheckoutSession(session({ subscription: sub({ status: "incomplete" }) }), "u1").reason, "not_paid");
  assert.equal(checkCheckoutSession(session({ mode: "payment" }), "u1").reason, "not_subscription");
  assert.equal(checkCheckoutSession(session({ subscription: "sub_1" }), "u1").reason, "not_subscription");   // not expanded
  assert.equal(checkCheckoutSession(session({ payment_status: "no_payment_required", subscription: sub({ status: "trialing" }) }), "u1").ok, true);
  assert.equal(checkCheckoutSession(session({ payment_status: "no_payment_required" }), "u1").reason, "not_paid");
});
