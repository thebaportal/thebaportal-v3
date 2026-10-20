// Stripe subscription → profile state, and Checkout Session checks. Shared by the
// webhook and verify-session so both derive Pro access the same way.
//
// Pure (type-only Stripe import) so it is unit-tested directly with `node --test`.
//
// API version note: since Stripe's "basil" API (and in the clover versions this
// app uses), current_period_end lives on each subscription ITEM, not on the
// subscription. Reading subscription.current_period_end returns undefined.

import type Stripe from "stripe";

/** The paid-through date: the latest current_period_end across the subscription's items (ISO), or null. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const fromItems = (sub.items?.data ?? []).map(i => (i as { current_period_end?: number }).current_period_end).filter((t): t is number => typeof t === "number");
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;   // pre-basil payloads only
  const t = fromItems.length ? Math.max(...fromItems) : typeof legacy === "number" ? legacy : null;
  return t ? new Date(t * 1000).toISOString() : null;
}

/** Profile columns for a subscription's current state. Pro while active, trialing, or cancelled-but-still-paid-up. */
export function subscriptionProfileUpdate(sub: Stripe.Subscription, now = new Date()) {
  const cancelAtPeriodEnd = sub.cancel_at_period_end === true;
  const live = sub.status === "active" || sub.status === "trialing";
  return {
    subscription_tier: live || (cancelAtPeriodEnd && sub.status !== "canceled") ? "pro" : "free",
    // Show "canceled" once cancellation is scheduled, even though Stripe still reports it active.
    subscription_status: cancelAtPeriodEnd ? "canceled" : sub.status,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    subscription_current_period_end: subscriptionPeriodEnd(sub),
    updated_at: now.toISOString(),
  };
}

/** Who a Checkout Session belongs to, from Checkout's own reconciliation fields. Conflicting fields → null. */
export function checkoutSessionOwner(session: Stripe.Checkout.Session): string | null {
  const sub = typeof session.subscription === "object" ? session.subscription : null;
  const ids = [session.client_reference_id, session.metadata?.supabase_user_id, sub?.metadata?.supabase_user_id]
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (!ids.length || ids.some(id => id !== ids[0])) return null;
  return ids[0];
}

export type CheckoutCheck = { ok: true; subscription: Stripe.Subscription } | { ok: false; reason: "not_owned" | "not_subscription" | "not_complete" | "not_paid" };

/**
 * May this Checkout Session grant Pro to this user? Possession of a cs_ id is not
 * enough: the session must belong to the user, be a completed subscription
 * checkout that was paid, and its subscription must be active or trialing.
 * Expects the session retrieved with { expand: ["subscription"] }.
 */
export function checkCheckoutSession(session: Stripe.Checkout.Session, userId: string): CheckoutCheck {
  if (checkoutSessionOwner(session) !== userId) return { ok: false, reason: "not_owned" };
  if (session.mode !== "subscription") return { ok: false, reason: "not_subscription" };
  if (session.status !== "complete") return { ok: false, reason: "not_complete" };   // an open session has no subscription yet
  if (!session.subscription || typeof session.subscription !== "object") return { ok: false, reason: "not_subscription" };
  const sub = session.subscription;
  const paid = session.payment_status === "paid" || (session.payment_status === "no_payment_required" && sub.status === "trialing");
  if (!paid || !(sub.status === "active" || sub.status === "trialing")) return { ok: false, reason: "not_paid" };
  return { ok: true, subscription: sub };
}
