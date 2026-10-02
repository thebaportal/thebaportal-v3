// Project context is usually pasted from Word/PDF, which often puts a list
// bullet on its own line ("•\nEach team has…"). Rendered as-is that reads as a
// stray dot followed by an orphaned sentence, so lone markers are joined to the
// line they introduce before display. The stored text is never modified.

const BULLET_ONLY = /^[•◦▪▫●○■□‣⁃∙·*\-–—]$/;
const BULLET_PREFIX = /^[•◦▪▫●○■□‣⁃∙·*\-–—]\s+/;

export type ContextBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

// One logical line per paragraph/bullet; bullets normalised to "• text".
function contextLines(text: string): string[] {
  const raw = text.replace(/\r\n?/g, "\n").split("\n").map(l => l.trim());
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (BULLET_ONLY.test(line)) {
      let j = i + 1;
      while (j < raw.length && raw[j] === "") j++;
      if (j < raw.length && !BULLET_ONLY.test(raw[j])) {
        out.push(`• ${raw[j].replace(BULLET_PREFIX, "")}`);
        i = j;
      }
      continue;
    }
    out.push(BULLET_PREFIX.test(line) ? `• ${line.replace(BULLET_PREFIX, "")}` : line);
  }
  return out;
}

// Plain text with line breaks kept (for white-space: pre-line previews).
export function normalizeContextText(text: string): string {
  return contextLines(text).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Structured blocks for full rendering: consecutive bullets become one list.
export function parseContextBlocks(text: string): ContextBlock[] {
  const blocks: ContextBlock[] = [];
  for (const line of contextLines(text)) {
    if (!line) continue;
    if (line.startsWith("• ")) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(line.slice(2));
      else blocks.push({ type: "list", items: [line.slice(2)] });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }
  return blocks;
}
