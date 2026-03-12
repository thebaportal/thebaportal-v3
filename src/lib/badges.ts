// src/lib/badges.ts
// Call checkAndAwardBadge after every lesson completion

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const MODULE_BADGES: Record<string, { badgeId: string; name: string; icon: string; requiredLessons: string[] }> = {
  "module-1": {
    badgeId: "ba-foundations",
    name: "BA Foundations",
    icon: "🎯",
    requiredLessons: ["m1-l1", "m1-l2", "m1-l3", "m1-l4"],
  },
  "module-2": {
    badgeId: "strategic-planner",
    name: "Strategic Planner",
    icon: "🗺️",
    requiredLessons: ["m2-l1", "m2-l2", "m2-l3", "m2-l4"],
  },
};

export async function checkAndAwardBadge(userId: string, moduleId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const config = MODULE_BADGES[moduleId];
  if (!config) return null;

  const { data: completions } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", config.requiredLessons);

  const completedIds = (completions || []).map((r: { lesson_id: string }) => r.lesson_id);
  const allDone = config.requiredLessons.every(id => completedIds.includes(id));
  if (!allDone) return null;

  // Award badge — upsert so it is idempotent
  const { error } = await supabase.from("user_badges").upsert({
    user_id: userId,
    badge_id: config.badgeId,
    badge_name: config.name,
    badge_icon: config.icon,
    awarded_at: new Date().toISOString(),
  });

  if (error) return null;
  return config;
}