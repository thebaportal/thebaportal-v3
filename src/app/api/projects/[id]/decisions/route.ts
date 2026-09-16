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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data, error } = await db
    .from("decision_log")
    .select("*")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) { console.error("[api/projects/id/decisions]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ decisions: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { decision_text, made_by, decision_date, status, impact_notes, linked_artifact_ids } = await req.json();
  if (!decision_text?.trim()) return NextResponse.json({ error: "Decision text is required" }, { status: 400 });

  const db = admin();
  const { data, error } = await db
    .from("decision_log")
    .insert({
      project_id: params.id,
      user_id: user.id,
      decision_text: decision_text.trim(),
      made_by,
      decision_date: decision_date ?? new Date().toISOString().split("T")[0],
      status: status ?? "open",
      impact_notes,
      linked_artifact_ids: linked_artifact_ids ?? [],
    })
    .select()
    .single();

  if (error) { console.error("[api/projects/id/decisions]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ decision: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { decisionId, ...updates } = await req.json();
  if (!decisionId) return NextResponse.json({ error: "decisionId required" }, { status: 400 });

  const db = admin();
  const { data, error } = await db
    .from("decision_log")
    .update(updates)
    .eq("id", decisionId)
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[api/projects/id/decisions]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ decision: data });
}
