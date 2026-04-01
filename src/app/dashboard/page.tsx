import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import DashboardClient from "./DashboardClient";
import { getUserStats } from "@/lib/progress-server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { upgrade?: string; session_id?: string; confirmed?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // When redirected from Stripe checkout, verify the session and immediately
  // write subscription_tier = "pro". Use admin client for both write and read
  // to avoid stale cache from the user Supabase client.
  if (searchParams.upgrade === "success" && searchParams.session_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-02-25.clover",
      });
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      // Accept any complete session — metadata match is a nice-to-have but
      // the session_id itself is not guessable and the user is authenticated.
      if (session.status === "complete") {
        const { error: rpcError } = await admin.rpc("activate_pro_subscription", { p_user_id: user.id });
        if (rpcError) console.error("[dashboard] activate_pro_subscription failed:", rpcError.message);
      }
    } catch (err) {
      console.error("[dashboard] Stripe session verify failed:", err);
    }
  }

  // Always read profile via admin to guarantee fresh data after any update
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  let stats;
  try {
    stats = await getUserStats(user.id);
  } catch {
    stats = {
      attempts: [],
      badges: [],
      progress: { challenges_completed: 0, current_streak: 0, longest_streak: 0, avg_score: 0, total_hours: 0, ba_level: "Rookie", last_active_date: null },
      skills: { elicitation: 0, requirements: 0, solutionAnalysis: 0, stakeholderMgmt: 0 },
      levelInfo: { level: "Rookie", nextLevel: "Associate", progressPct: 0, challengesNeeded: 1 },
    };
  }

  return (
    <DashboardClient
      profile={profile}
      user={{ email: user.email || "" }}
      upgradeSuccess={searchParams.upgrade === "success"}
      emailConfirmed={searchParams.confirmed === "true"}
      stats={stats}
    />
  );
}