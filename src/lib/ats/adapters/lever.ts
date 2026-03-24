/**
 * Lever Postings API adapter.
 * Docs: https://hire.lever.co/developer/postings
 *
 * Public endpoint — no auth required.
 * apply_url (hostedUrl) is the Lever-hosted job page where candidates apply directly.
 */

import type { JobAdapter, NormalizedJob } from "../types";
import type { CompanyConfig } from "../companies";
import { cleanText, cleanTitle } from "../clean";

interface LeverCategories {
  location?: string;
  team?: string;
  department?: string;
  commitment?: string;
}

interface LeverPosting {
  id: string;
  text: string;                // job title
  categories: LeverCategories;
  hostedUrl: string;           // direct Lever-hosted application page
  descriptionBody?: string;    // HTML job description
  description?: string;        // plain-text fallback
  createdAt: number;           // Unix timestamp in milliseconds
}

export class LeverAdapter implements JobAdapter {
  readonly name = "Lever";
  readonly source_type = "lever";

  constructor(private readonly companies: CompanyConfig[]) {}

  async fetchJobs(): Promise<NormalizedJob[]> {
    const results: NormalizedJob[] = [];

    for (const company of this.companies) {
      try {
        const url =
          `https://api.lever.co/v0/postings/${company.slug}?mode=json`;

        const res = await fetch(url, { cache: "no-store" });

        if (res.status === 404) {
          console.warn(`[Lever] ${company.name} (${company.slug}) — 404, slug may be wrong`);
          continue;
        }
        if (!res.ok) {
          console.warn(`[Lever] ${company.name} — HTTP ${res.status}`);
          continue;
        }

        const jobs: LeverPosting[] = await res.json();
        console.log(`[Lever] ${company.name}: ${jobs.length} postings`);

        for (const job of jobs) {
          if (!job.text || !job.hostedUrl) continue;

          const rawDesc = job.descriptionBody || job.description || "";
          const postedAt = job.createdAt
            ? new Date(job.createdAt).toISOString()
            : new Date().toISOString();

          results.push({
            title:       cleanTitle(job.text),
            company:     company.name,
            location:    cleanText(job.categories?.location) ?? null,
            apply_url:   job.hostedUrl,
            description: cleanText(rawDesc) ?? null,
            posted_at:   postedAt,
            source_name: company.name,
            source_type: "lever",
            source_slug: company.slug,
            is_ba_relevant: false,
          });
        }
      } catch (err) {
        console.error(`[Lever] Error fetching ${company.name}:`, err);
      }
    }

    console.log(`[Lever] Total raw jobs fetched: ${results.length}`);
    return results;
  }
}
