/**
 * BrainWave refresh pipeline.
 * Called by:
 *  - POST /api/jobs/refresh  (cron / scheduled)
 *  - GET  /api/jobs/sync     (manual trigger from UI)
 *  - page.tsx directly       (bootstrap on first load)
 */

import { createClient } from "@supabase/supabase-js";
import { buildAdapters } from "./ats/adapters";
import { fetchActiveEmployerSources, recordSourceFailure, recordSourceSuccess } from "./ats/registry";
import { checkBaRelevance } from "./ats/filter";
import { isCanadianLocation } from "./ats/location";
import { normalizeForDedup } from "./ats/clean";

export type { RefreshResult } from "./ats/types";
import type { NormalizedJob, RefreshResult, SourceReport, SourceResult } from "./ats/types";

// ── Prep link logic ────────────────────────────────────────────────────────────

interface PrepLink { label: string; href: string }

function getPrep(title: string, desc: string): PrepLink[] {
  const t = (title + " " + desc).toLowerCase();
  const prep: PrepLink[] = [];

  if (/agile|scrum|sprint|backlog|kanban/.test(t))
    prep.push({ label: "Agile BA Challenge", href: "/scenarios" });
  if (/requirements|user stor|use case|brd|frd|elicitation/.test(t))
    prep.push({ label: "Requirements Challenge", href: "/scenarios" });
  if (/stakeholder|workshop|facilitat/.test(t))
    prep.push({ label: "Stakeholder Interview Sim", href: "/scenarios" });
  if (/cbap|ccba|pmi.pba|iiba|certification/.test(t))
    prep.push({ label: "Exam Prep", href: "/exam" });
  if (/\bdata\b|analytics|reporting|business intelligence|\bbi\b/.test(t))
    prep.push({ label: "Data Analysis Challenge", href: "/scenarios" });
  if (/process|workflow|bpmn|swimlane|mapping/.test(t))
    prep.push({ label: "Process Mapping Challenge", href: "/scenarios" });

  // Fallback for jobs with no description (e.g. Workday): any BA role gets
  // universally relevant prep chips so users always have something to practice.
  if (prep.length === 0 && /analyst/.test(t)) {
    prep.push({ label: "Requirements Challenge",    href: "/scenarios" });
    prep.push({ label: "Stakeholder Interview Sim", href: "/scenarios" });
  }

  // Always include one CTA but cap total at 3 role-specific chips
  const seen = new Set<string>();
  const deduped = prep.filter(p => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  }).slice(0, 2);

  deduped.push({ label: "Career Suite", href: "/career" });
  return deduped;
}

// ── Quality score ──────────────────────────────────────────────────────────────

function qualityScore(job: NormalizedJob): number {
  let score = 0;

  // Freshness (0–40)
  const days = (Date.now() - new Date(job.posted_at).getTime()) / 86_400_000;
  if (days <= 1)       score += 40;
  else if (days <= 3)  score += 30;
  else if (days <= 7)  score += 20;
  else if (days <= 14) score += 10;

  // Description completeness (0–30)
  const len = (job.description ?? "").length;
  if (len > 500)       score += 30;
  else if (len > 200)  score += 20;
  else if (len > 50)   score += 10;

  // Metadata present (0–30)
  if (job.company)   score += 10;
  if (job.location)  score += 10;
  if (job.apply_url) score += 10;

  return score;
}

// ── Work type / level detection ────────────────────────────────────────────────

function detectWorkType(title: string, desc: string): "remote" | "hybrid" | "onsite" {
  const t = (title + " " + desc).toLowerCase();
  if (/\bremote\b/.test(t))  return "remote";
  if (/\bhybrid\b/.test(t))  return "hybrid";
  return "onsite";
}

function detectLevel(title: string, desc: string): "entry" | "junior" | "mid" | "senior" {
  const t = (title + " " + desc).toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|staff)\b/.test(t))         return "senior";
  if (/\b(junior|jr\.?|entry.?level|associate|new.?grad)\b/.test(t)) return "entry";
  return "mid";
}

