/**
 * Core types for the BrainWave multi-source ATS ingestion system.
 *
 * Adding a new source adapter:
 *   1. Create src/lib/ats/adapters/{name}.ts implementing JobAdapter
 *   2. Register it in src/lib/ats/adapters/index.ts
 *   3. Insert employer rows into employer_sources (no code change needed)
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
 * Per-source health result returned by each adapter.
 * The refresh pipeline uses this to update employer_sources health fields.
 */
export interface SourceResult {
  sourceId:   string;
  sourceName: string;
  jobCount:   number;
  /** Set when the source failed — used to populate last_error in the DB */
  error?: string;
}

/**
 * What fetchJobs() returns — jobs plus one SourceResult per employer source.
 */
export interface AdapterFetchResult {
  jobs:          NormalizedJob[];
  sourceResults: SourceResult[];
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
  /** Fetch all current jobs from this source and return normalized records + per-source health. */
  fetchJobs(): Promise<AdapterFetchResult>;
}

export interface RefreshResult {
  ok: boolean;
  fetched: number;
  upserted: number;
  skippedIrrelevant: number;
  skippedStale: number;
  skippedNonCanada: number;
  sourceReport?: SourceReport;
  error?: string;
  envErrors?: string[];
}

/** Summary of source health after a pipeline run — logged + returned in API response. */
export interface SourceReport {
  totalSources:      number;
  healthySources:    number;
  failedSources:     number;
  newlyDeactivated:  number;
  byPlatform: Record<string, { active: number; failed: number }>;
  failures: Array<{ name: string; platform: string; error: string }>;
}
