import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import OpportunitiesClient from "./OpportunitiesClient";

export const metadata = { title: "BA Jobs in Canada — TheBAPortal" };

export default async function OpportunitiesPage() {
  // Optional auth — do NOT redirect if unauthenticated
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch initial jobs (public anon client — RLS allows public SELECT)
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: jobs } = await db
    .from("job_listings")
    .select("id, title, company, location, salary_min, salary_max, description, url, posted_at, work_type, level, quality_score, prep_links")
    .order("quality_score", { ascending: false })
    .order("posted_at",     { ascending: false })
    .limit(80);

  // If the table is empty (first deploy before cron fires), kick off a sync
  // in the background so the next visitor sees real data.
  if (!jobs || jobs.length === 0) {
    const siteUrl = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (siteUrl && process.env.CRON_SECRET) {
      fetch(`${siteUrl}/api/jobs/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {/* fire and forget */});
    }
  }

  return (
    <OpportunitiesClient
      initialJobs={jobs ?? []}
      isLoggedIn={!!user}
    />
  );
}
