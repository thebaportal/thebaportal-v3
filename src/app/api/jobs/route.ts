import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workType = searchParams.get("work_type");
  const level    = searchParams.get("level");
  const q        = searchParams.get("q");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from("job_listings")
    .select("id, title, company, location, description, apply_url, url, posted_at, work_type, level, quality_score, prep_links, source_type, source_name")
    .order("quality_score", { ascending: false })
    .order("posted_at",     { ascending: false })
    .limit(80);

  if (workType) query = query.eq("work_type", workType);
  if (level)    query = query.eq("level", level);
  if (q)        query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data ?? [] });
}
