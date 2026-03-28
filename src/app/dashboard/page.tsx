import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import DashboardClient from "./DashboardClient";
import { getUserStats } from "@/lib/progress-server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { upgrade?: string; session_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // When redirected from a successful Stripe checkout, verify the session and
  // immediately write subscription_tier = "pro" so the page reflects the
  // upgrade without depending on the webhook arriving first.
  if (searchParams.upgrade === "success" && searchParams.session_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-02-25.clover",
      });
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      if (
        session.status === "complete" &&
        session.metadata?.supabase_user_id === user.id
      ) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await admin
          .from("profiles")
          .update({ subscription_tier: "pro", updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    } catch {
      // Non-fatal — webhook will still update the profile
    }
  }

  const { data: profile } = await supabase
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
      stats={stats}
    />
  );
}