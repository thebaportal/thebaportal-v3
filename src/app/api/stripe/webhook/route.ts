import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { checkoutSessionOwner, subscriptionProfileUpdate } from "@/lib/stripeSubscription";

export const dynamic = "force-dynamic";

// Every required database write must succeed before the event is acknowledged.
// A failed write returns 500 so Stripe retries the event; it is never silently
// acknowledged. Events that carry no user reference are acknowledged and logged
// (retrying cannot add the missing reference).
class RetryableError extends Error {}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const updateProfile = async (userId: string, fields: Record<string, unknown>) => {
    const { error } = await supabaseAdmin.from("profiles").update(fields).eq("id", userId);
    if (error) throw new RetryableError(`profiles update failed for ${userId}: ${error.message}`);
  };

  try {
    switch (event.type) {
      // Fires on payment confirmation — grant access immediately, with the full subscription state.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSessionOwner(session);
        console.log("[webhook] checkout.session.completed — userId:", userId, "status:", session.status, "payment:", session.payment_status);
        if (!userId) { console.warn("[webhook] checkout.session.completed — no consistent user reference; metadata:", session.metadata); break; }
        if (session.mode !== "subscription" || session.payment_status !== "paid" || !session.subscription) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);   // a failure throws → 500 → Stripe retries
        await updateProfile(userId, subscriptionProfileUpdate(sub));
        console.log("[webhook] pro granted for user:", userId);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) { console.warn("[webhook]", event.type, "— no supabase_user_id on subscription", subscription.id); break; }
        await updateProfile(userId, subscriptionProfileUpdate(subscription));
        break;
      }

      case "customer.subscription.deleted": {
        // Fires at actual period end — safe to revoke access now
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) { console.warn("[webhook] subscription.deleted — no supabase_user_id on subscription", subscription.id); break; }
        await updateProfile(userId, {
          subscription_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          subscription_current_period_end: null,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parent = invoice.parent;
        const subId =
          parent && parent.type === "subscription_details"
            ? parent.subscription_details?.subscription
            : null;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) { console.warn("[webhook] invoice.payment_failed — no supabase_user_id on subscription", sub.id); break; }
        await updateProfile(userId, { subscription_status: "past_due", updated_at: new Date().toISOString() });
        break;
      }
    }
  } catch (err) {
    console.error("[webhook]", event.type, event.id, "failed — not acknowledged, Stripe will retry:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
