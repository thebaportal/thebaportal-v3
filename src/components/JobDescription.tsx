"use client";

import { useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const TOOLS = [
  "Jira", "SQL", "Power BI", "PowerBI", "Excel", "Tableau", "Confluence",
  "Azure", "Python", "BPMN", "Visio", "ServiceNow", "Salesforce", "SharePoint",
  "Teams", "Miro", "Figma", "Lucidchart", "Balsamiq", "DevOps", "Power Apps",
  "Power Automate", "SAP", "Oracle", "ARIS", "Sparx", "Monday", "Asana",
  "Trello", "Notion", "Slack", "GitHub", "Agile", "Scrum", "Kanban",
];

const DOMAINS = [
  "insurance", "finance", "banking", "healthcare", "government", "retail",
  "financial services", "wealth management", "capital markets", "fintech",
  "telecom", "utilities", "energy", "pharma",
];

const SECTION_MAP: { key: string; label: string; re: RegExp }[] = [
  {
    key: "overview",
    label: "Overview",
    re: /^(overview|about\s+(the|this|our|)?\s*(role|position|us|company|team)|summary|position summary|job summary|who we are)/i,
  },
  {
    key: "responsibilities",
    label: "Responsibilities",
    re: /^(responsibilities|what you.?ll do|what you will do|key responsibilities|your role|duties|accountabilities|day.to.day|you will|in this role)/i,
  },
  {
    key: "requirements",
    label: "Requirements",
    re: /^(requirements?|qualifications?|must.have|what (we.?re looking for|you (bring|need|have))|mandatory|minimum qualifications?|you have|you bring|who you are)/i,
  },
  {
    key: "niceToHave",
    label: "Nice to Have",
    re: /^(nice.to.have|preferred|bonus|assets?|additional|would be (an asset|nice|a plus)|assets|asset)/i,
  },
];

const BULLETS_SHOWN = 7;

// ── Text cleaning ────────────────────────────────────────────────────────────

function cleanRaw(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")           // strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")         // collapse 3+ blank lines → 2
    .replace(/[ \t]{2,}/g, " ")         // collapse multiple spaces
    .trim();
}

// ── Parsing ──────────────────────────────────────────────────────────────────

interface Section {
  key: string;
  label: string;
  bullets: string[];
}

function isSectionHeader(line: string): { key: string; label: string } | null {
  const clean = line.replace(/[:•\-*]+$/, "").trim();
  for (const s of SECTION_MAP) {
    if (s.re.test(clean)) return { key: s.key, label: s.label };
  }
  // All-caps short line likely a header
  if (/^[A-Z][A-Z\s\/&]{3,40}$/.test(clean) && clean.split(" ").length <= 6) {
    const lower = clean.toLowerCase();
    if (lower.includes("responsib")) return { key: "responsibilities", label: "Responsibilities" };
    if (lower.includes("require") || lower.includes("qualif")) return { key: "requirements", label: "Requirements" };
    if (lower.includes("nice") || lower.includes("prefer") || lower.includes("asset")) return { key: "niceToHave", label: "Nice to Have" };
    if (lower.includes("overview") || lower.includes("summary") || lower.includes("about")) return { key: "overview", label: "Overview" };
  }
  return null;
}

function lineToBullets(line: string): string[] {
  const stripped = line.replace(/^[\s\-•*·◦▪▸►]+/, "").trim();
  if (!stripped) return [];
  // If long paragraph, split on sentence boundaries
  if (stripped.length > 120 && /[.;]/.test(stripped)) {
    return stripped
      .split(/(?<=[.;])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 8);
  }
  return [stripped];
}

function parse(raw: string): { sections: Section[]; ungrouped: string[] } {
  const text = cleanRaw(raw);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Deduplicate consecutive identical lines
  const deduped: string[] = [];
  for (const l of lines) {
    if (deduped[deduped.length - 1] !== l) deduped.push(l);
  }

  const sections: Section[] = [];
  const ungrouped: string[] = [];
  let current: Section | null = null;

  for (const line of deduped) {
    const header = isSectionHeader(line);
    if (header) {
      // Avoid duplicate sections
      const existing = sections.find(s => s.key === header.key);
      if (existing) {
        current = existing;
      } else {
        current = { key: header.key, label: header.label, bullets: [] };
        sections.push(current);
      }
      continue;
    }

    const bullets = lineToBullets(line);
    if (current) {
      current.bullets.push(...bullets);
    } else {
      ungrouped.push(...bullets);
    }
  }

  // If nothing was grouped, infer sections by keyword heuristic
  if (sections.length === 0) {
    const allBullets = ungrouped.splice(0, ungrouped.length);
    const resp: string[] = [];
    const reqs: string[] = [];
    const nice: string[] = [];
    const over: string[] = [];

    for (const b of allBullets) {
      const l = b.toLowerCase();
      if (/\d+\+?\s*year|\bexperienc|\bcertif|\bcbap|\bccba|\becba|\bmust|\brequired/.test(l)) {
        reqs.push(b);
      } else if (/nice.to|preferred|asset|bonus|would be/.test(l)) {
        nice.push(b);
      } else if (/will\b|responsibl|accountabl|ensur|develop|manag|lead|facilitat|work with|support/.test(l)) {
        resp.push(b);
      } else {
        over.push(b);
      }
    }

    if (over.length)  sections.push({ key: "overview",         label: "Overview",         bullets: over });
    if (resp.length)  sections.push({ key: "responsibilities", label: "Responsibilities", bullets: resp });
    if (reqs.length)  sections.push({ key: "requirements",     label: "Requirements",     bullets: reqs });
    if (nice.length)  sections.push({ key: "niceToHave",       label: "Nice to Have",     bullets: nice });
  }

  // Ensure section order
  const ORDER = ["overview", "responsibilities", "requirements", "niceToHave"];
  sections.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  return { sections, ungrouped };
}

