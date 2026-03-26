/**
 * Fantastic Jobs API adapter.
 *
 * Fetches BA jobs in Canada directly from employer ATS platforms via
 * the Fantastic Jobs aggregation API (fantastic.jobs).
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 * 1. Sign up at https://fantastic.jobs (RapidAPI or Apify plan)
 * 2. Add to Vercel environment variables:
 *
 *    FANTASTIC_JOBS_API_KEY   = your RapidAPI or direct API key
 *    FANTASTIC_JOBS_API_HOST  = job-postings-from-company-career-sites.p.rapidapi.com
 *                               (leave blank if using direct fantastic.jobs key)
 *
 * ── Free plan limits ─────────────────────────────────────────────────────────
 * - 25 jobs per request
 * - Fetch every 3 days (cron schedule: 0 7 every-3-days)
 * - Canada + BA keywords + last 7 days filter
 *
 * ── Apply URLs ───────────────────────────────────────────────────────────────
 * Fantastic Jobs returns DIRECT ATS URLs (Greenhouse, Lever, iCIMS, etc.)
 * not aggregator redirects. Each URL is verified at ingest by verifyUrl.ts.
 */

import type { NormalizedJob } from "../types";

// ── Response shape from Fantastic Jobs API ───────────────────────────────────
// Field names below are the most common — confirm against your plan's docs.
// If a field is named differently in the real response, update the mapper below.

interface FJJob {
  id?:              string | number;
  title?:           string;
  job_title?:       string;              // alternate field name
  company_name?:    string;
  company?:         string;             // alternate
  location?:        string;
  city?:            string;
  country?:         string;
  description?:     string;
  job_description?: string;             // alternate
  apply_url?:       string;
  url?:             string;             // alternate
  job_url?:         string;             // alternate
  date_posted?:     string;
  posted_at?:       string;             // alternate
  created_at?:      string;             // alternate
  source?:          string;             // 'greenhouse' | 'lever' | 'icims' | etc.
  ats?:             string;             // alternate
  company_url?:     string;             // employer careers page
  careers_url?:     string;             // alternate
}

interface FJResponse {
  jobs?:    FJJob[];
  results?: FJJob[];
  data?:    FJJob[];
  total?:   number;
  count?:   number;
}

// ── Fallback careers pages per company ───────────────────────────────────────
// Used when a job's apply_url is missing or invalid.
// Add more as needed.
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
};

// ── Field normalizers ─────────────────────────────────────────────────────────

function extractTitle(j: FJJob): string | null {
  return j.title ?? j.job_title ?? null;
}

function extractCompany(j: FJJob): string | null {
  return j.company_name ?? j.company ?? null;
}

function extractLocation(j: FJJob): string | null {
  if (j.location) return j.location;
  const parts = [j.city, j.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractDescription(j: FJJob): string | null {
  return j.description ?? j.job_description ?? null;
}

function extractApplyUrl(j: FJJob): string | null {
  return j.apply_url ?? j.url ?? j.job_url ?? null;
}

function extractPostedAt(j: FJJob): string {
  const raw = j.date_posted ?? j.posted_at ?? j.created_at;
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function extractSourceType(j: FJJob): string {
  return (j.source ?? j.ats ?? "fantastic_jobs").toLowerCase();
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export interface FJFetchResult {
  jobs:      NormalizedJob[];
  total:     number;
  apiCalled: boolean;
  error?:    string;
}

export async function fetchFantasticJobs(): Promise<FJFetchResult> {
  const apiKey  = process.env.FANTASTIC_JOBS_API_KEY;
  const apiHost = process.env.FANTASTIC_JOBS_API_HOST;

  if (!apiKey) {
    console.warn("[FantasticJobs] FANTASTIC_JOBS_API_KEY not set — skipping");
    return { jobs: [], total: 0, apiCalled: false, error: "API key not configured" };
  }

  // ── Build request ──────────────────────────────────────────────────────────
  // Two separate calls: one for "Business Analyst", one for "Systems Analyst"
  // to maximise relevant results within the 25-job limit.
  const allJobs: NormalizedJob[] = [];
  const keywords = ["Business Analyst", "Systems Analyst"];

  for (const keyword of keywords) {
    try {
      const jobs = await fetchKeyword(apiKey, apiHost ?? null, keyword);
      allJobs.push(...jobs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[FantasticJobs] Error fetching "${keyword}":`, msg);
    }
  }

  // Deduplicate across the two keyword calls by apply_url
  const seen = new Set<string>();
  const unique = allJobs.filter(j => {
    const key = j.apply_url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[FantasticJobs] ${unique.length} unique jobs across ${keywords.length} keyword queries`);
  return { jobs: unique, total: unique.length, apiCalled: true };
}

async function fetchKeyword(
  apiKey:  string,
  apiHost: string | null,
  keyword: string,
): Promise<NormalizedJob[]> {

  // ── RapidAPI endpoint ──────────────────────────────────────────────────────
  // If you are using a direct fantastic.jobs key (not RapidAPI), change the
  // base URL to the one shown in your dashboard and adjust the auth header.
  const host    = apiHost ?? "job-postings-from-company-career-sites.p.rapidapi.com";
  const baseUrl = `https://${host}/jobs`;

  const params = new URLSearchParams({
    query:   keyword,
    country: "CA",             // Canada only
    days:    "7",              // last 7 days
    limit:   "25",             // free plan cap
  });

  const headers: Record<string, string> = {
    "Accept":           "application/json",
    "X-RapidAPI-Key":   apiKey,
    "X-RapidAPI-Host":  host,
  };

  console.log(`[FantasticJobs] Fetching: ${keyword} / Canada / last 7 days`);

  const res = await fetch(`${baseUrl}?${params}`, {
    headers,
    cache:  "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  }

  const body: FJResponse = await res.json();

  // Handle different response shapes
  const raw: FJJob[] = body.jobs ?? body.results ?? body.data ?? [];
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log(`[FantasticJobs] No jobs returned for "${keyword}"`);
    return [];
  }

  const results: NormalizedJob[] = [];

  for (const j of raw) {
    const title    = extractTitle(j);
    const applyUrl = extractApplyUrl(j);
    const company  = extractCompany(j);

    if (!title || !applyUrl) continue;

    // Fallback careers URL from known map
    const fallbackUrl = company ? (CAREERS_FALLBACK[company] ?? null) : null;

    results.push({
      title:          title,
      company:        company ?? "Unknown",
      location:       extractLocation(j),
      apply_url:      applyUrl,
      description:    extractDescription(j),
      posted_at:      extractPostedAt(j),
      source_name:    company ?? "Fantastic Jobs",
      source_type:    extractSourceType(j),
      source_slug:    j.company_url ?? j.careers_url ?? fallbackUrl ?? null, // repurposed as careers fallback
      is_ba_relevant: false,   // checked by BA filter in fantasyRefresh
    });
  }

  console.log(`[FantasticJobs] "${keyword}": ${results.length} jobs`);
  return results;
}
