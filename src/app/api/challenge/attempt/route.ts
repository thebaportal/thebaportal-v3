export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/challenge/attempt?challengeId=xxx
// Returns the most recent draft for the current user + challenge
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challengeId = req.nextUrl.searchParams.get("challengeId");
  if (!challengeId) return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });

  const { data, error } = await admin
    .from("challenge_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: data ?? null });
}

// POST /api/challenge/attempt
// Creates or updates a draft attempt
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    id,
    challengeId,
    mode,
    status,
    currentTab,
    conversations,
    submission,
    evalResult,
    validationResult,
    questionCount,
  } = body;

  const now = new Date().toISOString();

  if (id) {
    // Update existing attempt
    const { data, error } = await admin
      .from("challenge_attempts")
      .update({
        mode,
        status: status ?? "draft",
        current_tab: currentTab,
        conversations,
        submission,
        eval_result: evalResult ?? null,
        validation_result: validationResult ?? null,
        question_count: questionCount ?? 0,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } else {
    // Create new attempt
    const { data, error } = await admin
      .from("challenge_attempts")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        mode: mode ?? "normal",
        status: "draft",
        current_tab: currentTab ?? "brief",
        conversations: conversations ?? {},
        submission: submission ?? "",
        eval_result: evalResult ?? null,
        validation_result: validationResult ?? null,
        question_count: questionCount ?? 0,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }
}
