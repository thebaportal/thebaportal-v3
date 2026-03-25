/**
 * SmartRecruiters public Postings API adapter.
 * Docs: https://developers.smartrecruiters.com/docs/posting-api
 *
 * Two-step fetch:
 *   1. List postings (country=Canada pre-filter, no auth needed)
 *   2. Fetch full posting detail (for applyUrl + description) — only for
 *      jobs that pass the title pre-filter, so we don't waste requests.
 *
 * The list endpoint returns a real ISO-8601 "releasedDate" — no parsing needed.
 * The detail endpoint returns "applyUrl" (SmartRecruiters-hosted apply page,
 * a direct employer link) and the structured job description.
 *
 * Concurrency: detail fetches are batched (max DETAIL_CONCURRENCY at once)
 * to avoid hammering the API after a large title filter pass.
 */

import type { JobAdapter, NormalizedJob, AdapterFetchResult, SourceResult } from "../types";
import type { EmployerSource } from "../registry";
import { cleanText, cleanTitle } from "../clean";
import { BA_CORE_WHITELIST, BA_BORDERLINE_WHITELIST, BA_TITLE_BLACKLIST } from "../filter";

const LIST_PAGE_SIZE   = 100;
const DETAIL_CONCURRENCY = 5;
const REQUEST_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── SmartRecruiters API types ─────────────────────────────────────────────────

interface SRLocation {
  city?:    string;
  region?:  string;
  country?: string;
  remote?:  boolean;
}

interface SRListItem {
  id:           string;
  name:         string;
  releasedDate: string;   // ISO-8601
  location:     SRLocation;
  ref:          string;   // URL to full posting detail
}

interface SRListResponse {
  totalFound: number;
  content:    SRListItem[];
}

interface SRSection {
  title?: string;
  text?:  string;
}

interface SRDetailResponse {
  id:       string;
  name:     string;
  applyUrl: string;
  jobAd?: {
    sections?: {
      jobDescription?:      SRSection;
      qualifications?:      SRSection;
      additionalInformation?: SRSection;
    };
  };
}

// ── Location helpers ──────────────────────────────────────────────────────────

/**
 * Build a location string from the SmartRecruiters structured location object.
 * Returns a string like "Toronto, Ontario, Canada" or "Remote" or null.
 */
function formatSRLocation(loc: SRLocation | undefined): string | null {
  if (!loc) return null;
  if (loc.remote) return "Remote Canada"; // SR pre-filters to Canada; remote = Canada remote
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Title pre-filter (Layer 1 only — before description is available) ─────────

function passesTitlePreFilter(title: string): boolean {
  const lower = title.toLowerCase();
  if (BA_TITLE_BLACKLIST.some(re => re.test(lower))) return false;
  return (
    BA_CORE_WHITELIST.some(re => re.test(lower)) ||
    BA_BORDERLINE_WHITELIST.some(re => re.test(lower))
  );
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export class SmartRecruitersAdapter implements JobAdapter {
  readonly name = "SmartRecruiters";
  readonly source_type = "smartrecruiters";

  constructor(private readonly sources: EmployerSource[]) {}

  async fetchJobs(): Promise<AdapterFetchResult> {
    const jobs: NormalizedJob[] = [];
    const sourceResults: SourceResult[] = [];

    for (const source of this.sources) {
      if (!source.slug) {
        console.warn(`[SmartRecruiters] ${source.name} — missing slug (company identifier), skipping`);
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: 0, error: "Missing slug config" });
        continue;
      }

      try {
        const fetched = await this.fetchCompanyJobs(source);
        jobs.push(...fetched);
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: fetched.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[SmartRecruiters] Error fetching ${source.name}:`, err);
        sourceResults.push({ sourceId: source.id, sourceName: source.name, jobCount: 0, error: msg });
      }
    }

    console.log(`[SmartRecruiters] Total raw jobs fetched: ${jobs.length}`);
    return { jobs, sourceResults };
  }

  private async fetchCompanyJobs(source: EmployerSource): Promise<NormalizedJob[]> {
    const { slug, name } = source;

    // ── Step 1: collect all list items (paginate, pre-filtered to Canada) ──────
    const listItems: SRListItem[] = [];
    let offset = 0;
    let total  = Infinity;

    while (offset < total) {
      const url = new URL(
        `https://api.smartrecruiters.com/v1/companies/${slug}/postings`
      );
      url.searchParams.set("country", "Canada");
      url.searchParams.set("limit",   String(LIST_PAGE_SIZE));
      url.searchParams.set("offset",  String(offset));

      const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json" },
        cache:   "no-store",
      });

      if (res.status === 404) {
        console.warn(`[SmartRecruiters] ${name} (${slug}) — 404, identifier may be wrong`);
        break;
      }
      if (!res.ok) {
        console.warn(`[SmartRecruiters] ${name} — HTTP ${res.status}`);
        break;
      }

      const data: SRListResponse = await res.json();
      total = data.totalFound ?? 0;
      const page = data.content ?? [];

      if (page.length === 0) break;
      listItems.push(...page);
      offset += LIST_PAGE_SIZE;

      if (offset < total) await sleep(REQUEST_DELAY_MS);
    }

    console.log(`[SmartRecruiters] ${name}: ${listItems.length} postings in Canada`);

    // ── Step 2: title pre-filter — only fetch detail for plausible BA titles ───
    const titleMatched = listItems.filter(item => passesTitlePreFilter(item.name));
    console.log(
      `[SmartRecruiters] ${name}: ${titleMatched.length}/${listItems.length} passed title pre-filter`
    );

    if (titleMatched.length === 0) return [];

    // ── Step 3: fetch full posting details in controlled batches ──────────────
    const results: NormalizedJob[] = [];

    for (let i = 0; i < titleMatched.length; i += DETAIL_CONCURRENCY) {
      const batch = titleMatched.slice(i, i + DETAIL_CONCURRENCY);

      const detailResults = await Promise.allSettled(
        batch.map(item => this.fetchPostingDetail(item.ref))
      );

      for (let j = 0; j < batch.length; j++) {
        const item   = batch[j];
        const result = detailResults[j];

        if (result.status === "rejected" || !result.value) {
          console.warn(`[SmartRecruiters] ${name}: failed to fetch detail for "${item.name}"`);
          continue;
        }

        const detail = result.value;
        if (!detail.applyUrl) {
          console.warn(`[SmartRecruiters] ${name}: no applyUrl for "${item.name}", skipping`);
          continue;
        }

        // Combine description sections
        const sections = detail.jobAd?.sections;
        const rawDesc = [
          sections?.jobDescription?.text,
          sections?.qualifications?.text,
          sections?.additionalInformation?.text,
        ]
          .filter(Boolean)
          .join("\n\n");

        results.push({
          title:       cleanTitle(item.name),
          company:     name,
          location:    formatSRLocation(item.location),
          apply_url:   detail.applyUrl,
          description: cleanText(rawDesc) ?? null,
          posted_at:   item.releasedDate,
          source_name: name,
          source_type: "smartrecruiters",
          source_slug: slug,
          is_ba_relevant: false,
        });
      }

      if (i + DETAIL_CONCURRENCY < titleMatched.length) {
        await sleep(REQUEST_DELAY_MS * 2);
      }
    }

    return results;
  }

  private async fetchPostingDetail(ref: string): Promise<SRDetailResponse | null> {
    try {
      const res = await fetch(ref, {
        headers: { "Accept": "application/json" },
        cache:   "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as SRDetailResponse;
    } catch {
      return null;
    }
  }
}
