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

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = admin();
  const { data, error } = await db
    .from("projects")
    .select("*, organizations(name), artifacts(id, type, status, created_at)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) { console.error("[api/projects]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, problem_statement, methodology, industry, country, relevant_context, org_id, org_name } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  const db = admin();
  let orgId = org_id;

  if (!orgId && org_name) {
    const { data: org, error: orgErr } = await db
      .from("organizations")
      .insert({ user_id: user.id, name: org_name.trim(), country, industry, default_methodology: methodology ?? "agile" })
      .select()
      .single();
    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
    orgId = org.id;
  }

  if (!orgId) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

  const { data, error } = await db
    .from("projects")
    .insert({
      org_id: orgId,
      user_id: user.id,
      name: name.trim(),
      problem_statement,
      methodology: methodology ?? "agile",
      industry,
      country,
      relevant_context,
    })
    .select()
    .single();

  if (error) { console.error("[api/projects]", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ project: data });
}
