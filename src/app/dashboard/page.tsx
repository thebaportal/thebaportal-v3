import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import DashboardClient from "./DashboardClient";
import { getUserStats } from "@/lib/progress-server";

export const dynamic = "force-dynamic";

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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Profile is read fresh on every load — Pro state is set via /api/stripe/verify-session
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
    <Suspense>
      <DashboardClient
        profile={profile}
        user={{ email: user.email || "" }}
        upgradeSuccess={searchParams.upgrade === "success"}
        emailConfirmed={searchParams.confirmed === "true"}
        stats={stats}
      />
    </Suspense>
  );
}
