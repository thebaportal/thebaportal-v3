export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import JobsClient from "./JobsClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function JobPlansPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();

  const [profileRes, savedJobsRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("saved_jobs")
      .select("id, job_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const jobIds = (savedJobsRes.data ?? []).map(j => j.job_id);
  const listingsMap: Record<string, { id: string; title: string; company: string | null; location: string | null; has_description: boolean }> = {};
  if (jobIds.length > 0) {
    const { data: listings } = await db
      .from("job_listings").select("id, title, company, location, description").in("id", jobIds);
    (listings ?? []).forEach(l => { listingsMap[l.id] = { ...l, has_description: !!l.description }; });
  }

  let portalMeta: Record<string, { analysis_result: unknown; status: string }> = {};
  try {
    const { data } = await db
      .from("saved_jobs").select("job_id, analysis_result, status").eq("user_id", user.id);
    (data ?? []).forEach(r => {
      portalMeta[r.job_id] = { analysis_result: r.analysis_result ?? null, status: r.status ?? "saved" };
    });
  } catch { /* columns not yet added */ }

  let userJobs: { id: string; title: string; company: string; location: string | null; apply_url: string | null; analysis_result: unknown; status: string; created_at: string; submitted_resume_text: string | null; submitted_resume_name: string | null; applied_at: string | null; cover_letter: string | null; jd_analysis: unknown; interview_questions: unknown }[] = [];
  try {
    const { data } = await db
      .from("user_jobs")
      .select("id, title, company, location, apply_url, analysis_result, status, created_at, submitted_resume_text, submitted_resume_name, applied_at, cover_letter, jd_analysis, interview_questions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    userJobs = (data ?? []).map(j => ({ ...j, status: j.status ?? "saved", submitted_resume_text: j.submitted_resume_text ?? null, submitted_resume_name: j.submitted_resume_name ?? null, applied_at: j.applied_at ?? null, cover_letter: j.cover_letter ?? null, jd_analysis: j.jd_analysis ?? null, interview_questions: j.interview_questions ?? null }));
  } catch { /* table not yet created */ }

  let hasResumes = false;
  try {
    const { count } = await db.from("user_resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    hasResumes = (count ?? 0) > 0;
  } catch { /* table not yet created */ }

  const portalJobs = (savedJobsRes.data ?? []).map(j => ({
    id: j.id,
    job_id: j.job_id,
    source: "portal" as const,
    title: listingsMap[j.job_id]?.title ?? null,
    company: listingsMap[j.job_id]?.company ?? null,
    location: listingsMap[j.job_id]?.location ?? null,
    apply_url: null,
    has_description: listingsMap[j.job_id]?.has_description ?? false,
    analysis_result: portalMeta[j.job_id]?.analysis_result ?? null,
    status: portalMeta[j.job_id]?.status ?? "saved",
    created_at: j.created_at,
  }));

  const externalJobs = userJobs.map(j => ({
    id: j.id,
    job_id: j.id,
    source: "user" as const,
    title: j.title,
    company: j.company,
    location: j.location,
    apply_url: j.apply_url,
    analysis_result: j.analysis_result,
    status: j.status,
    created_at: j.created_at,
    submitted_resume_text: j.submitted_resume_text,
    submitted_resume_name: j.submitted_resume_name,
    applied_at: j.applied_at,
    cover_letter: j.cover_letter,
    jd_analysis: j.jd_analysis,
    interview_questions: j.interview_questions,
  }));

  const allJobs = [...portalJobs, ...externalJobs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <JobsClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      allJobs={allJobs}
      hasResumes={hasResumes}
    />
  );
}
