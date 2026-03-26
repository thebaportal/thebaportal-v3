import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import OpportunitiesClient from "./OpportunitiesClient";
import { runRefresh } from "@/lib/refreshJobs";

export const metadata = { title: "BA Jobs in Canada — TheBAPortal" };

/** Return true if a URL is a direct employer link (not an aggregator redirect). */
function isDirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const AGGREGATORS = ["adzuna", "indeed", "ziprecruiter", "monster", "careerjet", "jobbank"];
    return !AGGREGATORS.some(a => host.includes(a));
  } catch {
    return false;
  }
}

export default async function OpportunitiesPage() {
  // Optional auth — no redirect
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 10-day fence at query time — mirrors the ingestion freshness window.
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const fetchJobs = () =>
    db
      .from("job_listings")
      .select("id, title, company, location, description, apply_url, url, posted_at, work_type, level, quality_score, prep_links, source_type, source_name, verified_apply_url, apply_url_status")
      .gte("posted_at", tenDaysAgo)
      .order("quality_score", { ascending: false })
      .order("posted_at",     { ascending: false })
      .limit(200);

  let { data: raw } = await fetchJobs();

  // Strip aggregator-linked rows. Jobs with bad Workday URLs are kept —
  // resolveApplyUrl() on the client will show the appropriate fallback.
  const cleanJobs = (raw ?? []).filter(job => {
    const url = job.apply_url || job.url;
    return isDirectUrl(url);
  });

  // Bootstrap: run a fresh sync if there are no clean employer-linked jobs.
  // This covers both the empty-table case AND the "table full of old Adzuna
  // garbage" case so BrainWave gets a chance to populate immediately.
  let syncError: string | undefined;
  if (cleanJobs.length === 0) {
    console.log("[OpportunitiesPage] No clean jobs — running bootstrap sync");
    const result = await runRefresh();
    if (!result.ok) {
      syncError = result.error ?? "Sync failed";
      console.error("[OpportunitiesPage] Bootstrap sync failed:", syncError);
    } else {
      console.log(`[OpportunitiesPage] Bootstrap sync complete — ${result.upserted} rows`);
      const { data: fresh } = await fetchJobs();
      const freshClean = (fresh ?? []).filter(job => isDirectUrl(job.apply_url || (job.url ?? undefined)));
      return (
        <OpportunitiesClient
          initialJobs={freshClean as Parameters<typeof OpportunitiesClient>[0]["initialJobs"]}
          isLoggedIn={!!user}
          syncError={undefined}
        />
      );
    }
  }

  return (
    <OpportunitiesClient
      initialJobs={cleanJobs as Parameters<typeof OpportunitiesClient>[0]["initialJobs"]}
      isLoggedIn={!!user}
      syncError={syncError}
    />
  );
}
