import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// List a project's BA Intelligence sessions with lightweight review-progress
// counts. Read-only — added while building the UI, which cannot show session
// history or survive a reload without a way to read persisted sessions back.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  const db = admin();

  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (projectError || !project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const { data: sessions, error: sessionsError } = await db
    .from("ba_intel_sessions")
    .select("id, source_label, source_text, status, created_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (sessionsError) {
    console.error("[ba-intelligence/sessions] list failed:", sessionsError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const sessionIds = (sessions ?? []).map(s => s.id);
  let counts = new Map<string, { total: number; reviewed: number }>();
  if (sessionIds.length > 0) {
    const { data: findingRows, error: findingsError } = await db
      .from("ba_intel_findings")
      .select("session_id, review_status")
      .in("session_id", sessionIds)
      .eq("user_id", user.id);

    if (findingsError) {
      console.error("[ba-intelligence/sessions] counts failed:", findingsError);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    counts = (findingRows ?? []).reduce((map, f) => {
      const entry = map.get(f.session_id) ?? { total: 0, reviewed: 0 };
      entry.total += 1;
      if (f.review_status !== "proposed") entry.reviewed += 1;
      map.set(f.session_id, entry);
      return map;
    }, new Map<string, { total: number; reviewed: number }>());
  }

  const result = (sessions ?? []).map(s => ({
    id: s.id,
    source_label: s.source_label,
    source_preview: s.source_text.length > 160 ? `${s.source_text.slice(0, 160)}...` : s.source_text,
    status: s.status,
    created_at: s.created_at,
    finding_count: counts.get(s.id)?.total ?? 0,
    reviewed_count: counts.get(s.id)?.reviewed ?? 0,
  }));

  return NextResponse.json({ sessions: result });
}
