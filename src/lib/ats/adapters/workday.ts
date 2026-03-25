/**
 * Workday CXS (Candidate Experience Service) adapter.
 *
 * Uses the undocumented but widely reverse-engineered CXS API that powers
 * every Workday career site. No authentication required for public postings.
 *
 * Endpoint pattern:
 *   POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{board}/jobs
 *
 * Apply URL pattern:
 *   https://{tenant}.wd{N}.myworkdayjobs.com{externalPath}
 *
 * Date field: "postedOn" is a relative string ("Posted 3 Days Ago").
 * "Posted 30+ Days Ago" is mapped to -31 days so the freshness filter rejects it.
 *
 * Description: the list API does not return job descriptions.
 * The BA filter handles null descriptions as follows:
 *   - Core BA title (e.g. "Business Analyst") → passes without description
 *   - Borderline title (e.g. "Systems Analyst") → requires description; rejected
 * This is correct: a job explicitly titled "Business Analyst" at RBC or TD
 * is conclusive. A borderline title without description context is ambiguous.
 */

import type { JobAdapter, NormalizedJob, AdapterFetchResult, SourceResult } from "../types";
import type { EmployerSource } from "../registry";
import { cleanText, cleanTitle } from "../clean";

interface WorkdayListRequest {
  appliedFacets: Record<string, never>;
  limit: number;
  offset: number;
  searchText: string;
}

interface WorkdayJobPosting {
  title?: string;
  locationsText?: string;
  postedOn?: string;
  externalPath?: string;
  bulletFields?: string[];
  jobPostingId?: string;
}

interface WorkdayListResponse {
  total: number;
  jobPostings: WorkdayJobPosting[];
}

const PAGE_SIZE = 20;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2_000;
const PAGE_DELAY_MS = 150; // polite pause between pages

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse Workday's relative date string to an ISO-8601 timestamp.
 * "Posted 30+ Days Ago" → 31 days ago (stale → freshness filter rejects it).
 */
export function parseWorkdayDate(postedOn: string | undefined): string {
  const now = new Date();
  if (!postedOn) return now.toISOString();

  const lower = postedOn.toLowerCase().trim();

  if (lower.includes("today"))     return now.toISOString();
  if (lower.includes("yesterday")) { now.setDate(now.getDate() - 1); return now.toISOString(); }

  // "30+ Days Ago" — mark as stale so the freshness filter drops it
  if (lower.includes("30+")) {
    now.setDate(now.getDate() - 31);
    return now.toISOString();
  }

  const match = lower.match(/(\d+)\s*days?\s*ago/);
  if (match) {
    now.setDate(now.getDate() - parseInt(match[1], 10));
    return now.toISOString();
  }

  return now.toISOString();
}

export class WorkdayAdapter implements JobAdapter {
  readonly name = "Workday";
  readonly source_type = "workday";

  constructor(private readonly sources: EmployerSource[]) {}

  async fetchJobs(): Promise<AdapterFetchResult> {
    const jobs: NormalizedJob[] = [];
    const sourceResults: SourceResult[] = [];

    for (const source of this.sources) {
      if (!source.tenant || source.wd_num == null || !source.board_name) {
        console.warn(
          `[Workday] ${source.name} — missing tenant/wd_num/board_name, skipping`
        );
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: 0, error: "Missing tenant/wd_num/board_name config" });
        continue;
      }

      try {
        const fetched = await this.fetchCompanyJobs(source);
        jobs.push(...fetched);
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: fetched.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Workday] Error fetching ${source.name}:`, err);
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: 0, error: msg });
      }
    }

    console.log(`[Workday] Total raw jobs fetched: ${jobs.length}`);
    return { jobs, sourceResults };
  }

  private async fetchCompanyJobs(source: EmployerSource): Promise<NormalizedJob[]> {
    const { tenant, wd_num, board_name, name } = source;
    const baseUrl  = `https://${tenant}.wd${wd_num}.myworkdayjobs.com`;
    const endpoint = `${baseUrl}/wday/cxs/${tenant}/${board_name}/jobs`;

    const results: NormalizedJob[] = [];
    let offset = 0;
    let total  = Infinity; // will be set on first response

    while (offset < total) {
      const body: WorkdayListRequest = {
        appliedFacets: {} as Record<string, never>,
        limit:      PAGE_SIZE,
        offset,
        searchText: "analyst",   // narrows results; BA filter still applies downstream
      };

      const data = await this.postWithRetry(endpoint, body);
      if (!data) break;

      total = data.total ?? 0;
      const postings = data.jobPostings ?? [];

      if (postings.length === 0) break;

      for (const job of postings) {
        if (!job.title || !job.externalPath) continue;

        results.push({
          title:       cleanTitle(job.title),
          company:     name,
          location:    cleanText(job.locationsText) ?? null,
          apply_url:   `${baseUrl}${job.externalPath}`,
          description: null, // not available in CXS list response
          posted_at:   parseWorkdayDate(job.postedOn),
          source_name: name,
          source_type: "workday",
          source_slug: tenant,
          is_ba_relevant: false,
        });
      }

      offset += PAGE_SIZE;
      if (offset < total) await sleep(PAGE_DELAY_MS);
    }

    console.log(`[Workday] ${name}: ${results.length} postings (${total} total on board)`);
    return results;
  }

  private async postWithRetry(
    url: string,
    body: WorkdayListRequest,
    attempt = 1
  ): Promise<WorkdayListResponse | null> {
    try {
      const res = await fetch(url, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept":        "application/json",
          "User-Agent":    "Mozilla/5.0 (compatible; BrainWave/1.0; +https://thebaportal.com)",
        },
        body:  JSON.stringify(body),
        cache: "no-store",
      });

      // Rate limit or transient server error — back off and retry
      if (res.status === 429 || res.status === 503) {
        if (attempt > MAX_RETRIES) {
          console.warn(`[Workday] ${url} — gave up after ${MAX_RETRIES} retries (${res.status})`);
          return null;
        }
        const wait = BASE_BACKOFF_MS * attempt;
        console.warn(`[Workday] ${res.status} — retrying in ${wait}ms (attempt ${attempt})`);
        await sleep(wait);
        return this.postWithRetry(url, body, attempt + 1);
      }

      if (res.status === 404) {
        console.warn(`[Workday] 404 at ${url} — board name or tenant may be wrong`);
        return null;
      }

      if (!res.ok) {
        console.warn(`[Workday] HTTP ${res.status} at ${url}`);
        return null;
      }

      return (await res.json()) as WorkdayListResponse;

    } catch (err) {
      if (attempt <= MAX_RETRIES) {
        const wait = BASE_BACKOFF_MS * attempt;
        console.warn(`[Workday] Network error — retrying in ${wait}ms (attempt ${attempt})`);
        await sleep(wait);
        return this.postWithRetry(url, body, attempt + 1);
      }
      throw err;
    }
  }
}
