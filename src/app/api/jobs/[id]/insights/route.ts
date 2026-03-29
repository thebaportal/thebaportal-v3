/**
 * POST /api/jobs/[id]/insights
 *
 * Generates AI win insights for a job, validates them, and saves to DB.
 * Called during job ingest (background) and on-demand for existing jobs.
 * Returns 422 if generation fails — caller uses rule engine fallback.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWinInsightsAI } from "@/lib/generateWinInsightsAI";
import type { JobListing } from "@/lib/jobInsights";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch job
  const { data: job, error: jobErr } = await supabase
    .from("job_listings")
    .select("id, title, company, location, description, apply_url, url, posted_at, work_type, level, quality_score, prep_links, source_type, source_name, verified_apply_url, apply_url_status")
    .eq("id", id)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Generate
  const insights = await generateWinInsightsAI(job as JobListing);

  if (!insights) {
    return NextResponse.json(
      { error: "Generation failed — rule engine fallback will be used" },
      { status: 422 }
    );
  }

  // Save
  const { error: saveErr } = await supabase
    .from("job_listings")
    .update({
      win_insights:              insights,
      win_insights_generated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (saveErr) {
    console.error("[insights/route] Save failed:", saveErr.message);
    // Return the insights anyway so the caller can use them even if the DB write failed
    return NextResponse.json({ ok: true, insights, saveError: saveErr.message });
  }

  return NextResponse.json({ ok: true, insights });
}
