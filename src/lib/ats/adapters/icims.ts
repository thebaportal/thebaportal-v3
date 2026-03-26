/**
 * iCIMS Career Portal adapter.
 *
 * iCIMS is one of the most widely used ATS platforms in Canada —
 * CGI Group, Aviva Canada, and many government-adjacent employers use it.
 *
 * iCIMS career sites expose a job search endpoint that can return XML
 * when `outputtype=xml` is appended. We use this to avoid HTML scraping.
 *
 * Endpoint pattern:
 *   GET https://{slug}.icims.com/jobs/search
 *       ?ss=1&searchKeyword=analyst&outputtype=xml&in_iframe=1
 *
 * Apply URL pattern:
 *   https://{slug}.icims.com/jobs/{jobId}/job
 *
 * Note: Older iCIMS instances may not support outputtype=xml — the adapter
 * logs a warning and skips those sources so the pipeline continues cleanly.
 */

import { XMLParser } from "fast-xml-parser";
import type { JobAdapter, NormalizedJob, AdapterFetchResult, SourceResult } from "../types";
import type { EmployerSource } from "../registry";
import { cleanText, cleanTitle } from "../clean";

// iCIMS XML job structure (varies between versions — we handle both shapes)
interface ICIMSJob {
  id?:             string | number;
  jobtitle?:       string;
  title?:          string;
  jobreqid?:       string | number;
  city?:           string;
  state?:          string;
  country?:        string;
  location?:       string;
  postingdate?:    string;
  date_posted?:    string;
  opening_date?:   string;
  joblocation?:    string;
  jobdescription?: string;
  description?:    string;
  url?:            string;
  applyurl?:       string;
}

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

function extractJobs(xml: string): ICIMSJob[] {
  try {
    const parsed = parser.parse(xml);
    // iCIMS XML root varies: <icims_jobboard>, <jobs>, <results>
    const root   = parsed?.icims_jobboard ?? parsed?.jobs ?? parsed?.results ?? parsed;
    const items  = root?.job ?? root?.item ?? root?.posting ?? [];
    return Array.isArray(items) ? items : [items].filter(Boolean);
  } catch {
    return [];
  }
}

function jobTitle(j: ICIMSJob): string | null {
  return j.jobtitle ?? j.title ?? null;
}

function jobLocation(j: ICIMSJob): string | null {
  if (j.location)    return String(j.location);
  if (j.joblocation) return String(j.joblocation);
  const parts = [j.city, j.state, j.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function jobDate(j: ICIMSJob): string {
  const raw = j.postingdate ?? j.date_posted ?? j.opening_date;
  if (!raw) return new Date().toISOString();
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function jobApplyUrl(j: ICIMSJob, slug: string): string | null {
  if (j.url)      return String(j.url);
  if (j.applyurl) return String(j.applyurl);
  const id = j.id ?? j.jobreqid;
  if (id)         return `https://${slug}.icims.com/jobs/${id}/job`;
  return null;
}

function jobDescription(j: ICIMSJob): string | null {
  return cleanText(j.jobdescription ?? j.description ?? null);
}

export class ICIMSAdapter implements JobAdapter {
  readonly name        = "iCIMS";
  readonly source_type = "icims";

  constructor(private readonly sources: EmployerSource[]) {}

  async fetchJobs(): Promise<AdapterFetchResult> {
    const jobs: NormalizedJob[]    = [];
    const sourceResults: SourceResult[] = [];

    for (const source of this.sources) {
      if (!source.slug) {
        console.warn(`[iCIMS] ${source.name} — no slug configured, skipping`);
        sourceResults.push({
          sourceId:   source.id,
          sourceName: source.name,
          jobCount:   0,
          error:      "No slug configured",
        });
        continue;
      }

      try {
        const fetched = await this.fetchSource(source);
        jobs.push(...fetched);
        sourceResults.push({
          sourceId:   source.id,
          sourceName: source.name,
          jobCount:   fetched.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[iCIMS] Error fetching ${source.name}:`, msg);
        sourceResults.push({
          sourceId:   source.id,
          sourceName: source.name,
          jobCount:   0,
          error:      msg,
        });
      }
    }

    console.log(`[iCIMS] Total raw jobs fetched: ${jobs.length}`);
    return { jobs, sourceResults };
  }

  private async fetchSource(source: EmployerSource): Promise<NormalizedJob[]> {
    const slug = source.slug!;
    const url  =
      `https://${slug}.icims.com/jobs/search` +
      `?ss=1&searchKeyword=analyst&outputtype=xml&in_iframe=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrainWave/1.0; +https://thebaportal.com)",
        "Accept":     "application/xml, text/xml, */*",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 404) {
      console.warn(`[iCIMS] ${source.name} (${slug}) — 404, slug may be wrong`);
      return [];
    }
    if (!res.ok) {
      console.warn(`[iCIMS] ${source.name} — HTTP ${res.status}`);
      return [];
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("xml") && !contentType.includes("text")) {
      console.warn(
        `[iCIMS] ${source.name} — unexpected content-type "${contentType}". ` +
        `This iCIMS instance may not support outputtype=xml.`
      );
      return [];
    }

    const xml      = await res.text();
    const rawJobs  = extractJobs(xml);
    const results: NormalizedJob[] = [];

    for (const j of rawJobs) {
      const title    = jobTitle(j);
      const applyUrl = jobApplyUrl(j, slug);

      if (!title || !applyUrl) continue;

      results.push({
        title:          cleanTitle(title),
        company:        source.name,
        location:       jobLocation(j),
        apply_url:      applyUrl,
        description:    jobDescription(j),
        posted_at:      jobDate(j),
        source_name:    source.name,
        source_type:    "icims",
        source_slug:    slug,
        is_ba_relevant: false,
      });
    }

    console.log(`[iCIMS] ${source.name}: ${results.length} postings`);
    return results;
  }
}
