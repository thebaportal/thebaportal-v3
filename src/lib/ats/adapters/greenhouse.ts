/**
 * Greenhouse Boards API adapter.
 * Docs: https://developers.greenhouse.io/job-board.html
 *
 * Public endpoint — no auth required.
 * apply_url is the Greenhouse-hosted job page where candidates apply directly.
 */

import type { JobAdapter, NormalizedJob } from "../types";
import type { EmployerSource } from "../registry";
import { cleanText, cleanTitle } from "../clean";

interface GreenhouseLocation {
  name: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: GreenhouseLocation;
  absolute_url: string;
  content?: string;   // HTML — only present when ?content=true
  updated_at: string; // ISO-8601; best available date from public API
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: { total: number };
}

export class GreenhouseAdapter implements JobAdapter {
  readonly name = "Greenhouse";
  readonly source_type = "greenhouse";

  constructor(private readonly companies: EmployerSource[]) {}

  async fetchJobs(): Promise<NormalizedJob[]> {
    const results: NormalizedJob[] = [];

    for (const company of this.companies) {
      try {
        const url =
          `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`;

        const res = await fetch(url, { cache: "no-store" });

        if (res.status === 404) {
          console.warn(`[Greenhouse] ${company.name} (${company.slug}) — 404, slug may be wrong`);
          continue;
        }
        if (!res.ok) {
          console.warn(`[Greenhouse] ${company.name} — HTTP ${res.status}`);
          continue;
        }

        const data: GreenhouseResponse = await res.json();
        const jobs = data.jobs ?? [];
        console.log(`[Greenhouse] ${company.name}: ${jobs.length} postings`);

        for (const job of jobs) {
          if (!job.title || !job.absolute_url) continue;

          results.push({
            title:       cleanTitle(job.title),
            company:     company.name,
            location:    cleanText(job.location?.name) ?? null,
            apply_url:   job.absolute_url,
            description: cleanText(job.content) ?? null,
            posted_at:   job.updated_at ?? new Date().toISOString(),
            source_name: company.name,
            source_type: "greenhouse",
            source_slug: company.slug,
            is_ba_relevant: false, // set by filter in refreshJobs
          });
        }
      } catch (err) {
        console.error(`[Greenhouse] Error fetching ${company.name}:`, err);
      }
    }

    console.log(`[Greenhouse] Total raw jobs fetched: ${results.length}`);
    return results;
  }
}
