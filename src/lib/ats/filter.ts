/**
 * Two-layer BA relevance filter.
 *
 * Layer 1 — Title: must match at least one whitelist pattern
 *            AND must not match any blacklist pattern.
 * Layer 2 — Description: must contain at least BA_DESC_MIN_MATCHES
 *            keywords from BA_DESC_KEYWORDS.
 *
 * All exported constants are intentionally mutable so they can be
 * tuned without touching the filter logic itself.
 */

import type { NormalizedJob } from "./types";

// ── Layer 1: Title patterns ───────────────────────────────────────────────────

export const BA_TITLE_WHITELIST: RegExp[] = [
  /\bbusiness\s+analyst\b/i,
  /\bbusiness\s+systems?\s+analyst\b/i,
  /\bIT\s+business\s+analyst\b/i,
  /\bsystems?\s+analyst\b/i,
  /\bprocess\s+analyst\b/i,
  /\bfunctional\s+analyst\b/i,
  /\brequirements?\s+analyst\b/i,
  /\benterprise\s+analyst\b/i,
  /\btechnology\s+analyst\b/i,
  /\bproduct\s+analyst\b/i,      // validated by description check
  /\bjr\.?\s+business\s+analyst\b/i,
  /\bsr\.?\s+business\s+analyst\b/i,
  /\blead\s+business\s+analyst\b/i,
  /\bprincipal\s+business\s+analyst\b/i,
  /\bstaff\s+business\s+analyst\b/i,
];

export const BA_TITLE_BLACKLIST: RegExp[] = [
  /\bfinancial\s+analyst\b/i,
  /\brisk\s+analyst\b/i,
  /\bcredit\s+analyst\b/i,
  /\bquantitative\s+analyst\b/i,
  /\binvestment\s+analyst\b/i,
  /\bmarket\s+analyst\b/i,
  /\bmarketing\s+analyst\b/i,
  /\bdata\s+scientist\b/i,
  /\bsoftware\s+engineer\b/i,
  /\bsoftware\s+developer\b/i,
  /\bfull.?stack\b/i,
  /\bfront.?end\b/i,
  /\bback.?end\b/i,
  /\bproject\s+manager\b/i,
  /\bdelivery\s+manager\b/i,
  /\bproduct\s+manager\b/i,
  /\bprogram\s+manager\b/i,
  /\bfraud\s+analyst\b/i,
  /\bsecurity\s+analyst\b/i,
  /\bcyber\b/i,
  /\bmarketing\s+manager\b/i,
  /\bhr\s+analyst\b/i,
  /\bhuman\s+resources\b/i,
  /\bpayroll\b/i,
  /\bactuarial\b/i,
  /\bportfolio\s+analyst\b/i,
  /\bcompliance\s+analyst\b/i,
  /\bpolicy\s+analyst\b/i,
  /\bsales\s+analyst\b/i,
  /\boperations\s+analyst\b/i,
  /\bsupply\s+chain\s+analyst\b/i,
  /\bprocurement\s+analyst\b/i,
  /\bpricing\s+analyst\b/i,
  /\binsights\s+analyst\b/i,
  /\bperformance\s+analyst\b/i,
];

// ── Layer 2: Description keywords ─────────────────────────────────────────────

export const BA_DESC_KEYWORDS: string[] = [
  "requirements",
  "stakeholder",
  "process analysis",
  "user stories",
  "use cases",
  "business requirements",
  "gap analysis",
  "brd",
  "frd",
  "elicitation",
  "workflow",
  "functional specification",
  "agile",
  "scrum",
  "process improvement",
  "business process",
  "as-is",
  "to-be",
  "jira",
  "confluence",
  "business analysis",
  "process mapping",
  "acceptance criteria",
  "data flow",
  "epics",
  "sprint",
  "current state",
  "future state",
  "data mapping",
];

/** Minimum description keyword hits required to pass Layer 2 */
export const BA_DESC_MIN_MATCHES = 2;

// ── Filter function ────────────────────────────────────────────────────────────

export function isBaRelevant(
  job: Pick<NormalizedJob, "title" | "description">
): boolean {
  const title = job.title.toLowerCase();
  const desc  = (job.description ?? "").toLowerCase();

  // Layer 1a — title must match at least one whitelist entry
  if (!BA_TITLE_WHITELIST.some(re => re.test(title))) return false;

  // Layer 1b — title must not match any blacklist entry
  if (BA_TITLE_BLACKLIST.some(re => re.test(title))) return false;

  // Layer 2 — description must contain enough BA-specific signals
  const hits = BA_DESC_KEYWORDS.filter(kw => desc.includes(kw)).length;
  if (hits < BA_DESC_MIN_MATCHES) return false;

  return true;
}
