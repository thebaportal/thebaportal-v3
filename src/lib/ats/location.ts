/**
 * Canada location resolver for the BrainWave ingestion pipeline.
 *
 * isCanadianLocation() returns true only when the location string clearly
 * and unambiguously resolves to Canada. When in doubt it returns false —
 * the principle is "reject unclear, accept explicit."
 *
 * Accepts:
 *   - "Toronto, ON"                     (province abbreviation)
 *   - "Vancouver, BC"                   (province abbreviation)
 *   - "Ontario, Canada"                 (province name)
 *   - "Canada"                          (country name alone)
 *   - "Remote Canada" / "Canada Remote" (explicit Canada-remote)
 *   - "Remote - Canada"                 (explicit Canada-remote with separator)
 *
 * Rejects:
 *   - "Remote" (no Canada context)
 *   - "Worldwide" / "Global" / "Anywhere"
 *   - "EMEA" / "APAC" / "LATAM"
 *   - Any non-Canadian city or country (India, Poland, UK, US, etc.)
 *   - null / empty string
 */

// ── Canadian province abbreviations ─────────────────────────────────────────
// Note: "CA" intentionally omitted — it collides with California (US state).
// Province abbreviations are always word-bounded to avoid false matches
// inside longer words (e.g. "ON" inside "London" would not match).
const PROVINCE_ABBR_RE = /\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT)\b/;

// ── Canadian province and territory full names ────────────────────────────────
const PROVINCE_NAMES = [
  "ontario",
  "british columbia",
  "alberta",
  "quebec",
  "québec",
  "manitoba",
  "saskatchewan",
  "nova scotia",
  "new brunswick",
  "newfoundland",
  "labrador",
  "prince edward island",
  "northwest territories",
  "nunavut",
  "yukon",
];

// ── Unambiguous Canadian cities ───────────────────────────────────────────────
// Only cities whose name is not shared with a prominent non-Canadian city.
// Deliberately excludes: London (UK), Victoria (Australia), Richmond (US),
// Kingston (Jamaica/UK), Hamilton (Bermuda/NZ/UK), Windsor (UK).
// Those are accepted only when accompanied by a province abbr/name or "Canada".
const UNAMBIGUOUS_CANADIAN_CITIES = [
  "toronto",
  "vancouver",
  "montreal",
  "montréal",
  "calgary",
  "ottawa",
  "edmonton",
  "winnipeg",
  "saskatoon",
  "regina",
  "kelowna",
  "brampton",
  "mississauga",
  "markham",
  "guelph",
  "fredericton",
  "charlottetown",
  "whitehorse",
  "yellowknife",
  "iqaluit",
  "burnaby",
  "surrey",
  "oakville",
  "burlington",
  "barrie",
  "waterloo",
  "thunder bay",
  "sudbury",
  "lethbridge",
  "red deer",
  "medicine hat",
  "fort mcmurray",
  "grande prairie",
  "kamloops",
  "abbotsford",
  "nanaimo",
  "prince george",
  "moncton",
  "north bay",
];

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns true only when the location string clearly resolves to Canada.
 * Null or empty → false. Ambiguous or non-Canadian → false.
 */
export function isCanadianLocation(location: string | null | undefined): boolean {
  if (!location?.trim()) return false;

  const loc = location.trim();
  const lower = loc.toLowerCase();

  // ── Pass 1: explicit "canada" in the string ─────────────────────────────────
  // Covers: "Canada", "Remote Canada", "Toronto, Canada", "Canada Remote", etc.
  // Guard against multi-country strings like "Canada and United States".
  if (/\bcanada\b/i.test(loc)) {
    if (/\b(united\s*states|usa|u\.s\.a?\.?|\busa\b)\b/i.test(loc)) return false;
    return true;
  }

  // ── Pass 2: Canadian province abbreviation ───────────────────────────────────
  // e.g. "Toronto, ON" / "Vancouver, BC" / "Waterloo, ON, Canada"
  if (PROVINCE_ABBR_RE.test(loc)) return true;

  // ── Pass 3: Canadian province full name ─────────────────────────────────────
  // e.g. "Ontario" / "British Columbia" / "Quebec City"
  if (PROVINCE_NAMES.some(p => lower.includes(p))) return true;

  // ── Pass 4: unambiguous Canadian city ───────────────────────────────────────
  // e.g. "Toronto" / "Calgary" / "Mississauga"
  if (UNAMBIGUOUS_CANADIAN_CITIES.some(city => lower.includes(city))) return true;

  // ── Reject everything else ──────────────────────────────────────────────────
  // Catches: "Remote", "Worldwide", "Global", "Anywhere", "EMEA", "APAC",
  // "India", "Poland", "London, UK", "New York, NY", etc.
  return false;
}
