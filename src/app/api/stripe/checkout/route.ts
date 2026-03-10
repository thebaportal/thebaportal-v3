import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log("=== CHECKOUT DEBUG ===");
    console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
    console.log("STRIPE_MONTHLY_PRICE_ID:", process.env.STRIPE_MONTHLY_PRICE_ID);
    console.log("STRIPE_ANNUAL_PRICE_ID:", process.env.STRIPE_ANNUAL_PRICE_ID);
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("APP_URL:", process.env.NEXT_PUBLIC_APP_URL);

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("User:", user?.email, "Auth error:", authError?.message);

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { billing } = await request.json();
    console.log("Billing type:", billing);

    const priceId = billing === "annual"
      ? process.env.STRIPE_ANNUAL_PRICE_ID!
      : process.env.STRIPE_MONTHLY_PRICE_ID!;

    console.log("Using price ID:", priceId);

    // Use supabaseAdmin to read profile (bypasses RLS)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      console.log("Created customer:", customerId);

      // Use supabaseAdmin to save customer ID (bypasses RLS)
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to save stripe_customer_id:", updateError.message);
      } else {
        console.log("stripe_customer_id saved successfully");
      }
    } else {
      console.log("Reusing existing Stripe customer:", customerId);
    }

    console.log("Creating checkout session...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    console.log("Session created:", session.id, "URL:", session.url);
    return NextResponse.json({ url: session.url });

  } catch (error: unknown) {
    const err = error as Error & { type?: string; code?: string };
    console.error("=== CHECKOUT ERROR ===");
    console.error("Message:", err.message);
    console.error("Type:", err.type);
    console.error("Code:", err.code);
    return NextResponse.json({
      error: "checkout_failed",
      message: err.message,
      type: err.type,
    }, { status: 500 });
  }
}