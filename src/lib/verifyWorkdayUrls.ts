/**
 * Workday URL verification service.
 *
 * Workday stitches job URLs from tenant domain + externalPath. The resulting
 * link looks valid but can silently redirect to community.workday.com/invalid-url
 * when a job has been closed or the board config is wrong. This service verifies
 * each URL with a real HTTP request before we publish an Apply button.
 *
 * Called by:
 *   - /api/jobs/verify  (cron at 7am — after 6am refresh)
 *   - Can also be triggered manually from Vercel dashboard
 */

import { createClient } from "@supabase/supabase-js";
import { recordSourceFailure } from "./ats/registry";

// Known employer careers pages — used as first fallback when a Workday URL is invalid.
const CAREERS_FALLBACK: Record<string, string> = {
  "RBC":      "https://jobs.rbc.com",
  "TD Bank":  "https://jobs.td.com",
  "BMO":      "https://bmo.wd3.myworkdayjobs.com/en-US/External",
  "CIBC":     "https://cibc.wd3.myworkdayjobs.com/en-US/search",
  "Manulife": "https://manulife.wd3.myworkdayjobs.com/en-US/MFCJH_Jobs",
};

/**
 * Follow redirects and check whether the final URL is Workday's invalid-job placeholder.
 *
 * We ONLY mark a URL invalid when we positively detect the community.workday.com redirect —
 * that is the single failure mode we care about. HTTP errors (403 bot-detection, timeouts,
 * network failures from Vercel IPs) are treated as "valid" so we don't falsely suppress
 * real job links just because Workday blocked our server-side probe.
 */
async function checkUrl(url: string): Promise<"valid" | "invalid"> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });

    const finalUrl = res.url.toLowerCase();
    if (finalUrl.includes("community.workday.com")) return "invalid";
    if (finalUrl.includes("invalid-url"))           return "invalid";
    if (finalUrl.includes("invalid_url"))           return "invalid";
    // 403 / 429 / 5xx = Workday bot-blocking our probe, not an invalid URL — treat as valid.
    return "valid";
  } catch {
    // Timeout or network error from Vercel IPs — give benefit of the doubt.
    return "valid";
  }
}

/** Build the best available fallback URL for a job with an invalid Workday link. */
function fallbackUrl(company: string, title: string, location: string | null): string {
  const known = CAREERS_FALLBACK[company];
  if (known) return known;
  const q = encodeURIComponent([title, company, location].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${q}`;
}

/** Run `fn` over `items` with at most `concurrency` tasks in flight at a time. */
async function runBatch<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency = 8
): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item !== undefined) await fn(item);
      }
    })
  );
}

export interface VerifyResult {
  checked:         number;
  valid:           number;
  invalid:         number;
  sourcesDisabled: number;
}

export async function verifyWorkdayUrls(): Promise<VerifyResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all Workday jobs that need verification.
  const { data: jobs, error } = await supabase
    .from("job_listings")
    .select("id, apply_url, raw_apply_url, company, title, location")
    .eq("source_type", "workday")
    .in("apply_url_status", ["pending", "unverified"]);

  if (error || !jobs || jobs.length === 0) {
    if (error) console.error("[verifyWorkday] Query error:", error.message);
    else       console.log("[verifyWorkday] No pending Workday URLs to verify");
    return { checked: 0, valid: 0, invalid: 0, sourcesDisabled: 0 };
  }

  console.log(`[verifyWorkday] Checking ${jobs.length} Workday URLs (8 concurrent)…`);

  let valid           = 0;
  let invalid         = 0;
  const invalidByCompany = new Map<string, number>();
  const totalByCompany   = new Map<string, number>();

  for (const job of jobs) {
    const company = job.company ?? "unknown";
    totalByCompany.set(company, (totalByCompany.get(company) ?? 0) + 1);
  }

  await runBatch(jobs, async (job) => {
    const url     = (job.raw_apply_url || job.apply_url) as string | null;
    const company = (job.company ?? "unknown") as string;
    const now     = new Date().toISOString();

    if (!url) {
      invalid++;
      invalidByCompany.set(company, (invalidByCompany.get(company) ?? 0) + 1);
      await supabase
        .from("job_listings")
        .update({
          apply_url_status:   "invalid",
          verified_apply_url: fallbackUrl(company, job.title, job.location),
          last_verified_at:   now,
        })
        .eq("id", job.id);
      return;
    }

    const status = await checkUrl(url);

    if (status === "valid") {
      valid++;
      await supabase
        .from("job_listings")
        .update({
          apply_url_status:   "valid",
          verified_apply_url: url,
          last_verified_at:   now,
        })
        .eq("id", job.id);
    } else {
      invalid++;
      invalidByCompany.set(company, (invalidByCompany.get(company) ?? 0) + 1);
      await supabase
        .from("job_listings")
        .update({
          apply_url_status:   "invalid",
          verified_apply_url: fallbackUrl(company, job.title, job.location),
          last_verified_at:   now,
        })
        .eq("id", job.id);
    }
  });

  // If every job from a Workday source failed verification, record a source failure.
  // Three consecutive runs with 100% failure → auto-deactivate the source.
  let sourcesDisabled = 0;
  for (const [company, invalidCount] of invalidByCompany.entries()) {
    const total = totalByCompany.get(company) ?? 0;
    if (total > 0 && invalidCount === total) {
      console.warn(
        `[verifyWorkday] ${company}: all ${total} jobs failed verification — recording source failure`
      );
      const { data: source } = await supabase
        .from("employer_sources")
        .select("id")
        .eq("name", company)
        .eq("platform", "workday")
        .single();

      if (source) {
        const deactivated = await recordSourceFailure(
          supabase,
          source.id,
          company,
          "All fetched jobs failed URL verification — check tenant + board_name config"
        );
        if (deactivated) {
          sourcesDisabled++;
          console.warn(`[verifyWorkday] ${company} deactivated after 3 consecutive full-failure runs`);
        }
      }
    }
  }

  console.log(
    `[verifyWorkday] Done — ${valid} valid, ${invalid} invalid, ${sourcesDisabled} source(s) disabled`
  );
  return { checked: jobs.length, valid, invalid, sourcesDisabled };
}
