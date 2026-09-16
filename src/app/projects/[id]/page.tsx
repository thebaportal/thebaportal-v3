export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getAcceptedFindings } from "@/lib/projects/context";
import ProjectWorkspaceClient from "./ProjectWorkspaceClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();
  const [profileRes, projectRes, artifactsRes, decisionsRes, findings] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("projects").select("*, organizations(name, country, industry)").eq("id", params.id).eq("user_id", user.id).single(),
    db.from("artifacts").select("*").eq("project_id", params.id).eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("decision_log").select("*").eq("project_id", params.id).eq("user_id", user.id).order("created_at", { ascending: false }),
    getAcceptedFindings(params.id, user.id),
  ]);

  if (!projectRes.data) notFound();

  return (
    <ProjectWorkspaceClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      project={projectRes.data as Parameters<typeof ProjectWorkspaceClient>[0]["project"]}
      initialArtifacts={(artifactsRes.data ?? []) as Parameters<typeof ProjectWorkspaceClient>[0]["initialArtifacts"]}
      initialDecisions={(decisionsRes.data ?? []) as Parameters<typeof ProjectWorkspaceClient>[0]["initialDecisions"]}
      initialFindings={findings as Parameters<typeof ProjectWorkspaceClient>[0]["initialFindings"]}
    />
  );
}
