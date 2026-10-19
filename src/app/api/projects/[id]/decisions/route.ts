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

// The only decision fields a client may write. Identity and ownership columns
// (id, project_id, user_id, created_at) always come from the server.
const FIELDS = ["decision_text", "made_by", "decision_date", "status", "impact_notes", "linked_artifact_ids"] as const;
const STATUSES = ["open", "accepted", "deferred", "rejected"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown) => typeof v === "string" && UUID.test(v);
const isText = (v: unknown) => v === undefined || v === null || typeof v === "string";
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

type Fields = Partial<Record<typeof FIELDS[number], unknown>>;

/** Picks the permitted fields; returns an error message for anything else or any malformed value. */
function readFields(b: Record<string, unknown>, extra: string[] = []): { fields: Fields } | { error: string } {
  const unknown = Object.keys(b).filter(k => !(FIELDS as readonly string[]).includes(k) && !extra.includes(k));
  if (unknown.length) return { error: `field_not_allowed: ${unknown.join(", ")}` };
  const f: Fields = {};
  for (const k of FIELDS) if (b[k] !== undefined) f[k] = b[k];
  if ("decision_text" in f && (typeof f.decision_text !== "string" || !f.decision_text.trim())) return { error: "Decision text is required" };
  if (!isText(f.made_by) || !isText(f.impact_notes)) return { error: "made_by and impact_notes must be text" };
  if ("decision_date" in f && !isDate(f.decision_date)) return { error: "decision_date must be YYYY-MM-DD" };
  if ("status" in f && !STATUSES.includes(f.status as string)) return { error: `status must be one of ${STATUSES.join(", ")}` };
  if ("linked_artifact_ids" in f && !(Array.isArray(f.linked_artifact_ids) && f.linked_artifact_ids.every(isId))) return { error: "linked_artifact_ids must be artifact ids" };
  if (typeof f.decision_text === "string") f.decision_text = f.decision_text.trim();
  return { fields: f };
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const b = await req.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? b as Record<string, unknown> : null;
}

/** Signed-in user + ownership of this project (the admin client bypasses RLS, so ownership is checked here). */
async function sessionAndProject(projectId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { fail: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const db = admin();
  const { data: project } = await db.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (!project) return { fail: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { user, db };
}

/** Linked artifacts must be this user's artifacts in this project. */
async function linksOwned(db: ReturnType<typeof admin>, projectId: string, userId: string, ids: unknown): Promise<boolean> {
  const list = [...new Set((ids as string[] | undefined) ?? [])];
  if (!list.length) return true;
  const { data } = await db.from("artifacts").select("id").in("id", list).eq("project_id", projectId).eq("user_id", userId);
  return (data ?? []).length === list.length;
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
  const body = await readBody(req);
  if (!body) return bad("invalid_json");
  const read = readFields(body);
  if ("error" in read) return bad(read.error);
  const f = read.fields;
  if (typeof f.decision_text !== "string") return bad("Decision text is required");

  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  if (!(await linksOwned(db, params.id, user.id, f.linked_artifact_ids))) return bad("linked_artifact_ids must be artifacts of this project");

  const { data, error } = await db
    .from("decision_log")
    .insert({
      project_id: params.id,
      user_id: user.id,
      decision_text: f.decision_text,
      made_by: f.made_by,
      decision_date: f.decision_date ?? new Date().toISOString().split("T")[0],
      status: f.status ?? "open",
      impact_notes: f.impact_notes,
      linked_artifact_ids: f.linked_artifact_ids ?? [],
    })
    .select()
    .single();

  if (error) { console.error("[api/projects/id/decisions]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ decision: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await readBody(req);
  if (!body) return bad("invalid_json");
  if (!isId(body.decisionId)) return bad("decisionId required");
  const read = readFields(body, ["decisionId"]);
  if ("error" in read) return bad(read.error);
  const updates = read.fields;
  if (!Object.keys(updates).length) return bad("no_fields_to_update");

  const ctx = await sessionAndProject(params.id);
  if (ctx.fail) return ctx.fail;
  const { user, db } = ctx;
  if (!(await linksOwned(db, params.id, user.id, updates.linked_artifact_ids))) return bad("linked_artifact_ids must be artifacts of this project");

  const { data, error } = await db
    .from("decision_log")
    .update(updates)
    .eq("id", body.decisionId as string)
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) { console.error("[api/projects/id/decisions]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ decision: data });
}
