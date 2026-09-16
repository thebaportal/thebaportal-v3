"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  content: string;
  title: string;
  accentColor?: string;
  onBack: () => void;
  onDownload?: (fmt: "docx" | "txt" | "xlsx") => void;
  downloadFormats?: readonly ("docx" | "txt" | "xlsx")[];
  onCopy?: () => void;
}

// ── Parse markdown tables into data ──────────────────────────────────────────
function parseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const dataLines = lines.filter(l => !l.includes("---"));
  if (dataLines.length < 2) return null;
  const parse = (l: string) => l.split("|").map(c => c.trim().replace(/\*\*/g, "")).filter((_, i, a) => i > 0 && i < a.length - 1);
  return { headers: parse(dataLines[0]), rows: dataLines.slice(1).map(parse) };
}

// ── Parse content into sections for nav ──────────────────────────────────────
function extractSections(content: string): { id: string; label: string }[] {
  return content.split("\n")
    .filter(l => l.startsWith("## "))
    .map(l => {
      const label = l.slice(3).replace(/\*\*/g, "").trim();
      return { id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label };
    });
}

// ── Inline bold parser ────────────────────────────────────────────────────────
function InlineText({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ fontWeight: 700, color: "var(--lc-text-1)" }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Main document renderer ────────────────────────────────────────────────────
export default function DocumentViewer({ content, title, accentColor = "#1fbf9f", onBack, onDownload, downloadFormats = ["docx", "txt"], onCopy }: Props) {
  const sections = extractSections(content);
  const [activeSection, setActiveSection] = useState<string>("");
  const canvasRef = useRef<HTMLDivElement>(null);

  // Track scroll position to highlight active section
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => {
      const headings = canvas.querySelectorAll<HTMLElement>("h2[data-id]");
      let current = "";
      headings.forEach(h => {
        if (h.getBoundingClientRect().top < 160) current = h.dataset.id ?? "";
      });
      setActiveSection(current);
    };
    canvas.addEventListener("scroll", handler);
    return () => canvas.removeEventListener("scroll", handler);
  }, []);

  function scrollTo(id: string) {
    const el = canvasRef.current?.querySelector(`[data-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Parse and render content ──────────────────────────────────────────────
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { nodes.push(<div key={`sp-${i}`} style={{ height: 10 }} />); i++; continue; }

    // H1
    if (t.startsWith("# ")) {
      const text = t.slice(2).replace(/\*\*/g, "");
      nodes.push(
        <h1 key={i} style={{ fontSize: 26, fontWeight: 800, color: "var(--lc-text-1)", margin: "0 0 8px", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
          {text}
        </h1>
      );
      i++; continue;
    }

    // H2
    if (t.startsWith("## ")) {
      const text = t.slice(3).replace(/\*\*/g, "");
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      nodes.push(
        <h2 key={i} data-id={id}
          style={{ fontSize: 19, fontWeight: 700, color: "var(--lc-text-1)", margin: "40px 0 12px", paddingBottom: 8, borderBottom: `2px solid ${accentColor}22`, fontFamily: "var(--font-display)", letterSpacing: "-0.01em", scrollMarginTop: 80 }}>
          <span style={{ color: accentColor, marginRight: 8, fontSize: 14 }}>▸</span>{text}
        </h2>
      );
      i++; continue;
    }

    // H3
    if (t.startsWith("### ")) {
      const text = t.slice(4).replace(/\*\*/g, "");
      nodes.push(
        <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)", margin: "24px 0 8px", fontFamily: "var(--font-display)" }}>
          {text}
        </h3>
      );
      i++; continue;
    }

    // Horizontal rule
    if (t === "---") {
      nodes.push(<div key={i} style={{ height: 1, background: "var(--lc-border)", margin: "24px 0" }} />);
      i++; continue;
    }

    // Table
    if (t.startsWith("|") && i + 1 < lines.length && lines[i + 1]?.includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        nodes.push(
          <div key={`tbl-${i}`} style={{ overflowX: "auto", margin: "16px 0 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {table.headers.map((h, hi) => (
                    <th key={hi} style={{ textAlign: "left", padding: "10px 14px", background: `${accentColor}12`, borderBottom: `2px solid ${accentColor}30`, fontWeight: 700, color: "var(--lc-text-1)", fontSize: 13, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(0,0,0,.02)" : "transparent" }}>
                    {table.headers.map((_, ci) => (
                      <td key={ci} style={{ padding: "9px 14px", borderBottom: "1px solid rgba(0,0,0,.05)", color: "var(--lc-text-2)", lineHeight: 1.6, verticalAlign: "top" }}>
                        <InlineText text={row[ci] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet
    if (t.startsWith("- ") || t.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("- ") || lines[i]?.trim().startsWith("* "))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: "8px 0 16px", paddingLeft: 0, listStyle: "none" }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
              <span style={{ color: accentColor, flexShrink: 0, marginTop: 4, fontSize: 10 }}>●</span>
              <span style={{ fontSize: 15, color: "var(--lc-text-2)", lineHeight: 1.75 }}><InlineText text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]?.trim() ?? "")) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: "8px 0 16px", paddingLeft: 24 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 15, color: "var(--lc-text-2)", lineHeight: 1.75, marginBottom: 7 }}>
              <InlineText text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Analysis complete / confidence block — special callout
    const tLower = t.toLowerCase();
    if (tLower.includes("analysis complete") || tLower.includes("confidence level") || tLower.includes("recommended next workstream")) {
      nodes.push(
        <div key={i} style={{ padding: "10px 16px", background: `${accentColor}08`, border: `1px solid ${accentColor}20`, borderRadius: 8, margin: "6px 0", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ color: accentColor, flexShrink: 0, marginTop: 2, fontSize: 12 }}>◆</span>
          <p style={{ fontSize: 14, color: "var(--lc-text-2)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
            <InlineText text={t.replace(/\*\*/g, "")} />
          </p>
        </div>
      );
      i++; continue;
    }

    // Bold-only line
    if (t.startsWith("**") && t.endsWith("**")) {
      const text = t.slice(2, -2);
      nodes.push(
        <p key={i} style={{ fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)", margin: "20px 0 6px", fontFamily: "var(--font-display)" }}>
          {text}
        </p>
      );
      i++; continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={i} style={{ fontSize: 15, color: "var(--lc-text-2)", lineHeight: 1.8, margin: "0 0 12px" }}>
        <InlineText text={t} />
      </p>
    );
    i++;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--lc-bg)" }}>

      {/* Document toolbar */}
      <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--lc-border)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "var(--lc-surface)" }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--lc-text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--lc-text-2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--lc-text-3)"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to conversation
        </button>
        <div style={{ width: 1, height: 16, background: "var(--lc-border)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--lc-text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onCopy && (
            <button onClick={onCopy} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "none", border: "1px solid var(--lc-border)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--lc-text-3)", transition: "color .15s, border-color .15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--lc-text-2)"; e.currentTarget.style.borderColor = "rgba(0,0,0,.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--lc-text-3)"; e.currentTarget.style.borderColor = "var(--lc-border)"; }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          )}
          {onDownload && (
            <>
              {downloadFormats.map(fmt => (
                <button key={fmt} onClick={() => onDownload(fmt)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "none", border: "1px solid var(--lc-border)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--lc-text-3)", transition: "color .15s, border-color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--lc-text-2)"; e.currentTarget.style.borderColor = "rgba(0,0,0,.14)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--lc-text-3)"; e.currentTarget.style.borderColor = "var(--lc-border)"; }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  .{fmt}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Section nav */}
      {sections.length > 1 && (
        <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--lc-border)", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0, background: "var(--lc-surface)" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              style={{ padding: "4px 10px", borderRadius: 6, background: activeSection === s.id ? `${accentColor}18` : "none", border: `1px solid ${activeSection === s.id ? accentColor + "35" : "var(--lc-border)"}`, cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: activeSection === s.id ? accentColor : "var(--lc-text-3)", whiteSpace: "nowrap", transition: "all .15s" }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Document canvas */}
      <div ref={canvasRef} style={{ flex: 1, overflowY: "auto", padding: "40px 0" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 28px" }}>

          {/* Document header */}
          <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: `3px solid ${accentColor}` }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: accentColor, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
              BA Intelligence Engine
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1.2 }}>
              {title}
            </h1>
            <div style={{ fontSize: 13, color: "var(--lc-text-3)" }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Document body */}
          <div>{nodes}</div>
        </div>
      </div>
    </div>
  );
}
