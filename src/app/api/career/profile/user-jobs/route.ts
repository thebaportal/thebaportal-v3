import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  const { title, company, location, description, apply_url, jd_analysis, interview_questions, submitted_resume_text } = await req.json();

  if (!title?.trim()) return Response.json({ error: "Job title is required." }, { status: 400 });
  if (!company?.trim()) return Response.json({ error: "Company name is required." }, { status: 400 });
  if (!description?.trim() || description.trim().length < 50) {
    return Response.json({ error: "Please paste at least a short job description so we can analyse your fit." }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    user_id: user.id,
    title: title.trim(),
    company: company.trim(),
    location: location?.trim() || null,
    description: description.trim(),
    apply_url: apply_url?.trim() || null,
  };

  if (jd_analysis !== undefined) insert.jd_analysis = jd_analysis;
  if (interview_questions !== undefined) insert.interview_questions = interview_questions;
  if (submitted_resume_text !== undefined) insert.submitted_resume_text = submitted_resume_text;

  const { data, error } = await admin()
    .from("user_jobs")
    .insert(insert)
    .select("id, title, company, location, apply_url, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ job: data });
}
