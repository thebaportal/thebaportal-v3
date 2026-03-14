import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CareerClient from "./CareerClient";
import type { ChallengeAttempt, UserBadge, UserProgress } from "@/lib/progress";
import { calculateSkillScores } from "@/lib/progress";

export const metadata = { title: "Career Suite" };

export default async function CareerPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, attemptsRes, badgesRes, progressRes] = await Promise.all([
    supabase.from("profiles").select("subscription_tier, full_name, email").eq("id", user.id).single(),
    supabase.from("challenge_attempts").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }),
    supabase.from("user_badges").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }),
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
  ]);

  const attempts: ChallengeAttempt[] = attemptsRes.data || [];
  const badges: UserBadge[] = badgesRes.data || [];
  const progress: UserProgress = progressRes.data || {
    challenges_completed: 0,
    current_streak: 0,
    longest_streak: 0,
    avg_score: 0,
    total_hours: 0,
    ba_level: "Rookie",
    last_active_date: null,
  };
  const skills = calculateSkillScores(attempts);

  return (
    <CareerClient
      userId={user.id}
      fullName={profileRes.data?.full_name ?? ""}
      tier={profileRes.data?.subscription_tier ?? "free"}
      attempts={attempts}
      badges={badges}
      progress={progress}
      skills={skills}
    />
  );
}
