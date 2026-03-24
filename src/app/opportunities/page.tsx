import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import OpportunitiesClient from "./OpportunitiesClient";
import { runRefresh } from "@/lib/refreshJobs";

export const metadata = { title: "BA Jobs in Canada — TheBAPortal" };

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

  const fetchJobs = () =>
    db
      .from("job_listings")
      .select("id, title, company, location, description, apply_url, url, posted_at, work_type, level, quality_score, prep_links, source_type, source_name")
      .order("quality_score", { ascending: false })
      .order("posted_at",     { ascending: false })
      .limit(100);

  let { data: jobs } = await fetchJobs();

  // Bootstrap: if table is empty, run a sync and re-fetch
  let syncError: string | undefined;
  if (!jobs || jobs.length === 0) {
    console.log("[OpportunitiesPage] Table empty — running bootstrap sync");
    const result = await runRefresh();
    if (!result.ok) {
      syncError = result.error ?? "Sync failed";
      console.error("[OpportunitiesPage] Bootstrap sync failed:", syncError);
    } else {
      console.log(`[OpportunitiesPage] Bootstrap sync complete — ${result.upserted} rows`);
      const { data: fresh } = await fetchJobs();
      jobs = fresh;
    }
  }

  return (
    <OpportunitiesClient
      initialJobs={(jobs ?? []) as Parameters<typeof OpportunitiesClient>[0]["initialJobs"]}
      isLoggedIn={!!user}
      syncError={syncError}
    />
  );
}