// ── Main refresh function ──────────────────────────────────────────────────────

export async function runRefresh(): Promise<RefreshResult> {
  console.log("[refreshJobs] ── START ─────────────────────────────────────");

  // 1. Env var check
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envErrors: string[] = [];
  if (!SUPABASE_URL)  envErrors.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!SERVICE_KEY)   envErrors.push("SUPABASE_SERVICE_ROLE_KEY is not set");

  console.log("[refreshJobs] SUPABASE_URL:", SUPABASE_URL ? "SET" : "MISSING");
  console.log("[refreshJobs] SERVICE_KEY:", SERVICE_KEY ? `SET (len ${SERVICE_KEY.length})` : "MISSING");

  if (envErrors.length > 0) {
    console.error("[refreshJobs] ABORT — missing env vars:", envErrors);
    return { ok: false, fetched: 0, upserted: 0, skippedIrrelevant: 0, skippedStale: 0, skippedNonCanada: 0, envErrors, error: envErrors.join("; ") };
  }

  // Verify service_role JWT
  try {
    const payload = JSON.parse(
      Buffer.from(SERVICE_KEY!.split(".")[1], "base64").toString("utf8")
    );
    console.log("[refreshJobs] SERVICE_KEY role:", payload.role ?? "missing");
    if (payload.role !== "service_role") {
      const msg = `SERVICE_KEY has role "${payload.role}" — expected "service_role"`;
      console.error("[refreshJobs]", msg);
      return { ok: false, fetched: 0, upserted: 0, skippedIrrelevant: 0, skippedStale: 0, skippedNonCanada: 0, error: msg };
    }
  } catch {
    console.warn("[refreshJobs] Could not decode JWT — proceeding");
  }

  // 2. Create DB client early — needed for registry fetch and upsert
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    db:   { schema: "public" },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Load employer sources from DB registry
  const sources = await fetchActiveEmployerSources(supabase);
  if (sources.length === 0) {
    console.warn("[refreshJobs] No active employer sources — run the SQL migration and seed the employer_sources table");
    return { ok: true, fetched: 0, upserted: 0, skippedIrrelevant: 0, skippedStale: 0, skippedNonCanada: 0 };
  }

  // 4. Build adapters from registry and run them — track per-source health
  const adapters = buildAdapters(sources);
  const allJobs: NormalizedJob[] = [];
  const allSourceResults: SourceResult[] = [];

  for (const adapter of adapters) {
    console.log(`[refreshJobs] Running adapter: ${adapter.name}`);
    try {
      const { jobs, sourceResults } = await adapter.fetchJobs();
      console.log(`[refreshJobs] ${adapter.name}: ${jobs.length} raw jobs`);
      allJobs.push(...jobs);
      allSourceResults.push(...sourceResults);
    } catch (err) {
      console.error(`[refreshJobs] Adapter ${adapter.name} threw:`, err);
    }
  }
  console.log(`[refreshJobs] Total raw jobs from all adapters: ${allJobs.length}`);

  // 4b. Write source health to DB — fire-and-forget, non-blocking
  // Build a lookup of sourceId → platform for the report
  const sourceIdToPlatform = new Map(sources.map(s => [s.id, s.platform]));
  const newlyDeactivated: string[] = [];

  await Promise.all(allSourceResults.map(async (sr) => {
    if (sr.error) {
      const deactivated = await recordSourceFailure(supabase, sr.sourceId, sr.sourceName, sr.error);
      if (deactivated) newlyDeactivated.push(sr.sourceName);
    } else {
      await recordSourceSuccess(supabase, sr.sourceId);
    }
  }));

  // 4c. Build source report
  const reportByPlatform: Record<string, { active: number; failed: number }> = {};
  const reportFailures: Array<{ name: string; platform: string; error: string }> = [];

  for (const sr of allSourceResults) {
    const platform = sourceIdToPlatform.get(sr.sourceId) ?? "unknown";
    if (!reportByPlatform[platform]) reportByPlatform[platform] = { active: 0, failed: 0 };
    if (sr.error) {
      reportByPlatform[platform].failed++;
      reportFailures.push({ name: sr.sourceName, platform, error: sr.error });
    } else {
      reportByPlatform[platform].active++;
    }
  }

  const sourceReport: SourceReport = {
    totalSources:     allSourceResults.length,
    healthySources:   allSourceResults.filter(r => !r.error).length,
    failedSources:    allSourceResults.filter(r => !!r.error).length,
    newlyDeactivated: newlyDeactivated.length,
    byPlatform:       reportByPlatform,
    failures:         reportFailures,
  };

  console.log(
    `[refreshJobs] Source health: ${sourceReport.healthySources} healthy, ` +
    `${sourceReport.failedSources} failed, ${sourceReport.newlyDeactivated} newly deactivated`
  );
  if (reportFailures.length > 0) {
    console.log(`[refreshJobs] Failed sources:`);
    for (const f of reportFailures) {
      console.log(`  ✗ ${f.name} (${f.platform}): ${f.error}`);
    }
  }

  if (allJobs.length === 0) {
    console.warn("[refreshJobs] No jobs fetched — nothing to process");
    return { ok: true, fetched: 0, upserted: 0, skippedIrrelevant: 0, skippedStale: 0, skippedNonCanada: 0, sourceReport };
  }

  // 3. Freshness filter — only keep jobs from the last 10 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);

  let skippedStale = 0;
  const freshJobs = allJobs.filter(job => {
    if (!job.posted_at) { skippedStale++; return false; }
    const d = new Date(job.posted_at);
    if (isNaN(d.getTime())) { skippedStale++; return false; }
    if (d < cutoff) { skippedStale++; return false; }
    return true;
  });
  console.log(`[refreshJobs] After freshness filter: ${freshJobs.length} (${skippedStale} stale/invalid removed)`);

  // 4. Canada location filter — reject non-Canadian or ambiguous locations
  let skippedNonCanada = 0;
  const canadianJobs = freshJobs.filter(job => {
    const ok = isCanadianLocation(job.location);
    if (!ok) {
      console.log(`[refreshJobs] Non-Canada rejected: "${job.location}" — ${job.title} @ ${job.company}`);
      skippedNonCanada++;
    }
    return ok;
  });
  console.log(`[refreshJobs] After Canada filter: ${canadianJobs.length} (${skippedNonCanada} non-Canada removed)`);

  // 5. BA relevance filter — with diagnostic logging for borderline rejections
  let skippedIrrelevant = 0;
  let borderlineRejected = 0;
  const relevantJobs = canadianJobs.filter(job => {
    const result = checkBaRelevance(job);
    if (!result.relevant) {
      skippedIrrelevant++;
      if (result.isBorderline && result.reason === "desc_too_weak") {
        // Log every borderline failure with exact keyword hit count so we can
        // tune the BA_BORDERLINE_MIN_MATCHES threshold based on real data.
        borderlineRejected++;
        console.log(
          `[refreshJobs] Borderline rejected (${result.hits}/${result.required} keywords): ` +
          `"${job.title}" @ ${(job as { company?: string }).company ?? "??"} — loc: ${(job as { location?: string | null }).location ?? "??"}`
        );
      }
    }
    return result.relevant;
  });
  console.log(
    `[refreshJobs] After BA filter: ${relevantJobs.length} relevant ` +
    `(${skippedIrrelevant} irrelevant removed, ${borderlineRejected} borderline failed desc threshold)`
  );

  if (relevantJobs.length === 0) {
    console.warn("[refreshJobs] No relevant BA jobs found");
    return { ok: true, fetched: allJobs.length, upserted: 0, skippedIrrelevant, skippedStale, skippedNonCanada, sourceReport };
  }

  // 5. Build rows
  type JobRow = {
    dedup_key:    string;
    title:        string;
    company:      string | null;
    location:     string | null;
    apply_url:    string;
    url:          string;           // backward compat — same as apply_url
    description:  string | null;
    posted_at:    string;
    source_name:  string;
    source_type:  string;
    source_slug:  string | null;
    is_ba_relevant: boolean;
    work_type:    string;
    level:        string;
    quality_score:number;
    prep_links:   PrepLink[];
    updated_at:   string;
    // Legacy columns — null for new jobs (Adzuna gone)
    adzuna_id:    null;
    salary_min:   null;
    salary_max:   null;
  };

  const rawRows: JobRow[] = relevantJobs.map(job => {
    const dedupKey = `${normalizeForDedup(job.title)}::${job.company.toLowerCase()}`;
    return {
      dedup_key:     dedupKey,
      title:         job.title,
      company:       job.company || null,
      location:      job.location,
      apply_url:     job.apply_url,
      url:           job.apply_url,
      description:   job.description,
      posted_at:     job.posted_at,
      source_name:   job.source_name,
      source_type:   job.source_type,
      source_slug:   job.source_slug,
      is_ba_relevant:true,
      work_type:     detectWorkType(job.title, job.description ?? ""),
      level:         detectLevel(job.title, job.description ?? ""),
      quality_score: qualityScore(job),
      prep_links:    getPrep(job.title, job.description ?? ""),
      updated_at:    new Date().toISOString(),
      adzuna_id:     null,
      salary_min:    null,
      salary_max:    null,
    };
  });

  // 6. Dedup — Map keyed on dedup_key, keep highest quality_score
  const dedupeMap = new Map<string, JobRow>();
  let duplicatesFound = 0;

  for (const row of rawRows) {
    const existing = dedupeMap.get(row.dedup_key);
    if (existing) {
      duplicatesFound++;
      if (row.quality_score >= existing.quality_score) {
        dedupeMap.set(row.dedup_key, row);
      }
    } else {
      dedupeMap.set(row.dedup_key, row);
    }
  }

  const dedupedRows = Array.from(dedupeMap.values());
  console.log(`[refreshJobs] After dedup: ${dedupedRows.length} unique (${duplicatesFound} duplicates collapsed)`);

  // 7. Hard guard — verify no duplicates remain before DB write
  const guardCheck = new Set<string>();
  const guardViolations: string[] = [];
  for (const row of dedupedRows) {
    if (guardCheck.has(row.dedup_key)) guardViolations.push(row.dedup_key);
    else guardCheck.add(row.dedup_key);
  }
  if (guardViolations.length > 0) {
    const msg = `GUARD FAILED — ${guardViolations.length} duplicate dedup_key(s): ${guardViolations.slice(0, 5).join(", ")}`;
    console.error(`[refreshJobs] ${msg}`);
    return { ok: false, fetched: allJobs.length, upserted: 0, skippedIrrelevant, skippedStale, skippedNonCanada, sourceReport, error: msg };
  }
  console.log(`[refreshJobs] Guard passed — ${dedupedRows.length} unique rows ready`);

  // 8. Upsert to Supabase (reuse client created at step 2)
  const { error: upsertError } = await supabase
    .from("job_listings")
    .upsert(dedupedRows, { onConflict: "dedup_key" });

  if (upsertError) {
    console.error("[refreshJobs] Upsert FAILED:", upsertError.message, upsertError.code);
    return { ok: false, fetched: allJobs.length, upserted: 0, skippedIrrelevant, skippedStale, skippedNonCanada, sourceReport, error: upsertError.message };
  }

  console.log(`[refreshJobs] Upsert succeeded — ${dedupedRows.length} rows written`);

  // 9. Prune rows older than 10 days
  const pruneDate = new Date();
  pruneDate.setDate(pruneDate.getDate() - 10);
  const { error: deleteError } = await supabase
    .from("job_listings")
    .delete()
    .lt("posted_at", pruneDate.toISOString());

  if (deleteError) {
    console.warn("[refreshJobs] Prune error (non-fatal):", deleteError.message);
  } else {
    console.log("[refreshJobs] Stale rows pruned");
  }

  console.log("[refreshJobs] ── DONE ──────────────────────────────────────");
  return { ok: true, fetched: allJobs.length, upserted: dedupedRows.length, skippedIrrelevant, skippedStale, skippedNonCanada, sourceReport };
}
