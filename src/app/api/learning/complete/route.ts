// src/app/api/learning/complete/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getModuleBadge } from "@/lib/badges";

const MODULE_LESSON_COUNTS: Record<string, number> = {
  "module-1": 4,
  "module-2": 4,
  "module-3": 4,
  "module-4": 4,
  "module-5": 4,
  "module-6": 4,
};

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, moduleId } = await req.json();
  if (!lessonId || !moduleId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Save lesson completion
  const { error } = await supabase
    .from("lesson_completions")
    .upsert(
      { user_id: user.id, lesson_id: lessonId, module_id: moduleId, completed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all lessons in this module are now complete
  const totalLessons = MODULE_LESSON_COUNTS[moduleId];
  if (!totalLessons) return NextResponse.json({ success: true, badgeAwarded: null });

  const { count } = await supabase
    .from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("module_id", moduleId);

  if (count !== totalLessons) return NextResponse.json({ success: true, badgeAwarded: null });

  // All lessons complete — award badge if not already held
  const badge = getModuleBadge(moduleId);
  if (!badge) return NextResponse.json({ success: true, badgeAwarded: null });

  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", user.id)
    .eq("badge_id", badge.id)
    .single();

  if (existing) return NextResponse.json({ success: true, badgeAwarded: null });

  const { error: badgeError } = await supabase
    .from("user_badges")
    .insert({ user_id: user.id, badge_id: badge.id, awarded_at: new Date().toISOString() });

  if (badgeError) {
    console.error("Badge award error:", badgeError);
    return NextResponse.json({ success: true, badgeAwarded: null });
  }

  return NextResponse.json({ success: true, badgeAwarded: badge });
}