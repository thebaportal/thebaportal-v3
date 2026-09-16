import { createClient as createAdminClient } from "@supabase/supabase-js";

// The V1 artifact taxonomy, matching the types the existing workstream tools already
// write (problem_analysis, process_map, brd) plus the new ones added for V1
// (decision_lab_output, test_case). See project memory project_b1_artifact_model.
export type ArtifactType =
  | "problem_analysis"
  | "stakeholder_analysis"
  | "decision_lab_output"
  | "requirements"
  | "user_stories"
  | "process_map"
  | "brd"
  | "test_case";

export interface ProjectArtifact {
  id: string;
  project_id: string;
  user_id: string;
  type: ArtifactType;
  title: string | null;
  content: string;
  reasoning_context: Record<string, unknown>;
  status: "draft" | "approved" | "superseded";
  version: number;
  source_artifact_ids: string[];
  created_at: string;
  updated_at: string;
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Approved artifacts for a project, optionally filtered by type. This is the shared
 * read path every tool uses to pull upstream context — it does not assume "one current
 * artifact per type": types like requirements/user_stories behave that way today (the
 * artifacts API supersedes the prior approved one on save), but decision_lab_output does
 * not — a project can hold several distinct, simultaneously-approved decisions. Callers
 * that want "the one current X" should use getLatestApprovedArtifact; callers that want
 * every approved decision, stakeholder note, etc. should use this directly.
 */
export async function getApprovedArtifacts(
  projectId: string,
  userId: string,
  types?: ArtifactType[]
): Promise<ProjectArtifact[]> {
  const db = admin();
  let query = db
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (types?.length) query = query.in("type", types);

  const { data, error } = await query;
  if (error) {
    console.error("[getApprovedArtifacts]", error);
    return [];
  }
  return (data ?? []) as ProjectArtifact[];
}

/** Most recently approved artifact of a given type — for singular, versioned document types. */
export async function getLatestApprovedArtifact(
  projectId: string,
  userId: string,
  type: ArtifactType
): Promise<ProjectArtifact | null> {
  const artifacts = await getApprovedArtifacts(projectId, userId, [type]);
  return artifacts[0] ?? null;
}

// BA Intelligence findings live in ba_intel_findings, not the artifacts table —
// see project memory (project_b1_artifact_model). A finding is a much smaller,
// individually-reviewable unit than a document-type artifact.
export type FindingCategory =
  | "requirement"
  | "business_rule"
  | "unresolved_question"
  | "contradiction"
  | "edge_case";

export interface AcceptedFinding {
  id: string;
  session_id: string;
  category: FindingCategory;
  finding_text: string;
  source_evidence: string | null;
  created_at: string;
}

/**
 * Accepted BA Intelligence findings for a project — validated context, never
 * proposed or rejected findings. Same project+user scoping pattern as
 * getApprovedArtifacts, since the admin client bypasses RLS.
 */
export async function getAcceptedFindings(
  projectId: string,
  userId: string,
  categories?: FindingCategory[]
): Promise<AcceptedFinding[]> {
  const db = admin();
  let query = db
    .from("ba_intel_findings")
    .select("id, session_id, category, finding_text, source_evidence, created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("review_status", "accepted")
    .order("created_at", { ascending: true });

  if (categories?.length) query = query.in("category", categories);

  const { data, error } = await query;
  if (error) {
    console.error("[getAcceptedFindings]", error);
    return [];
  }
  return (data ?? []) as AcceptedFinding[];
}
