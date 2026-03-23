import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID!;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY!;
const CRON_SECRET    = process.env.CRON_SECRET!;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name: string };
  location?: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  description: string;
  redirect_url: string;
  created: string;
}

interface PrepLink { label: string; href: string }

function normalizeTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function detectWorkType(title: string, desc: string): "remote" | "hybrid" | "onsite" {
  const t = (title + " " + desc).toLowerCase();
  if (/\bremote\b/.test(t)) return "remote";
  if (/\bhybrid\b/.test(t)) return "hybrid";
  return "onsite";
}

function detectLevel(title: string, desc: string): "entry" | "junior" | "mid" | "senior" {
  const t = (title + " " + desc).toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|associate|new.?grad)\b/.test(t)) return "entry";
  return "mid";
}

function qualityScore(job: AdzunaJob): number {
  let score = 0;
  if (job.company?.display_name) score += 20;
  if (job.salary_min || job.salary_max) score += 25;
  const len = (job.description || "").length;
  if (len > 500) score += 30;
  else if (len > 200) score += 20;
  const days = (Date.now() - new Date(job.created).getTime()) / 86_400_000;
  if (days <= 2) score += 25;
  else if (days <= 7) score += 15;
  else score += 5;
  return score;
}

function getRecommendedPrep(title: string, desc: string): PrepLink[] {
  const t = (title + " " + desc).toLowerCase();
  const prep: PrepLink[] = [];
  if (/agile|scrum|sprint|backlog|kanban/.test(t))
    prep.push({ label: "Agile BA Challenge", href: "/scenarios" });
  if (/requirements|user stor|use case|specification|brd|frd/.test(t))
    prep.push({ label: "Requirements Challenge", href: "/scenarios" });
  if (/stakeholder|elicitation|workshop/.test(t))
    prep.push({ label: "Stakeholder Interview Sim", href: "/scenarios" });
  if (/cbap|ccba|pmi.pba|iiba|certification/.test(t))
    prep.push({ label: "Exam Prep", href: "/exam" });
  if (/\bdata\b|analytics|reporting|business intelligence|\bbi\b/.test(t))
    prep.push({ label: "Data Analysis Challenge", href: "/scenarios" });
  if (/process|workflow|bpmn|swimlane/.test(t))
    prep.push({ label: "Process Mapping Challenge", href: "/scenarios" });
  prep.push({ label: "Interview Prep", href: "/pitchready" });
  prep.push({ label: "Career Suite", href: "/career" });
  const seen = new Set<string>();
  return prep.filter(p => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  }).slice(0, 4);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const allJobs: AdzunaJob[] = [];
  for (let page = 1; page <= 2; page++) {
    const url =
      `https://api.adzuna.com/v1/api/jobs/ca/search/${page}` +
      `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}` +
      `&results_per_page=50&what=business+analyst&where=canada` +
      `&sort_by=date&content-type=application/json`;
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) break;
      const data = await res.json();
      if (data.results) allJobs.push(...data.results);
    } catch {
      break;
    }
  }

  const rows = [];
  for (const job of allJobs) {
    if (new Date(job.created) < cutoff) continue;
    const company = job.company?.display_name || "";
    const dedupKey = `${normalizeTitle(job.title)}::${company.toLowerCase().trim()}`;
    rows.push({
      dedup_key:    dedupKey,
      adzuna_id:    job.id,
      title:        job.title,
      company:      company || null,
      location:     job.location?.display_name || null,
      salary_min:   job.salary_min ?? null,
      salary_max:   job.salary_max ?? null,
      description:  job.description || null,
      url:          job.redirect_url,
      posted_at:    job.created,
      work_type:    detectWorkType(job.title, job.description || ""),
      level:        detectLevel(job.title, job.description || ""),
      quality_score: qualityScore(job),
      prep_links:   getRecommendedPrep(job.title, job.description || ""),
      updated_at:   new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("job_listings")
      .upsert(rows, { onConflict: "dedup_key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Prune listings older than 30 days
  const stale = new Date();
  stale.setDate(stale.getDate() - 30);
  await supabase.from("job_listings").delete().lt("posted_at", stale.toISOString());

  return NextResponse.json({ fetched: allJobs.length, upserted: rows.length });
}
