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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const db = admin();
  const query = db
    .from("artifact_conversations")
    .select("*")
    .eq("project_id", params.id)
    .eq("user_id", user.id);

  if (type) query.eq("workstream_type", type);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) { console.error("[api/projects/id/conversations]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workstream_type, messages, artifact_id } = await req.json();
  if (!workstream_type || !messages) return NextResponse.json({ error: "workstream_type and messages required" }, { status: 400 });

  const db = admin();
  // Conflict target includes user_id (matches the artifact_conversations unique
  // constraint) so an upsert can never collide with, and silently overwrite, a
  // different user's row for the same project_id + workstream_type.
  const { data, error } = await db
    .from("artifact_conversations")
    .upsert(
      { project_id: params.id, user_id: user.id, workstream_type, messages, artifact_id: artifact_id ?? null },
      { onConflict: "project_id,workstream_type,user_id" }
    )
    .select()
    .single();

  if (error) { console.error("[api/projects/id/conversations]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ conversation: data });
}
