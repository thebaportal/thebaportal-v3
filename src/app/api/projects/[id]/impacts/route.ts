import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { computeImpacts, type ImpactArtifact, type ImpactReview } from "@/lib/projects/impact";

// Project impact acknowledgements (Slice 1). The only write: "Mark reviewed — no
// change needed" for one affected work item. The client sends exactly the changes
// the Business Analyst confirmed; the server re-computes the item's current open
// changes from the database and records them only if they are still exactly that
// set — otherwise 409 impact_not_current (something changed since it was shown).

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: unknown) => typeof v === "string" && UUID.test(v);
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const tripleKey = (r: ImpactReview) => `${r.artifact_id}|${r.superseded_source_id}|${r.new_source_id}`;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b || typeof b !== "object" || Array.isArray(b)) return bad("invalid_json");
  const extra = Object.keys(b).filter(k => !["action", "item_key", "changes", "note"].includes(k));
  if (extra.length) return bad(`field_not_allowed: ${extra.join(", ")}`);
  if (b.action !== "mark_reviewed") return bad("action must be mark_reviewed");
  if (typeof b.item_key !== "string" || !b.item_key || b.item_key.length > 200) return bad("item_key required");
  if (b.note !== undefined && b.note !== null && (typeof b.note !== "string" || b.note.length > 1000)) return bad("note must be text up to 1000 characters");
  const changes = b.changes as ImpactReview[] | undefined;
  if (!Array.isArray(changes) || !changes.length || changes.length > 50
      || !changes.every(c => c && typeof c === "object" && Object.keys(c).length === 3
        && isId(c.artifact_id) && isId(c.superseded_source_id) && isId(c.new_source_id))) {
    return bad("changes must list the confirmed changes");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin();
  const { data: project } = await db.from("projects").select("id").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [artifactsRes, reviewsRes] = await Promise.all([
    db.from("artifacts").select("id, type, status, version, content, title, source_artifact_ids, lineage_id, reasoning_context").eq("project_id", params.id).eq("user_id", user.id),
    db.from("impact_reviews").select("artifact_id, superseded_source_id, new_source_id").eq("project_id", params.id).eq("user_id", user.id),
  ]);
  if (artifactsRes.error || reviewsRes.error) {
    console.error("[api/projects/id/impacts]", artifactsRes.error ?? reviewsRes.error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  const item = computeImpacts((artifactsRes.data ?? []) as ImpactArtifact[], (reviewsRes.data ?? []) as ImpactReview[])
    .items.find(i => i.key === b.item_key);
  const open = (item?.changes ?? []).map(c => ({ artifact_id: c.affected.id, superseded_source_id: c.used.id, new_source_id: c.current.id }));
  const sent = new Set(changes.map(tripleKey));
  if (!open.length || open.length !== sent.size || !open.every(o => sent.has(tripleKey(o)))) {
    return NextResponse.json({ error: "impact_not_current", message: "This impact has changed since it was shown. Review it again." }, { status: 409 });
  }

  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  const { error } = await db.from("impact_reviews")
    .upsert(open.map(o => ({ ...o, project_id: params.id, user_id: user.id, note })), { onConflict: "artifact_id,superseded_source_id,new_source_id", ignoreDuplicates: true });
  if (error) {
    console.error("[api/projects/id/impacts]", error);
    // The insert guard re-checks everything in the database; a refusal there means the change is no longer current.
    if (error.code === "23514") return NextResponse.json({ error: "impact_not_current" }, { status: 409 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ item_key: b.item_key, reviews: open });
}
