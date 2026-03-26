/**
 * Lightweight URL verifier used at ingest time.
 *
 * Only marks a URL "invalid" when we positively detect a known error pattern
 * (community.workday.com redirect, explicit 404/410, etc.).
 * Network errors and bot-blocking (403/429) are treated as "valid" so we
 * don't falsely suppress real job links just because a server blocks our probe.
 *
 * With 25 jobs per fetch, verifying inline is cheap — no separate cron needed.
 */

export interface UrlCheckResult {
  status:      "valid" | "invalid";
  final_url:   string;
  http_status: number | null;
}

/** URL patterns that positively identify a broken/expired job link. */
const INVALID_PATTERNS = [
  "community.workday.com",
  "invalid-url",
  "invalid_url",
  "job-not-found",
  "jobs/not-found",
  "error/404",
  "pagenotfound",
];

export async function checkUrl(url: string): Promise<UrlCheckResult> {
  if (!url) return { status: "invalid", final_url: "", http_status: null };

  try {
    const res = await fetch(url, {
      method:   "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":     "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });

    const finalUrl = res.url || url;
    const lower    = finalUrl.toLowerCase();

    // Positive match on a known-bad redirect → definitely invalid
    if (INVALID_PATTERNS.some(p => lower.includes(p))) {
      return { status: "invalid", final_url: finalUrl, http_status: res.status };
    }

    // Hard 404/410 (page gone) → invalid
    if (res.status === 404 || res.status === 410) {
      return { status: "invalid", final_url: finalUrl, http_status: res.status };
    }

    // 403/429 = bot-blocking, not a dead link — trust it
    // 2xx/3xx = clearly valid
    // 5xx = server issue, not the job's fault — trust it
    return { status: "valid", final_url: finalUrl, http_status: res.status };

  } catch {
    // Timeout or network error from Vercel IPs → give benefit of the doubt
    return { status: "valid", final_url: url, http_status: null };
  }
}

/** Run `fn` over `items` with at most `concurrency` tasks in flight at a time. */
export async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency = 8,
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
