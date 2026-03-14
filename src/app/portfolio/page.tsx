import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortfolioClient from "./PortfolioClient";
import type { PortfolioAttempt } from "./PortfolioView";
import type { UserBadge, UserProgress } from "@/lib/progress";

export const metadata = { title: "My Portfolio" };

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function PortfolioPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, attemptsRes, badgesRes, progressRes] = await Promise.all([
    supabase.from("profiles").select("subscription_tier, full_name, created_at").eq("id", user.id).single(),
    supabase.from("challenge_attempts")
      .select("id, challenge_id, challenge_title, challenge_type, industry, difficulty_mode, total_score, score_problem_framing, score_root_cause, score_evidence_use, score_recommendation, completed_at, submission_text")
      .eq("user_id", user.id).order("completed_at", { ascending: false }),
    supabase.from("user_badges").select("*").eq("user_id", user.id),
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
  ]);

  const fullName = profileRes.data?.full_name || "";
  const handle = slugify(fullName);
  const attempts: PortfolioAttempt[] = attemptsRes.data || [];
  const badges: UserBadge[] = badgesRes.data || [];
  const progress: UserProgress = progressRes.data || {
    challenges_completed: 0, current_streak: 0, longest_streak: 0,
    avg_score: 0, total_hours: 0, ba_level: "Associate", last_active_date: null,
  };
  const joinedYear = profileRes.data?.created_at
    ? new Date(profileRes.data.created_at).getFullYear().toString()
    : new Date().getFullYear().toString();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thebaportal.com";
  const portfolioUrl = `${appUrl}/portfolio/${handle}`;

  return (
    <PortfolioClient
      fullName={fullName}
      handle={handle}
      portfolioUrl={portfolioUrl}
      joinedYear={joinedYear}
      attempts={attempts}
      badges={badges}
      progress={progress}
    />
  );
}