// ── Inline highlighting ──────────────────────────────────────────────────────

const EXP_RE = /\b\d+\+?\s*(?:to\s*\d+\+?\s*)?years?\b/gi;
const TOOL_RE = new RegExp(`\\b(${TOOLS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
const DOMAIN_RE = new RegExp(`\\b(${DOMAINS.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");

type Chunk = { text: string; type: "plain" | "tool" | "domain" | "exp" };

function tokenize(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let remaining = text;
  let i = 0;

  // Build a combined pattern with named capture groups
  const combined = new RegExp(
    `(${EXP_RE.source})|(${TOOL_RE.source})|(${DOMAIN_RE.source})`,
    "gi"
  );

  let last = 0;
  let match: RegExpExecArray | null;
  combined.lastIndex = 0;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) {
      chunks.push({ text: text.slice(last, match.index), type: "plain" });
    }
    const matched = match[0];
    const isExp   = EXP_RE.test(matched);   EXP_RE.lastIndex = 0;
    const isTool  = TOOL_RE.test(matched);  TOOL_RE.lastIndex = 0;
    const type    = isExp ? "exp" : isTool ? "tool" : "domain";
    chunks.push({ text: matched, type });
    last = match.index + matched.length;
  }

  if (last < text.length) chunks.push({ text: text.slice(last), type: "plain" });
  return chunks;
}

function HighlightedText({ text }: { text: string }) {
  const chunks = tokenize(text);
  return (
    <>
      {chunks.map((c, i) => {
        if (c.type === "plain") return <span key={i}>{c.text}</span>;
        if (c.type === "tool") return (
          <span key={i} style={{ background: "rgba(31,191,159,0.12)", color: "#1fbf9f", borderRadius: 4, padding: "1px 5px", fontSize: "0.92em", fontWeight: 600 }}>
            {c.text}
          </span>
        );
        if (c.type === "exp") return (
          <span key={i} style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c", borderRadius: 4, padding: "1px 5px", fontSize: "0.92em", fontWeight: 600 }}>
            {c.text}
          </span>
        );
        // domain
        return (
          <span key={i} style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", borderRadius: 4, padding: "1px 5px", fontSize: "0.92em", fontWeight: 600 }}>
            {c.text}
          </span>
        );
      })}
    </>
  );
}

// ── Section colors ───────────────────────────────────────────────────────────

const SECTION_STYLE: Record<string, { dot: string; label: string }> = {
  overview:         { dot: "#94a3b8", label: "#94a3b8" },
  responsibilities: { dot: "#1fbf9f", label: "#1fbf9f" },
  requirements:     { dot: "#fb923c", label: "#fb923c" },
  niceToHave:       { dot: "#a78bfa", label: "#a78bfa" },
};

// ── Section component ────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);
  const style = SECTION_STYLE[section.key] ?? { dot: "#94a3b8", label: "#94a3b8" };
  const visible = expanded ? section.bullets : section.bullets.slice(0, BULLETS_SHOWN);
  const hasMore = section.bullets.length > BULLETS_SHOWN;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: style.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: style.label, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {section.label}
        </span>
      </div>

      {/* Bullets */}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((b, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: "#2d2d3a", fontSize: 14, lineHeight: "22px", flexShrink: 0, userSelect: "none" }}>—</span>
            <span style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.7 }}>
              <HighlightedText text={b} />
            </span>
          </li>
        ))}
      </ul>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: "'Inter',sans-serif", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4, transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
        >
          {expanded
            ? <>Show less ↑</>
            : <>Show {section.bullets.length - BULLETS_SHOWN} more ↓</>}
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function JobDescription({ description }: { description: string }) {
  const [view, setView] = useState<"clean" | "original">("clean");
  const { sections, ungrouped } = parse(description);
  const rawClean = cleanRaw(description);

  const toggleBtn = (v: "clean" | "original", label: string) => (
    <button
      onClick={() => setView(v)}
      style={{
        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
        border: "1px solid",
        borderColor: view === v ? "rgba(31,191,159,0.3)" : "rgba(255,255,255,0.06)",
        background:  view === v ? "rgba(31,191,159,0.08)" : "transparent",
        color:       view === v ? "#1fbf9f" : "#475569",
        cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {toggleBtn("clean",    "Clean view")}
        {toggleBtn("original", "Original post")}
      </div>

      {view === "original" ? (
        <pre style={{ fontSize: 12, color: "#475569", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap", fontFamily: "'Inter','Open Sans',sans-serif" }}>
          {rawClean}
        </pre>
      ) : (
        <div>
          {sections.map(s => (
            <SectionBlock key={s.key} section={s} />
          ))}
          {/* Any ungrouped bullets that didn't fit a section */}
          {ungrouped.length > 0 && (
            <SectionBlock
              section={{ key: "overview", label: "Other", bullets: ungrouped }}
            />
          )}
          {sections.length === 0 && ungrouped.length === 0 && (
            <p style={{ fontSize: 13, color: "#475569", margin: 0, fontStyle: "italic" }}>
              No description available for this role.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
