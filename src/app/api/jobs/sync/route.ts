/**
 * GET /api/jobs/sync
 * Public endpoint — callable from the browser.
 * Rate-limited: skips if a sync ran in the last 30 minutes.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runRefresh } from "@/lib/refreshJobs";

export async function GET() {
  console.log("[/api/jobs/sync] triggered");

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Check if we synced in the last 30 min to avoid hammering Adzuna
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await supabase
      .from("job_listings")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.updated_at) {
      const minsAgo = (Date.now() - new Date(data.updated_at).getTime()) / 60_000;
      if (minsAgo < 30) {
        console.log(`[/api/jobs/sync] Last sync was ${Math.round(minsAgo)}m ago — skipping`);
        return NextResponse.json({ skipped: true, reason: "synced recently", minsAgo: Math.round(minsAgo) });
      }
    }
  } catch {
    // If the table doesn't exist yet or is empty, proceed with sync
  }

  const result = await runRefresh();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
