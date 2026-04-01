import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

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

  const subscription = event.data.object as Stripe.Subscription;

  switch (event.type) {
    // Fires immediately on payment confirmation — use this to avoid timing race
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      console.log("[webhook] checkout.session.completed — userId:", userId, "session status:", session.status);
      if (userId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier:  "pro",
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (error) {
          console.error("[webhook] profiles update failed:", error.message, error.details);
        } else {
          console.log("[webhook] subscription_tier set to pro for user:", userId);
        }
      } else {
        console.warn("[webhook] checkout.session.completed — no supabase_user_id in metadata. Session metadata:", session.metadata);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: subscription.status === "active" ? "pro" : "free",
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      const subId =
        parent && parent.type === "subscription_details"
          ? parent.subscription_details?.subscription
          : null;

      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId as string);
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
