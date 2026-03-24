/**
 * Core types for the BrainWave multi-source ATS ingestion system.
 *
 * Adding a new source adapter:
 *   1. Create src/lib/ats/adapters/{name}.ts implementing JobAdapter
 *   2. Register it in src/lib/ats/adapters/index.ts
 *   3. Add company configs in src/lib/ats/companies.ts
 *   Nothing else needs to change.
 */

/** Canonical job record after normalization — every adapter produces this. */
export interface NormalizedJob {
  title: string;
  company: string;
  location: string | null;
  /** Direct link to the job posting / application form on the ATS */
  apply_url: string;
  description: string | null;
  /** ISO-8601 string. Adapters should use the earliest reliable date available. */
  posted_at: string;
  /** Human-readable source label, e.g. "Clio" or "Greenhouse" */
  source_name: string;
  /** Machine-readable platform key: 'greenhouse' | 'lever' | 'workday' | … */
  source_type: string;
  /** Company slug on the ATS platform, e.g. "clio" */
  source_slug: string | null;
  /** Set to true only after passing the BA relevance filter */
  is_ba_relevant: boolean;
}

/**
 * Every source adapter must implement this interface.
 * The refresh pipeline calls fetchJobs() on each registered adapter
 * and merges the results before filtering and upserting.
 */
export interface JobAdapter {
  /** Display name used in logs, e.g. "Greenhouse" */
  readonly name: string;
  /** Platform key written to source_type column */
  readonly source_type: string;
  /** Fetch all current jobs from this source and return normalized records. */
  fetchJobs(): Promise<NormalizedJob[]>;
}

export interface RefreshResult {
  ok: boolean;
  fetched: number;
  upserted: number;
  skippedIrrelevant: number;
  skippedStale: number;
  error?: string;
  envErrors?: string[];
}
