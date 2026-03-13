export interface Badge {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  moduleId: string;
}

export const BADGES: Badge[] = [
  {
    id: "ba-foundations",
    name: "BA Foundations",
    emoji: "🎯",
    color: "#1fbf9f",
    description: "Completed BA Foundations — you have the problem framing and stakeholder fundamentals.",
    moduleId: "module-1",
  },
  {
    id: "strategic-planner",
    name: "Strategic Planner",
    emoji: "🗺️",
    color: "#a78bfa",
    description: "Completed Planning and Stakeholder Strategy — you plan the work before the work starts.",
    moduleId: "module-2",
  },
  {
    id: "elicitation-specialist",
    name: "Elicitation Specialist",
    emoji: "🎤",
    color: "#38bdf8",
    description: "Completed Elicitation and Collaboration — you know how to draw out what people actually need.",
    moduleId: "module-3",
  },
  {
    id: "requirements-analyst",
    name: "Requirements Analyst",
    emoji: "📋",
    color: "#fb923c",
    description: "Completed Requirements Analysis and Modeling — you turn elicitation into artefacts engineering can build from.",
    moduleId: "module-4",
  },
  {
    id: "governance-lead",
    name: "Governance Lead",
    emoji: "🛡️",
    color: "#f59e0b",
    description: "Completed Requirements Lifecycle and Governance — you manage change without losing control.",
    moduleId: "module-5",
  },
  {
    id: "solution-evaluator",
    name: "Solution Evaluator",
    emoji: "📊",
    color: "#f87171",
    description: "Completed Solution Evaluation and Improvement — you close the loop between what was needed and what was built.",
    moduleId: "module-6",
  },
];

export function getModuleBadge(moduleId: string): Badge | null {
  return BADGES.find((b) => b.moduleId === moduleId) ?? null;
}

export function getBadgeById(badgeId: string): Badge | null {
  return BADGES.find((b) => b.id === badgeId) ?? null;
}

// Compatibility export — called by the API route to check whether
// all lessons in a module are complete and award the badge if so.
export async function checkAndAwardBadge(
  supabase: any,
  userId: string,
  moduleId: string,
  totalLessons: number
): Promise<Badge | null> {
  const badge = getModuleBadge(moduleId);
  if (!badge) return null;

  // Count completed lessons for this module
  const { count, error } = await supabase
    .from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("module_id", moduleId);

  if (error || count !== totalLessons) return null;

  // Check badge not already awarded
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .single();

  if (existing) return null;

  // Award badge
  const { error: insertError } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badge.id, awarded_at: new Date().toISOString() });

  if (insertError) {
    console.error("Badge award error:", insertError);
    return null;
  }

  return badge;
}