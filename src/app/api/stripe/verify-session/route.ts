import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkCheckoutSession, subscriptionProfileUpdate } from "@/lib/stripeSubscription";

export const dynamic = "force-dynamic";

// Success-page fallback for the webhook: grants Pro only for a Checkout Session that
// belongs to the signed-in user (client_reference_id / metadata) and was paid.
// Knowing a cs_... id is never enough.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { session_id } = await request.json().catch(() => ({}));
  if (typeof session_id !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id)) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
  } catch {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const check = checkCheckoutSession(session, user.id);
  if (!check.ok) {
    console.warn("[verify-session] refused:", check.reason, "user:", user.id);
    if (check.reason === "not_owned") return NextResponse.json({ error: "session_not_owned" }, { status: 403 });
    if (check.reason === "not_complete") return NextResponse.json({ error: "session_not_complete" }, { status: 400 });
    return NextResponse.json({ error: "session_not_paid" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("profiles").update(subscriptionProfileUpdate(check.subscription)).eq("id", user.id);
  if (error) {
    console.error("[verify-session] profile update failed:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  console.log("[verify-session] pro activated for user:", user.id);
  return NextResponse.json({ success: true });
}
