import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";


export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }
    if (!process.env.STRIPE_MONTHLY_PRICE_ID) {
      return NextResponse.json({ error: "Missing STRIPE_MONTHLY_PRICE_ID" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { billing } = await request.json();

    const priceId = billing === "annual"
      ? process.env.STRIPE_ANNUAL_PRICE_ID!
      : process.env.STRIPE_MONTHLY_PRICE_ID!;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Use supabaseAdmin to read profile (bypasses RLS)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // A stored customer may not exist for the active Stripe mode/account (e.g. a test-mode
    // customer once Production uses live keys) or may have been deleted. Validate it and
    // create a fresh customer instead of failing checkout with "No such customer".
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as Stripe.DeletedCustomer).deleted) customerId = null;
      } catch (err) {
        if ((err as { code?: string }).code !== "resource_missing") throw err;
        console.warn("[checkout] stored Stripe customer not valid for this Stripe account/mode; creating a new one:", customerId);
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Use supabaseAdmin to save customer ID (bypasses RLS)
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("[checkout] failed to save stripe_customer_id:", updateError.message, "| code:", updateError.code, "| details:", updateError.details, "| hint:", updateError.hint);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${siteUrl()}/projects?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pricing?canceled=true`,
      // Ownership for reconciliation (verify-session, webhook): Checkout's own fields.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: unknown) {
    const err = error as Error & { type?: string; code?: string };
    console.error("[checkout] failed:", err.message, "| type:", err.type, "| code:", err.code);
    return NextResponse.json({
      error: "checkout_failed",
      message: err.message,
      type: err.type,
    }, { status: 500 });
  }
}