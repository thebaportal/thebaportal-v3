/**
 * Text cleaning utilities for scraped/ATS job content.
 * Handles HTML entities, unicode escapes, tag stripping, whitespace normalization.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&amp;":   "&",
  "&lt;":    "<",
  "&gt;":    ">",
  "&quot;":  '"',
  "&#39;":   "'",
  "&apos;":  "'",
  "&nbsp;":  " ",
  "&ndash;": "\u2013",
  "&mdash;": "\u2014",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&ldquo;": "\u201c",
  "&rdquo;": "\u201d",
  "&bull;":  "\u2022",
  "&hellip;":"\u2026",
  "&copy;":  "\u00a9",
  "&reg;":   "\u00ae",
};

/**
 * Cleans scraped or ATS-sourced text:
 *  - Decodes named and numeric HTML entities
 *  - Converts literal unicode escape sequences (\u2013 as text) to real chars
 *  - Strips HTML tags
 *  - Normalizes whitespace
 */
export function cleanText(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input;

  // Named HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    s = s.split(entity).join(char);
  }

  // Numeric decimal entities — &#8211;
  s = s.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  // Numeric hex entities — &#x2013;
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Literal escaped unicode sequences in text — \u2013
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Strip HTML/XML tags
  s = s.replace(/<[^>]+>/g, " ");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s || null;
}

/** Clean a title — returns empty string (never null) to keep TS happy. */
export function cleanTitle(input: string | null | undefined): string {
  return cleanText(input) ?? "";
}

/**
 * Produces a normalized string for deduplication:
 * lowercase, strip punctuation, collapse whitespace.
 */
export function normalizeForDedup(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
