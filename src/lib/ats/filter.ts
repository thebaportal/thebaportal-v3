/**
 * Two-layer BA relevance filter.
 *
 * Layer 1 — Title:
 *   a) Must match at least one CORE or BORDERLINE whitelist pattern.
 *   b) Must not match any blacklist pattern.
 *
 * Layer 2 — Description keyword count:
 *   Core titles    → need BA_DESC_MIN_MATCHES (3) hits
 *   Borderline     → need BA_BORDERLINE_MIN_MATCHES (5) hits
 *
 * "Borderline" titles (systems analyst, process analyst, technology analyst,
 * product analyst) are legitimate BA roles but the title alone is not
 * conclusive — they also appear in non-BA contexts (IT ops, data, consulting
 * analyst tracks, etc.). The higher description bar filters those out.
 *
 * Description keywords are intentionally strict BA-specific terms.
 * Generic tech words (agile, scrum, sprint, jira, confluence, workflow) have
 * been removed — they appear in ~70% of all software job descriptions and
 * provide no BA signal.
 */

import type { NormalizedJob } from "./types";

// ── Layer 1a: Core BA titles (standard description bar) ───────────────────────

export const BA_CORE_WHITELIST: RegExp[] = [
  /\bbusiness\s+analyst\b/i,
  /\bbusiness\s+systems?\s+analyst\b/i,
  /\bIT\s+business\s+analyst\b/i,
  /\bjr\.?\s+business\s+analyst\b/i,
  /\bsr\.?\s+business\s+analyst\b/i,
  /\blead\s+business\s+analyst\b/i,
  /\bprincipal\s+business\s+analyst\b/i,
  /\bstaff\s+business\s+analyst\b/i,
  /\brequirements?\s+analyst\b/i,
  /\benterprise\s+analyst\b/i,
  /\bfunctional\s+analyst\b/i,
];

// ── Layer 1b: Borderline titles (elevated description bar) ────────────────────
// These titles match legitimate BA roles but also appear in non-BA contexts.
// They must be backed by a stronger description keyword signal.

export const BA_BORDERLINE_WHITELIST: RegExp[] = [
  /\bsystems?\s+analyst\b/i,
  /\bprocess\s+analyst\b/i,
  /\btechnology\s+analyst\b/i,
  /\bproduct\s+analyst\b/i,
];

// ── Layer 1c: Blacklist — always reject ───────────────────────────────────────

export const BA_TITLE_BLACKLIST: RegExp[] = [
  /\bfinancial\s+analyst\b/i,
  /\brisk\s+analyst\b/i,
  /\bcredit\s+analyst\b/i,
  /\bquantitative\s+analyst\b/i,
  /\binvestment\s+analyst\b/i,
  /\bmarket\s+analyst\b/i,
  /\bmarketing\s+analyst\b/i,
  /\bdata\s+scientist\b/i,
  /\bdata\s+analyst\b/i,
  /\bdata\s+engineer\b/i,
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
  /\bpeople\s+analyst\b/i,
  /\bdevops\b/i,
  /\bmachine\s+learning\b/i,
  /\bml\s+engineer\b/i,
];

// ── Layer 2: Description keywords ─────────────────────────────────────────────
// Strictly BA-specific. Excludes generic tech words (agile, scrum, sprint,
// jira, confluence, workflow, epics) that appear across all software roles.

export const BA_DESC_KEYWORDS: string[] = [
  "requirements",
  "stakeholder",
  "elicitation",
  "user stories",
  "use cases",
  "acceptance criteria",
  "business requirements",
  "gap analysis",
  "brd",
  "frd",
  "functional specification",
  "process analysis",
  "process improvement",
  "business process",
  "as-is",
  "to-be",
  "business analysis",
  "process mapping",
  "current state",
  "future state",
  "data mapping",
];

/** Minimum BA keyword hits for a core BA title (e.g. "Business Analyst") */
export const BA_DESC_MIN_MATCHES = 3;

/** Minimum BA keyword hits for a borderline title (e.g. "Systems Analyst") */
export const BA_BORDERLINE_MIN_MATCHES = 5;

// ── Filter function ────────────────────────────────────────────────────────────

export function isBaRelevant(
  job: Pick<NormalizedJob, "title" | "description">
): boolean {
  const title = job.title.toLowerCase();
  const desc  = (job.description ?? "").toLowerCase();

  // Layer 1c — blacklist always wins
  if (BA_TITLE_BLACKLIST.some(re => re.test(title))) return false;

  // Layer 1a — check for core BA title
  const isCore       = BA_CORE_WHITELIST.some(re => re.test(title));

  // Layer 1b — check for borderline BA title (only if not already core)
  const isBorderline = !isCore && BA_BORDERLINE_WHITELIST.some(re => re.test(title));

  // Title must match something
  if (!isCore && !isBorderline) return false;

  // Layer 2 — count BA-specific description keywords
  const hits = BA_DESC_KEYWORDS.filter(kw => desc.includes(kw)).length;
  const required = isBorderline ? BA_BORDERLINE_MIN_MATCHES : BA_DESC_MIN_MATCHES;

  return hits >= required;
}
