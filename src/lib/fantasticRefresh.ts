/**
 * Fantastic Jobs refresh pipeline.
 *
 * Fetches up to 25 BA jobs in Canada from the Fantastic Jobs API,
 * verifies every apply URL before saving, and upserts to job_listings.
 * Old jobs are pruned after 10 days (same window as the main refresh).
 *
 * Called by:
 *   POST /api/jobs/fantastic-refresh  (cron every 3 days at 6am)
 *   GET  /api/jobs/fantastic-refresh  (manual trigger)
 *
 * Env vars required:
 *   FANTASTIC_JOBS_API_KEY   — from RapidAPI or fantastic.jobs dashboard
 *   FANTASTIC_JOBS_API_HOST  — RapidAPI host (leave unset for direct key)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient }           from "@supabase/supabase-js";
import { fetchFantasticJobs }     from "./ats/adapters/fantasticjobs";
// Env: FANTASTIC_JOBS_API_KEY + FANTASTIC_JOBS_API_HOST = active-jobs-db.p.rapidapi.com
import { checkUrl, runConcurrent } from "./verifyUrl";
import { checkBaRelevance }        from "./ats/filter";
import { isCanadianLocation }      from "./ats/location";
import { normalizeForDedup }       from "./ats/clean";

interface PrepLink { label: string; href: string }

// ── Prep links ────────────────────────────────────────────────────────────────

function getPrep(title: string, desc: string): PrepLink[] {
  const t = (title + " " + desc).toLowerCase();
  const prep: PrepLink[] = [];

  if (/agile|scrum|sprint|backlog|kanban/.test(t))
    prep.push({ label: "Agile BA Challenge", href: "/scenarios" });
  if (/requirements|user stor|use case|brd|frd|elicitation/.test(t))
    prep.push({ label: "Requirements Challenge", href: "/scenarios" });
  if (/stakeholder|workshop|facilitat/.test(t))
    prep.push({ label: "Stakeholder Interview Sim", href: "/scenarios" });
  if (/cbap|ccba|pmi.pba|iiba|certification/.test(t))
    prep.push({ label: "Exam Prep", href: "/exam" });
  if (/\bdata\b|analytics|reporting|business intelligence|\bbi\b/.test(t))
    prep.push({ label: "Data Analysis Challenge", href: "/scenarios" });
  if (/process|workflow|bpmn|swimlane|mapping/.test(t))
    prep.push({ label: "Process Mapping Challenge", href: "/scenarios" });

  if (prep.length === 0 && /analyst/.test(t)) {
    prep.push({ label: "Requirements Challenge",    href: "/scenarios" });
    prep.push({ label: "Stakeholder Interview Sim", href: "/scenarios" });
  }

  const seen    = new Set<string>();
  const deduped = prep.filter(p => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  }).slice(0, 2);

  deduped.push({ label: "Career Suite", href: "/career" });
  return deduped;
}

// ── Quality score ─────────────────────────────────────────────────────────────

function qualityScore(title: string, company: string | null, location: string | null, description: string | null, postedAt: string): number {
  let score = 0;
  const days = (Date.now() - new Date(postedAt).getTime()) / 86_400_000;
  if (days <= 1)       score += 40;
  else if (days <= 3)  score += 30;
  else if (days <= 7)  score += 20;
  else if (days <= 14) score += 10;

  const len = (description ?? "").length;
  if (len > 500)       score += 30;
  else if (len > 200)  score += 20;
  else if (len > 50)   score += 10;

  if (company)   score += 10;
  if (location)  score += 10;
  score += 10; // apply_url always present (filtered out below if missing)

  return score;
}

function detectWorkType(title: string, desc: string): "remote" | "hybrid" | "onsite" {
  const t = (title + " " + desc).toLowerCase();
  if (/\bremote\b/.test(t))  return "remote";
  if (/\bhybrid\b/.test(t))  return "hybrid";
  return "onsite";
}

function detectLevel(title: string, desc: string): "entry" | "junior" | "mid" | "senior" {
  const t = (title + " " + desc).toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(t))             return "senior";
  if (/\b(junior|jr\.?|entry.?level|associate|new.?grad)\b/.test(t)) return "entry";
  return "mid";
}

// ── Careers page fallback map ─────────────────────────────────────────────────
// When a job's apply_url fails verification, we send the user here instead.

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
  "Intact Insurance": "https://careers.intact.ca",
  "Shopify":          "https://www.shopify.com/careers",
  "OpenText":         "https://careers.opentext.com",
};

function buildFallback(company: string | null, title: string, location: string | null, careersSlug: string | null): string {
  // 1. Explicit careers slug passed from the API response
  if (careersSlug && careersSlug.startsWith("http")) return careersSlug;
  // 2. Known employer map
  if (company && CAREERS_FALLBACK[company]) return CAREERS_FALLBACK[company];
  // 3. Google search
  const q = encodeURIComponent([title, company, "Canada", "business analyst"].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${q}`;
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface FantasticRefreshResult {
  ok:             boolean;
  fetched:        number;
  verified:       number;
  invalid:        number;
  upserted:       number;
  skippedFilters: number;
  error?:         string;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function runFantasticRefresh(): Promise<FantasticRefreshResult> {
  console.log("[fantasticRefresh] ── START ──────────────────────────────────");

  const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    const err = "Missing SUPABASE env vars";
    console.error("[fantasticRefresh]", err);
    return { ok: false, fetched: 0, verified: 0, invalid: 0, upserted: 0, skippedFilters: 0, error: err };
  }

  // ── 1. Fetch from Fantastic Jobs API ────────────────────────────────────────
  const { jobs: rawJobs, apiCalled, error: apiError } = await fetchFantasticJobs();
  if (!apiCalled) {
    return { ok: false, fetched: 0, verified: 0, invalid: 0, upserted: 0, skippedFilters: 0, error: apiError };
  }
  console.log(`[fantasticRefresh] ${rawJobs.length} raw jobs from API`);

  // ── 2. Canada + BA relevance filters ────────────────────────────────────────
  let skippedFilters = 0;
  const filteredJobs = rawJobs.filter(job => {
    if (!isCanadianLocation(job.location)) { skippedFilters++; return false; }
    const result = checkBaRelevance(job);
    if (!result.relevant) { skippedFilters++; return false; }
    return true;
  });
  console.log(`[fantasticRefresh] ${filteredJobs.length} after Canada+BA filter (${skippedFilters} dropped)`);

  if (filteredJobs.length === 0) {
    return { ok: true, fetched: rawJobs.length, verified: 0, invalid: 0, upserted: 0, skippedFilters };
  }

  // ── 3. Verify every apply URL before publishing ──────────────────────────────
  // With max ~50 jobs (25 per keyword × 2 keywords, deduped) this is fast.
  const now = new Date().toISOString();

  type VerifiedJob = {
    job:               typeof filteredJobs[0];
    apply_url_status:  "valid" | "invalid";
    verified_apply_url: string;
    final_redirect_url: string;
  };

  const verifiedJobs: VerifiedJob[] = [];
  let verified = 0;
  let invalid  = 0;

  await runConcurrent(filteredJobs, async (job) => {
    const check = await checkUrl(job.apply_url);
    if (check.status === "valid") {
      verified++;
      verifiedJobs.push({
        job,
        apply_url_status:   "valid",
        verified_apply_url: check.final_url || job.apply_url,
        final_redirect_url: check.final_url || job.apply_url,
      });
    } else {
      invalid++;
      // Invalid URL — build best fallback (careers page or Google)
      // source_slug is repurposed to carry the careers_url from the API response
      const fallback = buildFallback(job.company, job.title, job.location, job.source_slug);
      verifiedJobs.push({
        job,
        apply_url_status:   "invalid",
        verified_apply_url: fallback,
        final_redirect_url: check.final_url || job.apply_url,
      });
    }
  }, 8);

  console.log(`[fantasticRefresh] URL check: ${verified} valid, ${invalid} invalid`);

  // ── 4. Only publish jobs with VALID direct links ─────────────────────────────
  // Invalid-URL jobs are excluded entirely — don't show broken Apply buttons.
  const publishable = verifiedJobs.filter(v => v.apply_url_status === "valid");
  console.log(`[fantasticRefresh] ${publishable.length} publishable (valid link)`);

  if (publishable.length === 0) {
    return { ok: true, fetched: rawJobs.length, verified, invalid, upserted: 0, skippedFilters };
  }

  // ── 5. Build rows ─────────────────────────────────────────────────────────────
  const rows = publishable.map(({ job, apply_url_status, verified_apply_url, final_redirect_url }) => ({
    dedup_key:          `${normalizeForDedup(job.title)}::${job.company.toLowerCase()}`,
    title:              job.title,
    company:            job.company || null,
    location:           job.location,
    apply_url:          job.apply_url,
    url:                job.apply_url,
    description:        job.description,
    posted_at:          job.posted_at,
    source_name:        job.source_name,
    source_type:        job.source_type,
    source_slug:        null,                       // cleared — was repurposed temporarily
    is_ba_relevant:     true,
    work_type:          detectWorkType(job.title, job.description ?? ""),
    level:              detectLevel(job.title, job.description ?? ""),
    quality_score:      qualityScore(job.title, job.company, job.location, job.description, job.posted_at),
    prep_links:         getPrep(job.title, job.description ?? ""),
    updated_at:         now,
    raw_apply_url:      job.apply_url,
    verified_apply_url,
    apply_url_status,
    final_redirect_url,
    last_verified_at:   now,
    adzuna_id:          null,
    salary_min:         null,
    salary_max:         null,
  }));

  // Dedup within batch — keep first (highest fetch order = most relevant keyword)
  const dedupeMap = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    if (!dedupeMap.has(row.dedup_key)) dedupeMap.set(row.dedup_key, row);
  }
  const dedupedRows = Array.from(dedupeMap.values());
  console.log(`[fantasticRefresh] ${dedupedRows.length} unique rows after dedup`);

  // ── 6. Upsert — keep existing jobs, don't wipe the 10-day window ─────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    db:   { schema: "public" },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: upsertError } = await supabase
    .from("job_listings")
    .upsert(dedupedRows, { onConflict: "dedup_key" });

  if (upsertError) {
    console.error("[fantasticRefresh] Upsert failed:", upsertError.message);
    return { ok: false, fetched: rawJobs.length, verified, invalid, upserted: 0, skippedFilters, error: upsertError.message };
  }

  // ── 7. Prune jobs older than 10 days ─────────────────────────────────────────
  const pruneDate = new Date();
  pruneDate.setDate(pruneDate.getDate() - 10);
  await supabase.from("job_listings").delete().lt("posted_at", pruneDate.toISOString());

  console.log(`[fantasticRefresh] ── DONE — ${dedupedRows.length} upserted ──`);
  return { ok: true, fetched: rawJobs.length, verified, invalid, upserted: dedupedRows.length, skippedFilters };
}
