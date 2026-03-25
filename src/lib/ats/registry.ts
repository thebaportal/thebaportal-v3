/**
 * BrainWave employer source registry.
 *
 * The registry lives in the `employer_sources` database table, not in code.
 * Adding a new employer is a SQL INSERT — no deployment required.
 *
 * Platform routing:
 *   greenhouse      → slug required
 *   lever           → slug required
 *   workday         → tenant + wd_num + board_name required
 *   smartrecruiters → slug required (SmartRecruiters company identifier)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ATSPlatform =
  | "greenhouse"
  | "lever"
  | "workday"
  | "smartrecruiters"
  | "icims"
  | "bamboohr"
  | "jobvite";

export interface EmployerSource {
  id:         string;
  name:       string;
  platform:   ATSPlatform;
  /** Greenhouse/Lever slug or SmartRecruiters company identifier */
  slug:       string | null;
  /** Workday tenant ID, e.g. "rbc" */
  tenant:     string | null;
  /** Workday cluster number, e.g. 3 or 103 */
  wd_num:     number | null;
  /** Workday site name, e.g. "RBCGLOBAL1" */
  board_name: string | null;
  careers_url: string | null;
  /** "CA" or "GLOBAL" — informational hint, not used for filtering */
  region_hint: string;
  verified:   boolean;
}

/**
 * Fetch all active employer sources from the database.
 * Returns empty array and logs on error — callers decide how to handle that.
 */
export async function fetchActiveEmployerSources(
  supabase: SupabaseClient
): Promise<EmployerSource[]> {
  const { data, error } = await supabase
    .from("employer_sources")
    .select(
      "id, name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, verified"
    )
    .eq("active", true)
    .order("platform")
    .order("name");

  if (error) {
    console.error("[registry] Failed to fetch employer_sources:", error.message);
    return [];
  }

  const sources = (data ?? []) as EmployerSource[];
  console.log(
    `[registry] Loaded ${sources.length} active sources — ` +
    Object.entries(
      sources.reduce<Record<string, number>>((acc, s) => {
        acc[s.platform] = (acc[s.platform] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")
  );

  return sources;
}

/**
 * Mark a source as having failed.
 * Increments consecutive_failures and records last_error + last_fetched_at.
 * Auto-deactivates the source after 3 consecutive failures.
 * Returns true if the source was deactivated this run.
 * Non-fatal — errors here are ignored so the main pipeline keeps running.
 */
export async function recordSourceFailure(
  supabase: SupabaseClient,
  sourceId: string,
  sourceName: string,
  error: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("employer_sources")
      .select("consecutive_failures")
      .eq("id", sourceId)
      .single();

    const newCount = ((data?.consecutive_failures as number) ?? 0) + 1;
    const shouldDeactivate = newCount >= 3;

    await supabase
      .from("employer_sources")
      .update({
        consecutive_failures: newCount,
        last_fetched_at:      new Date().toISOString(),
        last_error:           error,
        ...(shouldDeactivate ? { active: false } : {}),
      })
      .eq("id", sourceId);

    if (shouldDeactivate) {
      console.warn(
        `[registry] ${sourceName} deactivated after 3 consecutive fetch failures — last error: ${error}`
      );
    }

    return shouldDeactivate;
  } catch {
    // Non-fatal — registry failure tracking must not break the pipeline
    return false;
  }
}

/**
 * Reset consecutive_failures to 0 and record last_success_at after a successful fetch.
 */
export async function recordSourceSuccess(
  supabase: SupabaseClient,
  sourceId: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await supabase
      .from("employer_sources")
      .update({
        consecutive_failures: 0,
        last_fetched_at:      now,
        last_success_at:      now,
        last_error:           null,
      })
      .eq("id", sourceId);
  } catch {
    // Non-fatal
  }
}
