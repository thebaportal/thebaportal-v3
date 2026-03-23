/**
 * Core job-refresh logic. Called by:
 *  - POST /api/jobs/refresh  (cron / scheduled function)
 *  - GET  /api/jobs/sync     (manual trigger from UI)
 *  - page.tsx directly       (bootstrap on first load)
 *
 * Returns a result object so callers can surface errors.
 */

import { createClient } from "@supabase/supabase-js";

export interface RefreshResult {
  ok: boolean;
  fetched: number;
  upserted: number;
  error?: string;
  envErrors?: string[];
}

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
  return prep
    .filter(p => { if (seen.has(p.label)) return false; seen.add(p.label); return true; })
    .slice(0, 4);
}

export async function runRefresh(): Promise<RefreshResult> {
  console.log("[refreshJobs] ── START ─────────────────────────────────────");

  // ── 1. Validate env vars ──────────────────────────────────────────────────
  const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID;
  const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
  const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envErrors: string[] = [];
  console.log("[refreshJobs] env check → ADZUNA_APP_ID:",    ADZUNA_APP_ID   ? "SET" : "MISSING");
  console.log("[refreshJobs] env check → ADZUNA_APP_KEY:",   ADZUNA_APP_KEY  ? "SET" : "MISSING");
  console.log("[refreshJobs] env check → SUPABASE_URL:",     SUPABASE_URL    ? `SET (${SUPABASE_URL})` : "MISSING");
  console.log("[refreshJobs] env check → SERVICE_ROLE_KEY:", SERVICE_KEY     ? `SET (length: ${SERVICE_KEY.length})` : "MISSING");

  if (!ADZUNA_APP_ID)  envErrors.push("ADZUNA_APP_ID is not set");
  if (!ADZUNA_APP_KEY) envErrors.push("ADZUNA_APP_KEY is not set");
  if (!SUPABASE_URL)   envErrors.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!SERVICE_KEY)    envErrors.push("SUPABASE_SERVICE_ROLE_KEY is not set");

  if (envErrors.length > 0) {
    console.error("[refreshJobs] ABORT — missing env vars:", envErrors);
    return { ok: false, fetched: 0, upserted: 0, envErrors, error: envErrors.join("; ") };
  }

  // Decode the JWT payload (middle segment) to verify it really is service_role.
  // This catches "anon key pasted in the wrong field" without logging the secret.
  try {
    const payload = JSON.parse(
      Buffer.from(SERVICE_KEY!.split(".")[1], "base64").toString("utf8")
    );
    console.log("[refreshJobs] SERVICE_ROLE_KEY JWT role claim:", payload.role ?? "missing");
    if (payload.role !== "service_role") {
      const msg = `SERVICE_ROLE_KEY has role "${payload.role}" — expected "service_role". You likely pasted the anon key by mistake.`;
      console.error("[refreshJobs]", msg);
      return { ok: false, fetched: 0, upserted: 0, error: msg };
    }
  } catch {
    console.warn("[refreshJobs] Could not decode SERVICE_ROLE_KEY JWT — proceeding anyway");
  }

  // ── 2. Fetch from Adzuna ──────────────────────────────────────────────────
  const allJobs: AdzunaJob[] = [];

  for (let page = 1; page <= 2; page++) {
    const url =
      `https://api.adzuna.com/v1/api/jobs/ca/search/${page}` +
      `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}` +
      `&results_per_page=50&what=business+analyst&where=canada&sort_by=date`;

    console.log(`[refreshJobs] Adzuna fetch page ${page} → ${url.replace(ADZUNA_APP_KEY!, "***")}`);

    try {
      const res = await fetch(url, { cache: "no-store" });
      console.log(`[refreshJobs] Adzuna page ${page} status: ${res.status}`);

      if (!res.ok) {
        const body = await res.text();
        console.error(`[refreshJobs] Adzuna page ${page} error body: ${body}`);
        break;
      }

      const data = await res.json();
      const count = data.results?.length ?? 0;
      console.log(`[refreshJobs] Adzuna page ${page} returned ${count} results (total so far: ${allJobs.length + count})`);

      if (data.results) allJobs.push(...data.results);
      if (count === 0) break; // no more pages
    } catch (err) {
      console.error(`[refreshJobs] Adzuna fetch page ${page} threw:`, err);
      break;
    }
  }

  console.log(`[refreshJobs] Total fetched from Adzuna: ${allJobs.length}`);

  if (allJobs.length === 0) {
    console.warn("[refreshJobs] Adzuna returned 0 jobs — nothing to insert");
    return { ok: true, fetched: 0, upserted: 0 };
  }

  // ── 3. Normalise and filter ───────────────────────────────────────────────
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const rows = [];
  let skippedStale = 0;

  for (const job of allJobs) {
    if (new Date(job.created) < cutoff) { skippedStale++; continue; }
    const company  = job.company?.display_name || "";
    const dedupKey = `${normalizeTitle(job.title)}::${company.toLowerCase().trim()}`;
    rows.push({
      dedup_key:     dedupKey,
      adzuna_id:     job.id,
      title:         job.title,
      company:       company || null,
      location:      job.location?.display_name || null,
      salary_min:    job.salary_min  ?? null,
      salary_max:    job.salary_max  ?? null,
      description:   job.description || null,
      url:           job.redirect_url,
      posted_at:     job.created,
      work_type:     detectWorkType(job.title, job.description || ""),
      level:         detectLevel(job.title, job.description || ""),
      quality_score: qualityScore(job),
      prep_links:    getRecommendedPrep(job.title, job.description || ""),
      updated_at:    new Date().toISOString(),
    });
  }

  console.log(`[refreshJobs] After cleaning → ${rows.length} rows to upsert (${skippedStale} skipped as stale)`);

  if (rows.length === 0) {
    console.warn("[refreshJobs] All jobs were stale — nothing to insert");
    return { ok: true, fetched: allJobs.length, upserted: 0 };
  }

  // ── 4. Upsert to Supabase ─────────────────────────────────────────────────
  // Use service role key — bypasses RLS and has full schema access.
  // db schema is explicitly set to "public" to avoid any ambiguity.
  console.log("[refreshJobs] Creating Supabase service-role client...");
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    db: { schema: "public" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`[refreshJobs] Upserting ${rows.length} rows into public.job_listings...`);
  const { error: upsertError } = await supabase
    .from("job_listings")
    .upsert(rows, { onConflict: "dedup_key" });

  if (upsertError) {
    console.error("[refreshJobs] Supabase upsert FAILED");
    console.error("[refreshJobs] error.message:", upsertError.message);
    console.error("[refreshJobs] error.code:",    upsertError.code);
    console.error("[refreshJobs] error.details:", upsertError.details);
    console.error("[refreshJobs] error.hint:",    upsertError.hint);
    return { ok: false, fetched: allJobs.length, upserted: 0, error: upsertError.message };
  }

  console.log(`[refreshJobs] Upsert succeeded — ${rows.length} rows written`);

  // ── 5. Prune stale listings ───────────────────────────────────────────────
  const stale = new Date();
  stale.setDate(stale.getDate() - 30);
  const { error: deleteError } = await supabase
    .from("job_listings")
    .delete()
    .lt("posted_at", stale.toISOString());

  if (deleteError) {
    console.warn("[refreshJobs] Prune delete error (non-fatal):", deleteError.message);
  } else {
    console.log("[refreshJobs] Stale listings pruned");
  }

  console.log("[refreshJobs] ── DONE ──────────────────────────────────────");
  return { ok: true, fetched: allJobs.length, upserted: rows.length };
}
