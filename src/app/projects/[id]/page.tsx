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

export default async function ProjectPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();
  const [profileRes, projectRes, artifactsRes, decisionsRes, findings, reviewFindingsRes, notesRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("projects").select("*, organizations(name, country, industry)").eq("id", params.id).eq("user_id", user.id).single(),
    db.from("artifacts").select("*").eq("project_id", params.id).eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("decision_log").select("*").eq("project_id", params.id).eq("user_id", user.id).order("created_at", { ascending: false }),
    getAcceptedFindings(params.id, user.id),
    // Lightweight, separate from getAcceptedFindings — attention needs review_status
    // across every finding (to find unreviewed ones), not just accepted context.
    db.from("ba_intel_findings").select("id, review_status").eq("project_id", params.id).eq("user_id", user.id),
    // Project Context notes (Add context) — BA-supplied source material that
    // every workstream receives automatically, labelled as unvalidated notes.
    db.from("ba_intel_sessions").select("id, source_label, source_text, created_at").eq("project_id", params.id).eq("user_id", user.id).eq("status", "noted").order("created_at", { ascending: true }),
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
      initialReviewFindings={(reviewFindingsRes.data ?? []) as Parameters<typeof ProjectWorkspaceClient>[0]["initialReviewFindings"]}
      initialNotes={(notesRes.data ?? []) as Parameters<typeof ProjectWorkspaceClient>[0]["initialNotes"]}
      initialTab={searchParams.tab === "work" ? "work" : "home"}
    />
  );
}
