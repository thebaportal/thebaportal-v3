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
    .from("artifacts")
    .select("*")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifacts: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, title, content, reasoning_context, status } = await req.json();
  if (!type || !content) return NextResponse.json({ error: "type and content are required" }, { status: 400 });

  const db = admin();

  // Supersede any previous artifact of the same type
  await db
    .from("artifacts")
    .update({ status: "superseded" })
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .eq("type", type)
    .eq("status", "approved");

  // Get next version number
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
      status: status ?? "draft",
      version,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifact: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artifactId, status } = await req.json();
  if (!artifactId || !status) return NextResponse.json({ error: "artifactId and status required" }, { status: 400 });

  const db = admin();
  const { data, error } = await db
    .from("artifacts")
    .update({ status })
    .eq("id", artifactId)
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artifact: data });
}
