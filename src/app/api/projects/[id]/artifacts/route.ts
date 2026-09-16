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

// decision_lab_output is exempt from both "one current draft" and "supersede on
// approve" — a project can hold several distinct, simultaneously-approved
// decisions, so there is no single "the current version" for this type.
const MULTI_INSTANCE_TYPES = ["decision_lab_output"];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data, error } = await db
    .from("artifacts")
    .select("*")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ artifacts: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, title, content, reasoning_context, status, source_artifact_ids } = await req.json();
  if (!type || !content) return NextResponse.json({ error: "type and content are required" }, { status: 400 });

  const db = admin();
  const requestedStatus = status ?? "draft";

  // Automatic draft saves must never touch an approved artifact. Superseding an
  // approved version only happens as part of a deliberate approval (see PATCH
  // below) — a plain autosave here never changes any other row's status.
  //
  // While the save is still a draft, there is normally ONE current working draft
  // per (project, type, user): update it in place instead of inserting a new
  // version on every conversational turn. This keeps "formal version history"
  // meaningful (each version number is a real, once-approved milestone) without
  // an unbounded pile of never-superseded draft rows. decision_lab_output is
  // exempt, matching its existing multi-instance behaviour.
  if (!MULTI_INSTANCE_TYPES.includes(type) && requestedStatus === "draft") {
    const { data: existingDraft } = await db
      .from("artifacts")
      .select("id")
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("status", "draft")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDraft) {
      const { data, error } = await db
        .from("artifacts")
        .update({
          title: title ?? type.replace(/_/g, " "),
          content,
          reasoning_context: reasoning_context ?? {},
          source_artifact_ids: source_artifact_ids ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDraft.id)
        .eq("project_id", params.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
      return NextResponse.json({ artifact: data });
    }
  }

  // No current draft to update (first save since project start, or first save
  // since the previous version was approved/archived) — insert a fresh version.
  const { data: existing } = await db
    .from("artifacts")
    .select("version")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .eq("type", type)
    .order("version", { ascending: false })
    .limit(1);

  const version = existing?.[0]?.version ? existing[0].version + 1 : 1;

  const { data, error } = await db
    .from("artifacts")
    .insert({
      project_id: params.id,
      user_id: user.id,
      type,
      title: title ?? type.replace(/_/g, " "),
      content,
      reasoning_context: reasoning_context ?? {},
      status: requestedStatus,
      version,
      source_artifact_ids: source_artifact_ids ?? [],
    })
    .select()
    .single();

  if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ artifact: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artifactId, status } = await req.json();
  if (!artifactId || !status) return NextResponse.json({ error: "artifactId and status required" }, { status: 400 });

  const db = admin();

  // Superseding a previously-approved artifact of the same type happens only
  // here, as part of a deliberate approval action — never as a side effect of an
  // automatic draft save (see POST above).
  if (status === "approved") {
    const { data: target } = await db
      .from("artifacts")
      .select("type")
      .eq("id", artifactId)
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (target && !MULTI_INSTANCE_TYPES.includes(target.type)) {
      await db
        .from("artifacts")
        .update({ status: "superseded" })
        .eq("project_id", params.id)
        .eq("user_id", user.id)
        .eq("type", target.type)
        .eq("status", "approved")
        .neq("id", artifactId);
    }
  }

  const { data, error } = await db
    .from("artifacts")
    .update({ status })
    .eq("id", artifactId)
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ artifact: data });
}
