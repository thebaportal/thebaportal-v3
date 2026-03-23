import { createClient } from "@/lib/supabase/server";
import {
  BADGE_DEFINITIONS,
  calculateBALevel,
  calculateLevelProgress,
  calculateSkillScores,
  calculateStreak,
} from "@/lib/progress";
import type { ChallengeAttempt, UserBadge, UserProgress } from "@/lib/progress";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveAttempt(params: {
  userId: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: string;
  industry: string;
  difficultyMode: string;
  totalScore: number;
  scoreProblemFraming: number;
  scoreRootCause: number;
  scoreEvidenceUse: number;
  scoreRecommendation: number;
  submissionText: string;
  questionCount: number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}, supabaseClient?: any): Promise<void> {
  const supabase = supabaseClient ?? await createClient();

  // Save attempt
  const { error: attemptError } = await supabase
    .from("challenge_attempts")
    .insert({
      user_id: params.userId,
      challenge_id: params.challengeId,
      challenge_title: params.challengeTitle,
      challenge_type: params.challengeType,
      industry: params.industry,
      difficulty_mode: params.difficultyMode,
      total_score: params.totalScore,
      score_problem_framing: params.scoreProblemFraming,
      score_root_cause: params.scoreRootCause,
      score_evidence_use: params.scoreEvidenceUse,
      score_recommendation: params.scoreRecommendation,
      submission_text: params.submissionText,
      question_count: params.questionCount,
    });

  if (attemptError) {
    console.error("saveAttempt error:", JSON.stringify(attemptError));
    throw new Error(attemptError.message || "Failed to save attempt");
  }

  // Fetch all attempts to recalculate
  const { data: allAttempts } = await supabase
    .from("challenge_attempts")
    .select("*")
    .eq("user_id", params.userId);

  if (!allAttempts) return;

  const completed = allAttempts.length;
  const avgScore = completed > 0
    ? Math.round(allAttempts.reduce((sum: number, a: { total_score: number }) => sum + a.total_score, 0) / completed)
    : 0;
  const streak = calculateStreak(allAttempts);
  const baLevel = calculateBALevel(completed, avgScore);
  const totalHours = parseFloat((completed * 0.75).toFixed(2));

  // Upsert progress
  await supabase.from("user_progress").upsert({
    user_id: params.userId,
    challenges_completed: completed,
    current_streak: streak,
    avg_score: avgScore,
    total_hours: totalHours,
    ba_level: baLevel,
    last_active_date: new Date().toISOString().split("T")[0],
    updated_at: new Date().toISOString(),
  });

  // Check and award badges
  const { data: existingBadges } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", params.userId);

  const earnedIds = new Set(existingBadges?.map((b: { badge_id: string }) => b.badge_id) || []);

  for (const badge of BADGE_DEFINITIONS) {
    if (!earnedIds.has(badge.id) && badge.check(allAttempts)) {
      await supabase.from("user_badges").insert({
        user_id: params.userId,
        badge_id: badge.id,
        badge_name: badge.name,
        badge_description: badge.description,
      });
    }
  }
}

export async function getUserStats(userId: string) {
  const supabase = await createClient();

  const [attemptsRes, badgesRes, progressRes] = await Promise.all([
    supabase.from("challenge_attempts").select("*").eq("user_id", userId).order("completed_at", { ascending: false }),
    supabase.from("user_badges").select("*").eq("user_id", userId).order("earned_at", { ascending: false }),
    supabase.from("user_progress").select("*").eq("user_id", userId).single(),
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
  const levelInfo = calculateLevelProgress(progress.challenges_completed, progress.avg_score);

  return { attempts, badges, progress, skills, levelInfo };
}
