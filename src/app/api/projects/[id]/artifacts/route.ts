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

// Artifact lifecycle — enforced by the database (migration 0011), not just here:
//   one authoritative Approved version + at most one working Draft + immutable
//   history, per lineage. Normal Work artifacts: one lineage per (project, type).
//   decision_lab_output: one lineage per decision (lineage_id).
// Every change goes through an atomic, lineage-locked database function or a
// guarded single-row update. The acting user is ALWAYS the authenticated session
// user — never an id supplied by the browser — and the project must be theirs.
const DECISION_LAB = "decision_lab_output";

// Database errors → HTTP. Lifecycle refusals are 409 (a conflict with the
// artifact's current state), never a silent overwrite.
function dbError(error: { message?: string; code?: string }) {
  const m = error.message ?? "";
  if (/artifact_not_found/.test(m)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const rule = m.match(/\b(artifact_[a-z_]+)/)?.[1];
  if (rule || error.code === "23505" || error.code === "23514") return NextResponse.json({ error: rule ?? "lifecycle_conflict", message: m }, { status: 409 });
  console.error("[api/projects/id/artifacts]", error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

async function sessionAndProject(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { fail: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const db = admin();
  const { data: project } = await db.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return { fail: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { user, db };
}

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

// POST intents (body.intent / body.artifact_id / body.status):
//   intent "revise" + source_id  → start the next Draft from the current Approved.
//                                   Never touches an existing Draft: returns it instead.
//   artifact_id                  → save edits to THAT exact Draft row only.
//   status "approved" (import)   → supersede + insert, atomically.
//   status "draft", Decision Lab → a new decision (new lineage, Draft v1).
//   status "draft", other types  → Work autosave into the single working Draft.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  const body = await req.json();
  const { intent, source_id, artifact_id, type, title, content, reasoning_context, status, source_artifact_ids } = body;

  if (intent === "revise") {
    if (!source_id) return NextResponse.json({ error: "source_id required" }, { status: 400 });
    const { data, error } = await db.rpc("artifact_revise", { p_project_id: params.id, p_user_id: user.id, p_source_id: source_id });
    if (error) return dbError(error);
    return NextResponse.json(data);   // { outcome: "created" | "existing_draft" | "not_latest", artifact }
  }

  if (artifact_id) {
    if (typeof content !== "string" || !content) return NextResponse.json({ error: "content required" }, { status: 400 });
    const patch: Record<string, unknown> = { content, updated_at: new Date().toISOString() };
    if (title !== undefined) patch.title = title;
    if (reasoning_context !== undefined) patch.reasoning_context = reasoning_context ?? {};
    if (source_artifact_ids !== undefined) patch.source_artifact_ids = source_artifact_ids ?? [];
    const { data, error } = await db.from("artifacts").update(patch)
      .eq("id", artifact_id).eq("project_id", params.id).eq("user_id", user.id)
      .in("status", ["draft", "in_review"])
      .select().maybeSingle();
    if (error) return dbError(error);
    if (data) return NextResponse.json({ artifact: data });
    const { data: exists } = await db.from("artifacts").select("id,status").eq("id", artifact_id).eq("project_id", params.id).eq("user_id", user.id).maybeSingle();
    return exists
      ? NextResponse.json({ error: "artifact_not_editable", message: `A ${exists.status} version cannot be edited` }, { status: 409 })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!type || !content) return NextResponse.json({ error: "type and content are required" }, { status: 400 });
  const args = {
    p_project_id: params.id, p_user_id: user.id, p_title: title ?? type.replace(/_/g, " "), p_content: content,
    p_reasoning_context: reasoning_context ?? {}, p_source_artifact_ids: source_artifact_ids ?? [],
  };
  const requested = status ?? "draft";
  if (requested === "approved") {
    if (type === DECISION_LAB) return NextResponse.json({ error: "artifact_wrong_lineage", message: "Decision Lab outputs are approved from a draft" }, { status: 409 });
    const { data, error } = await db.rpc("artifact_insert_approved", { ...args, p_type: type });
    return error ? dbError(error) : NextResponse.json({ artifact: data });
  }
  if (requested !== "draft") return NextResponse.json({ error: "status must be draft or approved" }, { status: 400 });
  const { data, error } = type === DECISION_LAB
    ? await db.rpc("artifact_create_decision", args)
    : await db.rpc("artifact_save_working_draft", { ...args, p_type: type });
  return error ? dbError(error) : NextResponse.json({ artifact: data });
}

// PATCH { artifactId, status }:
//   approved → atomic approval (supersedes only this lineage's previous Approved)
//   archived → discard a working Draft (Approved and history cannot be archived)
//   draft    → legacy "Back to draft", in_review rows only
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  const { artifactId, status } = await req.json();
  if (!artifactId || !status) return NextResponse.json({ error: "artifactId and status required" }, { status: 400 });

  if (status === "approved") {
    const { data, error } = await db.rpc("artifact_approve", { p_project_id: params.id, p_user_id: user.id, p_artifact_id: artifactId });
    return error ? dbError(error) : NextResponse.json({ artifact: data });
  }
  const from = status === "archived" ? ["draft", "in_review"] : status === "draft" ? ["in_review"] : null;
  if (!from) return NextResponse.json({ error: "unsupported status change" }, { status: 400 });
  const { data, error } = await db.from("artifacts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", artifactId).eq("project_id", params.id).eq("user_id", user.id).in("status", from)
    .select().maybeSingle();
  if (error) return dbError(error);
  if (data) return NextResponse.json({ artifact: data });
  const { data: exists } = await db.from("artifacts").select("status").eq("id", artifactId).eq("project_id", params.id).eq("user_id", user.id).maybeSingle();
  return exists
    ? NextResponse.json({ error: "artifact_invalid_transition", message: `${exists.status} → ${status} is not allowed` }, { status: 409 })
    : NextResponse.json({ error: "not_found" }, { status: 404 });
}
