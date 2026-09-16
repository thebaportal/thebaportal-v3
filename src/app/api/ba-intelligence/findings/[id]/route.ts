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

type Action = "accept" | "reject" | "restore" | "edit";
const ACTIONS: Action[] = ["accept", "reject", "restore", "edit"];

// Explicit state machine. "Accept" and "reject" only apply to a proposed
// finding; "restore" only reverses a rejection; "edit" only touches a
// finding still under review. This keeps accepted findings final in Phase 1
// (no accepted -> rejected shortcut) and keeps editing from ever implying
// acceptance. See architecture review — editing is not a review status.
function nextStatus(action: Action, current: string): string | null {
  if (action === "accept")  return current === "proposed" ? "accepted" : null;
  if (action === "reject")  return current === "proposed" ? "rejected" : null;
  if (action === "restore") return current === "rejected" ? "proposed" : null;
  return null; // "edit" does not change review_status
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { action?: string; finding_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action, finding_text } = body;
  if (!action || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "action must be one of accept, reject, restore, edit" }, { status: 400 });
  }

  const db = admin();

  const { data: existing, error: fetchError } = await db
    .from("ba_intel_findings")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "edit") {
    if (typeof finding_text !== "string" || !finding_text.trim()) {
      return NextResponse.json({ error: "finding_text is required to edit a finding" }, { status: 400 });
    }
    if (existing.review_status !== "proposed") {
      return NextResponse.json({ error: "invalid_transition", detail: "Only a proposed finding can be edited." }, { status: 409 });
    }

    const update: { finding_text: string; original_finding_text?: string } = { finding_text: finding_text.trim() };
    // Preserve the AI-generated version on the FIRST edit only. A second edit
    // must not overwrite the original with the BA's first revision.
    if (existing.original_finding_text === null) {
      update.original_finding_text = existing.finding_text;
    }

    const { data: updated, error: updateError } = await db
      .from("ba_intel_findings")
      .update(update)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("[ba-intelligence/findings] edit failed:", updateError);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    return NextResponse.json({ finding: updated });
  }

  // accept / reject / restore
  const status = nextStatus(action as Action, existing.review_status);
  if (!status) {
    return NextResponse.json({
      error: "invalid_transition",
      detail: `Cannot ${action} a finding with review_status "${existing.review_status}".`,
    }, { status: 409 });
  }

  const { data: updated, error: updateError } = await db
    .from("ba_intel_findings")
    .update({ review_status: status })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("[ba-intelligence/findings] status update failed:", updateError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ finding: updated });
}
