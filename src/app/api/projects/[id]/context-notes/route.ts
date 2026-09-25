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

// Reuses ba_intel_sessions as the chronological project-source-material log —
// see project memory's data-model check. A plain project note is written
// with status "noted" and never touches the AI analyze pipeline: no findings
// row is created, so it can never be silently mistaken for an accepted
// requirement, business rule, or decision. Trust rule stays intact — a note
// is source material a BA supplied, not validated project knowledge.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { text?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Note text is required" }, { status: 400 });
  const label = (body.label ?? "").trim() || "Project note";

  const db = admin();

  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (projectError || !project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const { data: note, error } = await db
    .from("ba_intel_sessions")
    .insert({
      project_id: params.id,
      user_id: user.id,
      source_label: label,
      source_text: text,
      status: "noted",
    })
    .select("id, source_label, source_text, status, created_at")
    .single();

  if (error) {
    console.error("[api/projects/id/context-notes]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ note });
}
