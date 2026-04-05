export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — load all sessions for current user
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("pitch_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// POST — save a session
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { scenarioId, scenarioTitle, audience, transcript, duration, wordCount, overallScore, feedback, focusArea, timeLimit } = body;

  if (!scenarioId || !scenarioTitle || !feedback) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Core insert — optional columns added only if present to avoid schema errors
  const row: Record<string, unknown> = {
    user_id: user.id,
    scenario_id: scenarioId,
    scenario_title: scenarioTitle,
    transcript: transcript ?? null,
    duration: duration ?? null,
    word_count: wordCount ?? null,
    overall_score: overallScore ?? null,
    feedback_output: feedback,
  };
  if (audience !== undefined) row.audience = audience;
  if (focusArea !== undefined) row.selected_focus_area = focusArea;
  if (timeLimit !== undefined) row.selected_time_limit = timeLimit;

  const { data, error } = await admin
    .from("pitch_sessions")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("pitch session save error:", error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message, details: error.details }, { status: 500 });
  }
  console.log("pitch session saved:", data.id, "user:", user.id);
  return NextResponse.json({ ok: true, id: data.id });
}
