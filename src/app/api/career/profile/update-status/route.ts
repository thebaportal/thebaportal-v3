import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const VALID = ["saved", "applied", "interviewing", "offer", "rejected"];

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { job_id, source, status } = await req.json();
  if (!VALID.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });

  const db = admin();
  const table = source === "user" ? "user_jobs" : "saved_jobs";
  const idField = source === "user" ? "id" : "job_id";

  const updates: Record<string, unknown> = { status };

  // Snapshot the current default resume when marking as applied
  if (status === "applied" && source === "user") {
    const { data: resume } = await db
      .from("user_resumes")
      .select("name, raw_text")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resume) {
      updates.submitted_resume_text = resume.raw_text;
      updates.submitted_resume_name = resume.name;
    }
    updates.applied_at = new Date().toISOString();
  }

  const { error } = await db
    .from(table)
    .update(updates)
    .eq(idField, job_id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ updated: true });
}
