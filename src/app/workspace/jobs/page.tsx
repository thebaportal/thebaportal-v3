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

export default async function SavedJobsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();

  const [profileRes, savedJobsRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("saved_jobs")
      .select("id, job_id, created_at, job_listings(id, title, company, location, work_type, level)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <JobsClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      savedJobs={(savedJobsRes.data ?? []) as unknown as Parameters<typeof JobsClient>[0]["savedJobs"]}
    />
  );
}
