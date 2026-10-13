// Artifact lifecycle request contract — shared by the artifacts API route and
// every client that changes an artifact.
//
// Every mutation carries `lifecycle: ARTIFACT_LIFECYCLE_VERSION` plus one explicit
// `intent`. The server refuses anything else with 409 "client_outdated" before
// touching the database, so a browser tab still running older JavaScript can
// never have its request re-interpreted as an autosave, revise or save under
// newer lifecycle rules. Bump the version whenever the meaning of a mutation
// request changes.
export const ARTIFACT_LIFECYCLE_VERSION = 2;

export const ARTIFACT_POST_INTENTS = ["autosave", "save_draft", "revise", "import_approved", "import_draft", "create_decision"] as const;
export const ARTIFACT_PATCH_INTENTS = ["approve", "archive"] as const;
export type ArtifactIntent = typeof ARTIFACT_POST_INTENTS[number] | typeof ARTIFACT_PATCH_INTENTS[number];

// The one artifact type per Work area. Autosave and import only ever target these.
export const WORK_ARTIFACT_TYPES = [
  "problem_analysis", "stakeholder_analysis", "requirements", "process_map", "user_stories", "brd", "test_case",
];
export const DECISION_LAB_TYPE = "decision_lab_output";

export const CLIENT_OUTDATED_MESSAGE = "This page is out of date. Refresh to continue.";

export type ArtifactMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string | null; outdated: boolean; data: Record<string, unknown> | null };

export async function mutateArtifact<T>(
  projectId: string, intent: ArtifactIntent, fields: Record<string, unknown> = {},
): Promise<ArtifactMutationResult<T>> {
  const method = (ARTIFACT_PATCH_INTENTS as readonly string[]).includes(intent) ? "PATCH" : "POST";
  const res = await fetch(`/api/projects/${projectId}/artifacts`, {
    method, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, lifecycle: ARTIFACT_LIFECYCLE_VERSION, intent }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };
  const error = typeof data?.error === "string" ? data.error : null;
  return { ok: false, status: res.status, error, outdated: error === "client_outdated", data };
}

// The message to show for a failed mutation: the refresh prompt when the page is
// out of date, otherwise the caller's usual wording.
export function mutationFailureText(r: { ok: false; outdated: boolean }, fallback: string): string {
  return r.outdated ? CLIENT_OUTDATED_MESSAGE : fallback;
}
