import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// PATCH — rename or set as default
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { name, is_default } = await req.json();
  const db = admin();

  // Verify ownership
  const { data: existing } = await db
    .from("user_resumes")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // If setting as default, clear existing default first
  if (is_default) {
    await db
      .from("user_resumes")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (is_default !== undefined) updates.is_default = is_default;

  const { data, error } = await db
    .from("user_resumes")
    .update(updates)
    .eq("id", params.id)
    .select("id, name, file_name, is_default, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ resume: data });
}

// DELETE — remove a resume
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const db = admin();

  const { data: existing } = await db
    .from("user_resumes")
    .select("id, is_default")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await db.from("user_resumes").delete().eq("id", params.id);

  // If deleted resume was default, promote the most recent remaining one
  if (existing.is_default) {
    const { data: next } = await db
      .from("user_resumes")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (next) {
      await db.from("user_resumes").update({ is_default: true }).eq("id", next.id);
    }
  }

  return Response.json({ deleted: true });
}
