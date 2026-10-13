import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  ARTIFACT_LIFECYCLE_VERSION, ARTIFACT_POST_INTENTS, ARTIFACT_PATCH_INTENTS, WORK_ARTIFACT_TYPES, DECISION_LAB_TYPE, CLIENT_OUTDATED_MESSAGE,
} from "@/lib/projects/artifactLifecycle";

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


// ── Request contract (see lib/projects/artifactLifecycle.ts) ──────────────────
// Checked before authentication or any database call: a request that does not
// carry the current lifecycle version and a known intent for this method is
// refused as client_outdated and nothing is read or written. An older client's
// request is never inferred to be an autosave, revise or save.
type Body = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown) => typeof v === "string" && UUID.test(v);
const isText = (v: unknown) => typeof v === "string" && v.length > 0;

async function readContract(req: Request, intents: readonly string[]): Promise<Body | null> {
  let body: unknown;
  try { body = await req.json(); } catch { return null; }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Body;
  if (b.lifecycle !== ARTIFACT_LIFECYCLE_VERSION || typeof b.intent !== "string" || !intents.includes(b.intent)) return null;
  return b;
}
function clientOutdated() {
  return NextResponse.json({ error: "client_outdated", message: CLIENT_OUTDATED_MESSAGE }, { status: 409 });
}

// Intent-specific inputs. Returns a reason when the request is malformed. The
// database lifecycle rules remain the final authority on what is allowed.
function invalidInput(b: Body): string | null {
  const optional = (b.title === undefined || typeof b.title === "string")
    && (b.reasoning_context === undefined || (typeof b.reasoning_context === "object" && b.reasoning_context !== null && !Array.isArray(b.reasoning_context)))
    && (b.source_artifact_ids === undefined || (Array.isArray(b.source_artifact_ids) && b.source_artifact_ids.every(isId)));
  if (!optional) return "title, reasoning_context or source_artifact_ids is malformed";
  switch (b.intent) {
    case "autosave":           // the Work area's single working Draft of a Work-area type
    case "import_approved":
      if (!WORK_ARTIFACT_TYPES.includes(b.type as string)) return "type must be a Work-area artifact type";
      if (b.artifact_id !== undefined || b.source_id !== undefined) return `${b.intent} does not target an existing row`;
      return isText(b.content) ? null : "content required";
    case "create_decision":    // always a new Decision Lab lineage
      if (b.type !== undefined && b.type !== DECISION_LAB_TYPE) return "create_decision only creates Decision Lab outputs";
      if (b.artifact_id !== undefined || b.source_id !== undefined) return "create_decision does not target an existing row";
      return isText(b.content) ? null : "content required";
    case "save_draft":         // exactly one Draft row, by id
      if (!isId(b.artifact_id)) return "artifact_id required";
      return isText(b.content) ? null : "content required";
    case "revise":             // the Approved version being revised
      return isId(b.source_id) ? null : "source_id required";
    case "approve": case "archive": case "back_to_draft":
      return isId(b.artifact_id) ? null : "artifact_id required";
  }
  return "unknown intent";
}

// POST intents:
//   autosave         → Work autosave into the single working Draft of `type`.
//   save_draft       → save edits to THAT exact Draft row (artifact_id) only.
//   revise           → start the next Draft from the current Approved (source_id).
//                      Never touches an existing Draft: returns it instead.
//   import_approved  → supersede + insert, atomically.
//   create_decision  → a new Decision Lab decision (new lineage, Draft v1).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await readContract(req, ARTIFACT_POST_INTENTS);
  if (!body) return clientOutdated();
  const invalid = invalidInput(body);
  if (invalid) return NextResponse.json({ error: "invalid_request", message: invalid }, { status: 400 });

  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  const { intent, source_id, artifact_id, title, content, reasoning_context, source_artifact_ids } = body as {
    intent: string; source_id?: string; artifact_id?: string; title?: string; content: string;
    reasoning_context?: Record<string, unknown>; source_artifact_ids?: string[];
  };
  const type = (body.type as string | undefined) ?? DECISION_LAB_TYPE;

  if (intent === "revise") {
    const { data, error } = await db.rpc("artifact_revise", { p_project_id: params.id, p_user_id: user.id, p_source_id: source_id });
    if (error) return dbError(error);
    return NextResponse.json(data);   // { outcome: "created" | "existing_draft" | "not_latest", artifact }
  }

  if (intent === "save_draft") {
    const patch: Record<string, unknown> = { content, updated_at: new Date().toISOString() };
    if (title !== undefined) patch.title = title;
    const { data, error } = await db.from("artifacts").update(patch)
      .eq("id", artifact_id!).eq("project_id", params.id).eq("user_id", user.id)
      .in("status", ["draft", "in_review"])
      .select().maybeSingle();
    if (error) return dbError(error);
    if (data) return NextResponse.json({ artifact: data });
    const { data: exists } = await db.from("artifacts").select("id,status").eq("id", artifact_id!).eq("project_id", params.id).eq("user_id", user.id).maybeSingle();
    return exists
      ? NextResponse.json({ error: "artifact_not_editable", message: `A ${exists.status} version cannot be edited` }, { status: 409 })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const args = {
    p_project_id: params.id, p_user_id: user.id, p_title: title ?? type.replace(/_/g, " "), p_content: content,
    p_reasoning_context: reasoning_context ?? {}, p_source_artifact_ids: source_artifact_ids ?? [],
  };
  const { data, error } =
    intent === "import_approved" ? await db.rpc("artifact_insert_approved", { ...args, p_type: type })
    : intent === "create_decision" ? await db.rpc("artifact_create_decision", args)
    : await db.rpc("artifact_save_working_draft", { ...args, p_type: type });   // autosave
  return error ? dbError(error) : NextResponse.json({ artifact: data });
}

// PATCH intents (artifact_id):
//   approve        → atomic approval (supersedes only this lineage's previous Approved)
//   archive        → discard a working Draft (Approved and history cannot be archived)
//   back_to_draft  → legacy "In Review" rows only
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readContract(req, ARTIFACT_PATCH_INTENTS);
  if (!body) return clientOutdated();
  const invalid = invalidInput(body);
  if (invalid) return NextResponse.json({ error: "invalid_request", message: invalid }, { status: 400 });

  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  const artifactId = body.artifact_id as string;

  if (body.intent === "approve") {
    const { data, error } = await db.rpc("artifact_approve", { p_project_id: params.id, p_user_id: user.id, p_artifact_id: artifactId });
    return error ? dbError(error) : NextResponse.json({ artifact: data });
  }
  const [status, from] = body.intent === "archive" ? ["archived", ["draft", "in_review"]] : ["draft", ["in_review"]];
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
