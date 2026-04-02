export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ResumesClient from "./ResumesClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ResumesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = admin();

  const [profileRes, resumesRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("resume_transformations")
      .select("id, created_at, transformed_output, job_listings(title, company)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <ResumesClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      resumes={(resumesRes.data ?? []) as Parameters<typeof ResumesClient>[0]["resumes"]}
    />
  );
}
