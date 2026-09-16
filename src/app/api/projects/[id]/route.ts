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
    .from("projects")
    .select("*, organizations(name, country, industry)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = admin();

  const { data, error } = await db
    .from("projects")
    .update(body)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) { console.error("[api/projects/id]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ project: data });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { error } = await db
    .from("projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) { console.error("[api/projects/id]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
