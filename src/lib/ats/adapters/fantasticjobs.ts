/**
 * Active Jobs DB adapter (via RapidAPI).
 *
 * API: https://rapidapi.com/fantastic-jobs-fantastic-jobs-default/api/active-jobs-db
 * Endpoint: GET /active-ats-7d  (jobs posted in the last 7 days, direct ATS links)
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 * Add to Vercel environment variables:
 *   FANTASTIC_JOBS_API_KEY  = your RapidAPI key
 *   FANTASTIC_JOBS_API_HOST = active-jobs-db.p.rapidapi.com
 *
 * ── Free plan limits ─────────────────────────────────────────────────────────
 * Fetch every 3 days (cron: 0 7 every-3-days). Max 25 results per call.
 */

import type { NormalizedJob } from "../types";

// ── Response shape from active-jobs-db ───────────────────────────────────────
// The API returns an array of job objects directly (not wrapped in a key).

interface AJDJob {
  // Core fields (most likely names based on API docs)
  id?:                   string | number;
  title?:                string;
  job_title?:            string;
  organization?:         string;   // company name
  company?:              string;
  company_name?:         string;
  locations_derived?:    string[]; // array: ["Toronto, ON, Canada"]
  location?:             string;
  city?:                 string;
  country?:              string;
  description_text?:     string;   // plain text description
  description?:          string;
  job_description?:      string;
  url?:                  string;   // direct ATS apply link
  apply_url?:            string;
  job_url?:              string;
  date_posted?:          string;   // ISO date string
  posted_at?:            string;
  created_at?:           string;
  source?:               string;   // 'greenhouse' | 'lever' | 'icims' | etc.
  ats?:                  string;
  company_url?:          string;
  careers_url?:          string;
}

// ── Careers page fallbacks ────────────────────────────────────────────────────

const CAREERS_FALLBACK: Record<string, string> = {
  "RBC":              "https://jobs.rbc.com",
  "TD Bank":          "https://jobs.td.com",
  "BMO":              "https://bmo.wd3.myworkdayjobs.com/en-US/External",
  "CIBC":             "https://cibc.wd3.myworkdayjobs.com/en-US/search",
  "Scotiabank":       "https://jobs.scotiabank.com",
  "Manulife":         "https://manulife.wd3.myworkdayjobs.com/en-US/MFCJH_Jobs",
  "Sun Life":         "https://sunlife.wd3.myworkdayjobs.com/en-US/SunLife",
  "Bell":             "https://jobs.bell.ca",
  "Rogers":           "https://jobs.rogers.com",
  "Telus":            "https://www.telus.com/en/about/careers",
  "CGI Group":        "https://www.cgi.com/en/careers",
  "Deloitte":         "https://deloitte.com/ca/en/careers.html",
  "KPMG Canada":      "https://home.kpmg/ca/en/home/careers.html",
  "EY Canada":        "https://www.ey.com/en_ca/careers",
  "PwC Canada":       "https://www.pwc.com/ca/en/careers.html",
  "Shopify":          "https://www.shopify.com/careers",
  "OpenText":         "https://careers.opentext.com",
  "Intact Insurance": "https://careers.intact.ca",
};

// ── Field normalizers ─────────────────────────────────────────────────────────

function extractTitle(j: AJDJob): string | null {
  return j.title ?? j.job_title ?? null;
}

function extractCompany(j: AJDJob): string | null {
  return j.organization ?? j.company_name ?? j.company ?? null;
}

function extractLocation(j: AJDJob): string | null {
  // locations_derived is an array — take the first entry
  if (j.locations_derived?.length) return j.locations_derived[0];
  if (j.location) return j.location;
  const parts = [j.city, j.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractDescription(j: AJDJob): string | null {
  return j.description_text ?? j.description ?? j.job_description ?? null;
}

function extractApplyUrl(j: AJDJob): string | null {
  return j.url ?? j.apply_url ?? j.job_url ?? null;
}

function extractPostedAt(j: AJDJob): string {
  const raw = j.date_posted ?? j.posted_at ?? j.created_at;
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function extractSourceType(j: AJDJob): string {
  return (j.source ?? j.ats ?? "active_jobs_db").toLowerCase();
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export interface FJFetchResult {
  jobs:      NormalizedJob[];
  total:     number;
  apiCalled: boolean;
  error?:    string;
}

export async function fetchFantasticJobs(): Promise<FJFetchResult> {
  const apiKey  = process.env.FANTASTIC_JOBS_API_KEY;
  const apiHost = process.env.FANTASTIC_JOBS_API_HOST ?? "active-jobs-db.p.rapidapi.com";

  if (!apiKey) {
    console.warn("[FantasticJobs] FANTASTIC_JOBS_API_KEY not set — skipping");
    return { jobs: [], total: 0, apiCalled: false, error: "API key not configured" };
  }

  // Title filter: all BA-relevant titles in one request using OR syntax
  // (same syntax as location_filter in the curl example)
  const titleFilter = [
    '"Business Analyst"',
    '"Systems Analyst"',
    '"Business Systems Analyst"',
    '"Functional Analyst"',
    '"Solutions Analyst"',
    '"Process Analyst"',
  ].join(" OR ");

  const params = new URLSearchParams({
    limit:            "25",
    offset:           "0",
    title_filter:     titleFilter,
    location_filter:  '"Canada"',
    description_type: "text",
  });

  const url = `https://${apiHost}/active-ats-7d?${params}`;
  console.log(`[FantasticJobs] GET ${url.replace(apiKey, "***")}`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-key":  apiKey,
        "x-rapidapi-host": apiHost,
      },
      cache:  "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} — ${res.statusText}. Body: ${body.slice(0, 200)}`);
    }

    // API returns array directly OR wrapped in a key — handle both
    const body = await res.json();
    const raw: AJDJob[] = Array.isArray(body)
      ? body
      : (body.jobs ?? body.results ?? body.data ?? body.items ?? []);

    console.log(`[FantasticJobs] ${raw.length} raw jobs returned`);

    const results: NormalizedJob[] = [];
    for (const j of raw) {
      const title    = extractTitle(j);
      const applyUrl = extractApplyUrl(j);
      const company  = extractCompany(j);
      if (!title || !applyUrl) continue;

      const fallback = company ? (CAREERS_FALLBACK[company] ?? null) : null;

      results.push({
        title:          title,
        company:        company ?? "Unknown",
        location:       extractLocation(j),
        apply_url:      applyUrl,
        description:    extractDescription(j),
        posted_at:      extractPostedAt(j),
        source_name:    company ?? "Active Jobs DB",
        source_type:    extractSourceType(j),
        // Repurpose source_slug to carry the careers fallback URL through the pipeline
        source_slug:    j.company_url ?? j.careers_url ?? fallback ?? null,
        is_ba_relevant: false,
      });
    }

    console.log(`[FantasticJobs] ${results.length} jobs with title+URL`);
    return { jobs: results, total: results.length, apiCalled: true };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[FantasticJobs] Fetch error:", msg);
    return { jobs: [], total: 0, apiCalled: true, error: msg };
  }
}
