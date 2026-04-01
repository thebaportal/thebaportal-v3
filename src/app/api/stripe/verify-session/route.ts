import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { session_id } = await request.json();
  if (!session_id) return NextResponse.json({ error: "missing_session_id" }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

  const session = await stripe.checkout.sessions.retrieve(session_id);
  console.log("[verify-session] session status:", session.status, "user:", user.id);

  if (session.status !== "complete") {
    return NextResponse.json({ error: "session_not_complete" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.rpc("activate_pro_subscription", { p_user_id: user.id });
  if (error) {
    console.error("[verify-session] rpc failed:", error.message);
    return NextResponse.json({ error: "rpc_failed", message: error.message }, { status: 500 });
  }

  console.log("[verify-session] pro activated for user:", user.id);
  return NextResponse.json({ success: true });
}
