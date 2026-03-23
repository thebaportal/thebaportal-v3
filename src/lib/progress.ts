export interface ChallengeAttempt {
  id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_type: string;
  industry: string;
  difficulty_mode: string;
  total_score: number;
  score_problem_framing: number;
  score_root_cause: number;
  score_evidence_use: number;
  score_recommendation: number;
  question_count: number;
  completed_at: string;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
}

export interface UserProgress {
  challenges_completed: number;
  current_streak: number;
  longest_streak: number;
  avg_score: number;
  total_hours: number;
  ba_level: string;
  last_active_date: string | null;
}

export const BADGE_DEFINITIONS = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Completed your first BA simulation challenge",
    icon: "🎯",
    color: "#00d4a0",
    check: (attempts: ChallengeAttempt[]) => attempts.length >= 1,
  },
  {
    id: "high_achiever",
    name: "High Achiever",
    description: "Scored 85 or above on a challenge",
    icon: "⭐",
    color: "#f59e0b",
    check: (attempts: ChallengeAttempt[]) => attempts.some(a => a.total_score >= 85),
  },
  {
    id: "hard_mode",
    name: "Hard Mode",
    description: "Completed a challenge on Hard difficulty",
    icon: "🔥",
    color: "#f97316",
    check: (attempts: ChallengeAttempt[]) => attempts.some(a => a.difficulty_mode === "hard"),
  },
  {
    id: "expert_mode",
    name: "Expert Mode",
    description: "Completed a challenge on Expert difficulty",
    icon: "⚡",
    color: "#ef4444",
    check: (attempts: ChallengeAttempt[]) => attempts.some(a => a.difficulty_mode === "expert"),
  },
  {
    id: "ba_practitioner",
    name: "BA Practitioner",
    description: "Completed 3 or more challenges",
    icon: "📋",
    color: "#a78bfa",
    check: (attempts: ChallengeAttempt[]) => attempts.length >= 3,
  },
  {
    id: "industry_specialist",
    name: "Industry Specialist",
    description: "Completed 2 challenges in the same industry",
    icon: "🏭",
    color: "#38bdf8",
    check: (attempts: ChallengeAttempt[]) => {
      const counts: Record<string, number> = {};
      attempts.forEach(a => { counts[a.industry] = (counts[a.industry] || 0) + 1; });
      return Object.values(counts).some(c => c >= 2);
    },
  },
  {
    id: "perfect_score",
    name: "Perfect Analysis",
    description: "Scored 95 or above on a challenge",
    icon: "💎",
    color: "#00d4a0",
    check: (attempts: ChallengeAttempt[]) => attempts.some(a => a.total_score >= 95),
  },
  {
    id: "all_complete",
    name: "Full Spectrum",
    description: "Completed all 6 simulation challenges",
    icon: "🏆",
    color: "#f59e0b",
    check: (attempts: ChallengeAttempt[]) => {
      const unique = new Set(attempts.map(a => a.challenge_id));
      return unique.size >= 6;
    },
  },
];

export function calculateBALevel(completed: number, avgScore: number): string {
  if (completed === 0) return "Rookie";
  if (completed >= 6 && avgScore >= 80) return "Expert";
  if (completed >= 5) return "Senior BA";
  if (completed >= 3) return "Practitioner";
  if (completed >= 1) return "Associate";
  return "Rookie";
}

export function calculateLevelProgress(completed: number, avgScore: number): {
  level: string;
  nextLevel: string;
  progressPct: number;
  challengesNeeded: number;
} {
  if (completed === 0) return { level: "Rookie", nextLevel: "Associate", progressPct: 0, challengesNeeded: 1 };
  if (completed >= 1 && completed < 3) return { level: "Associate", nextLevel: "Practitioner", progressPct: ((completed - 1) / 2) * 100, challengesNeeded: 3 - completed };
  if (completed >= 3 && completed < 5) return { level: "Practitioner", nextLevel: "Senior BA", progressPct: ((completed - 3) / 2) * 100, challengesNeeded: 5 - completed };
  if (completed >= 5 && completed < 6) return { level: "Senior BA", nextLevel: "Expert", progressPct: 50, challengesNeeded: 1 };
  if (completed >= 6 && avgScore >= 80) return { level: "Expert", nextLevel: "Max Level", progressPct: 100, challengesNeeded: 0 };
  return { level: "Senior BA", nextLevel: "Expert", progressPct: (avgScore / 80) * 100, challengesNeeded: 0 };
}

export function calculateSkillScores(attempts: ChallengeAttempt[]): {
  elicitation: number;
  requirements: number;
  solutionAnalysis: number;
  stakeholderMgmt: number;
} {
  if (attempts.length === 0) return { elicitation: 0, requirements: 0, solutionAnalysis: 0, stakeholderMgmt: 0 };

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    elicitation: avg(attempts.map(a => a.score_problem_framing || 0).map(s => Math.round((s / 25) * 100))),
    requirements: avg(attempts.map(a => a.score_root_cause || 0).map(s => Math.round((s / 25) * 100))),
    solutionAnalysis: avg(attempts.map(a => a.score_evidence_use || 0).map(s => Math.round((s / 25) * 100))),
    stakeholderMgmt: avg(attempts.map(a => a.score_recommendation || 0).map(s => Math.round((s / 25) * 100))),
  };
}

export function calculateStreak(attempts: ChallengeAttempt[]): number {
  if (attempts.length === 0) return 0;
  const dates = [...new Set(attempts.map(a => new Date(a.completed_at).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}
