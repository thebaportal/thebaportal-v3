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
  // approved version only happens as part of a deliberate approval — either the
  // PATCH transition below, or a direct approved insert (import), handled after
  // this block.
  //
  // While the save is still a draft, there is normally ONE current working draft
  // per (project, type, user): update it in place instead of inserting a new
  // version on every conversational turn. This keeps "formal version history"
  // meaningful (each version number is a real, once-approved milestone) without
  // an unbounded pile of never-superseded draft rows. decision_lab_output is
  // exempt, matching its existing multi-instance behaviour.
  //
  // Once a row has ever been approved (reasoning_context.was_approved, set by
  // PATCH/the approved-insert path below), it is permanently excluded from this
  // lookup — even if later reverted to draft. Approval is a historical milestone;
  // a row that has ever carried it must never again be treated as "the current
  // draft to update in place". The next save on that artifact type always
  // becomes a new version instead, so approved content, scope, and provenance
  // can never be silently mutated after the fact, by any path, for any type.
  if (!MULTI_INSTANCE_TYPES.includes(type) && requestedStatus === "draft") {
    const { data: existingDraft } = await db
      .from("artifacts")
      .select("id, reasoning_context")
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("status", "draft")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const eligibleForInPlaceUpdate = existingDraft && !(existingDraft.reasoning_context as Record<string, unknown> | null)?.was_approved;

    if (eligibleForInPlaceUpdate) {
      const { data, error } = await db
        .from("artifacts")
        .update({
          title: title ?? type.replace(/_/g, " "),
          content,
          reasoning_context: reasoning_context ?? {},
          source_artifact_ids: source_artifact_ids ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDraft!.id)
        .eq("project_id", params.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
      return NextResponse.json({ artifact: data });
    }
  }

  // No current draft eligible to update (first save since project start, first
  // save since the previous version was approved/archived, or the only draft
  // found has itself already been approved once and is now permanently locked)
  // — insert a fresh version.
  const { data: existing } = await db
    .from("artifacts")
    .select("version")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .eq("type", type)
    .order("version", { ascending: false })
    .limit(1);

  const version = existing?.[0]?.version ? existing[0].version + 1 : 1;

  // A direct approved insert (import: Replace or Add) is itself an approval —
  // it must supersede the previous approved version of this type exactly like
  // the PATCH transition does, so the product never holds two simultaneously
  // "current" approved artifacts of the same type.
  if (requestedStatus === "approved" && !MULTI_INSTANCE_TYPES.includes(type)) {
    await db
      .from("artifacts")
      .update({ status: "superseded" })
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("status", "approved");
  }

  const insertReasoningContext = { ...(reasoning_context ?? {}) };
  if (requestedStatus === "approved") insertReasoningContext.was_approved = true;

  const { data, error } = await db
    .from("artifacts")
    .insert({
      project_id: params.id,
      user_id: user.id,
      type,
      title: title ?? type.replace(/_/g, " "),
      content,
      reasoning_context: insertReasoningContext,
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
  //
  // Approving also permanently stamps reasoning_context.was_approved — this is
  // the one-way flag the POST handler checks to keep this exact row from ever
  // being treated as "the current draft to update in place" again, even if it
  // is later reverted. Approval is a historical milestone: content, scope_ids,
  // and provenance that existed at approval time must stay attached to this
  // version forever. A later change always becomes a new version instead (see
  // the "Revise" action), never an edit of this row.
  const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

  if (status === "approved") {
    const { data: target } = await db
      .from("artifacts")
      .select("type, reasoning_context")
      .eq("id", artifactId)
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (target) {
      updatePayload.reasoning_context = { ...(target.reasoning_context ?? {}), was_approved: true };

      if (!MULTI_INSTANCE_TYPES.includes(target.type)) {
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
  }

  const { data, error } = await db
    .from("artifacts")
    .update(updatePayload)
    .eq("id", artifactId)
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[api/projects/id/artifacts]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ artifact: data });
}
