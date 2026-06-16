"use client";

import { useState, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

// ── Template definitions ───────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "brd",
    category: "Requirements",
    categoryColor: "#1fbf9f",
    label: "Business Requirements Document",
    short: "BRD",
    desc: "Full BABOK-aligned BRD covering objectives, scope, stakeholders, requirements, assumptions, risks, and approval sign-off.",
    pages: "8–12 pages",
    standard: "BABOK v3 · Chapter 2",
    sections: ["Executive Summary", "Business Objectives", "Scope", "Stakeholder Register", "Business Requirements", "Assumptions & Constraints", "Risks", "Success Criteria", "Approval"],
    color: "#1fbf9f",
  },
  {
    id: "frd",
    category: "Requirements",
    categoryColor: "#1fbf9f",
    label: "Functional Requirements Document",
    short: "FRD",
    desc: "System-level FRD with functional requirements by module, NFR table, business rules, integration specs, and open issues log.",
    pages: "6–10 pages",
    standard: "BABOK v3 · Chapter 6",
    sections: ["Purpose", "System Overview", "User Types", "Functional Requirements", "Non-Functional Requirements", "Business Rules", "Integration Requirements", "Data Requirements", "Open Issues"],
    color: "#38bdf8",
  },
  {
    id: "usecases",
    category: "Requirements",
    categoryColor: "#1fbf9f",
    label: "Use Case Document",
    short: "Use Cases",
    desc: "Complete use case template with actor table, use case summary matrix, and detailed use case specs including alternative and exception flows.",
    pages: "4–8 pages",
    standard: "BABOK v3 · Chapter 7",
    sections: ["System Overview", "Actor Definitions", "Use Case Summary", "Detailed Use Cases", "Alternative Flows", "Exception Flows"],
    color: "#a78bfa",
  },
  {
    id: "stakeholder-register",
    category: "Stakeholders",
    categoryColor: "#facc15",
    label: "Stakeholder Register",
    short: "RACI",
    desc: "Stakeholder register with influence/interest grid, RACI matrix, engagement strategy, and communication plan template.",
    pages: "3–5 pages",
    standard: "BABOK v3 · Chapter 1",
    sections: ["Stakeholder List", "Influence / Interest Grid", "RACI Matrix", "Engagement Strategy", "Communication Plan"],
    color: "#facc15",
  },
  {
    id: "business-case",
    category: "Strategy",
    categoryColor: "#fb923c",
    label: "Business Case",
    short: "Biz Case",
    desc: "Executive-ready business case covering problem statement, options analysis, cost-benefit, risk assessment, and recommendation.",
    pages: "5–8 pages",
    standard: "BABOK v3 · Chapter 5",
    sections: ["Executive Summary", "Problem Statement", "Options Analysis", "Cost-Benefit Analysis", "Risk Assessment", "Recommendation", "Implementation Roadmap"],
    color: "#fb923c",
  },
  {
    id: "process-map",
    category: "Process",
    categoryColor: "#34d399",
    label: "Process Analysis Template",
    short: "Process",
    desc: "Current state and future state process analysis with swim lane diagram guide, pain point register, and improvement recommendations.",
    pages: "4–6 pages",
    standard: "BABOK v3 · Chapter 10",
    sections: ["Process Overview", "Current State", "Pain Points & Bottlenecks", "Root Cause Analysis", "Future State", "Recommendations", "Metrics"],
    color: "#34d399",
  },
  {
    id: "traceability-matrix",
    category: "Requirements",
    categoryColor: "#1fbf9f",
    label: "Requirements Traceability Matrix",
    short: "RTM",
    desc: "RTM linking business requirements to functional requirements, test cases, and user stories. Tracks status through delivery.",
    pages: "2–4 pages",
    standard: "BABOK v3 · Chapter 8",
    sections: ["Business Requirements", "Functional Requirements", "Test Cases", "User Stories", "Status Tracking"],
    color: "#f87171",
  },
  {
    id: "user-story-backlog",
    category: "Agile",
    categoryColor: "#a78bfa",
    label: "User Story Backlog Template",
    short: "Backlog",
    desc: "Prioritised backlog template with epics, user stories in INVEST format, acceptance criteria, and story point columns.",
    pages: "2–3 pages",
    standard: "Agile · Scrum Guide",
    sections: ["Epic Summary", "User Stories", "Acceptance Criteria", "Priority", "Story Points", "Sprint Assignment"],
    color: "#a78bfa",
  },
];

const CATEGORIES = ["All", "Requirements", "Stakeholders", "Strategy", "Process", "Agile"];

// ── Generate simple Word-compatible document ──────────────────────────────────
function generateDocContent(template: typeof TEMPLATES[0]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return `${template.label.toUpperCase()}

Project: [Project Name]
Version: 1.0
Status: Draft
Date: ${dateStr}
Prepared by: [Your Name]
Organisation: [Organisation Name]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCUMENT CONTROL

Version History
Version | Date | Author | Changes
1.0 | ${dateStr} | [Author] | Initial draft

Review and Approval
Name | Role | Signature | Date
[Name] | [Role] | |
[Name] | [Role] | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${template.sections.map((section, i) => `${i + 1}. ${section.toUpperCase()}

[Complete this section — describe ${section.toLowerCase()} relevant to your project]

`).join("")}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BABOK ALIGNMENT: ${template.standard}
Generated by The BA Portal — Template Studio
theBAportal.com
`;
}

function downloadTemplate(template: typeof TEMPLATES[0]) {
  const content = generateDocContent(template);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${template.short.toLowerCase().replace(/\s+/g, "-")}-template-baportal.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Template card ──────────────────────────────────────────────────────────────
function TemplateCard({ template }: { template: typeof TEMPLATES[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    downloadTemplate(template);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", transition: "border-color .2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${template.color}28`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div style={{ padding: "24px 24px 20px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `${template.color}12`, border: `1px solid ${template.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, color: template.color, textAlign: "center", lineHeight: 1.2 }}>
              {template.short.split(" ").map(w => w[0]).join("").slice(0, 3)}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${template.categoryColor}10`, color: template.categoryColor, border: `1px solid ${template.categoryColor}22`, flexShrink: 0 }}>
            {template.category}
          </span>
        </div>

        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 8, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
          {template.label}
        </div>
        <p style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.65, marginBottom: 14 }}>{template.desc}</p>

        {/* Meta */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {[{ label: template.pages, icon: "📄" }, { label: template.standard, icon: "📋" }].map(m => (
            <span key={m.label} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--t4)" }}>
              {m.icon} {m.label}
            </span>
          ))}
        </div>

        {/* Sections toggle */}
        <button onClick={() => setExpanded(e => !e)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: expanded ? 12 : 0, transition: "color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--t2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
          {expanded ? "Hide sections" : "View sections"}
        </button>

        {expanded && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {template.sections.map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 6, background: `${template.color}08`, color: "var(--t3)", border: `1px solid ${template.color}14` }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Download row */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.01)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--t4)" }}>Word-compatible · Editable</span>
        <button onClick={handleDownload} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, background: downloaded ? "rgba(31,191,159,.12)" : `${template.color}14`, border: `1px solid ${downloaded ? "rgba(31,191,159,.3)" : template.color + "28"}`, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: downloaded ? "var(--teal)" : template.color, transition: "all .2s" }}>
          {downloaded ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Downloaded
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TemplateStudioClient({ profile, user }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = TEMPLATES.filter(t => {
    const matchCat  = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  useEffect(() => {
    const id = "templates-globals";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      :root {
        --bg: #07070a; --bg-1: #0d0d12; --bg-2: #111117;
        --teal: #1fbf9f; --teal-hi: #2ddbb8;
        --t1: #f2f2f8; --t2: #9090a8; --t3: #505068; --t4: #2a2a38;
        --border: rgba(255,255,255,0.07);
        --surface: #0d0d12;
        --text-1: #f2f2f8; --text-2: #9090a8; --text-3: #505068;
        --teal-soft: rgba(31,191,159,0.08); --teal-border: rgba(31,191,159,0.18);
        --font-display: 'Inter', sans-serif;
        --font-body: 'Open Sans', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
        --radius-sm: 10px; --radius: 16px; --radius-lg: 20px;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/templates" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "32px 36px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 6 }}>
              Template Studio
            </h1>
            <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.6 }}>
              BABOK-aligned templates for every deliverable. Download, customise to your organisation, and reuse.
            </p>
          </div>

          {/* Search + filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "0 0 280px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
                style={{ width: "100%", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, color: "var(--t1)", outline: "none", fontFamily: "var(--font-body)", transition: "border-color .2s" }}
                onFocus={e => (e.target.style.borderColor = "rgba(31,191,159,.3)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all .15s", background: activeCategory === cat ? "var(--teal)" : "var(--bg-1)", borderColor: activeCategory === cat ? "var(--teal)" : "var(--border)", color: activeCategory === cat ? "#041a13" : "var(--t3)" }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 20, marginBottom: 28, padding: "14px 20px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, flexWrap: "wrap" }}>
            {[
              { val: TEMPLATES.length, label: "Templates" },
              { val: "BABOK v3", label: "Standard" },
              { val: "Free", label: "All templates" },
              { val: "Word", label: "Compatible format" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--teal)" }}>{s.val}</span>
                <span style={{ fontSize: 12, color: "var(--t4)" }}>{s.label}</span>
                <span style={{ color: "var(--t4)", fontSize: 12, marginLeft: 8 }}>·</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t4)", fontSize: 14 }}>
              No templates match your search.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {filtered.map(t => <TemplateCard key={t.id} template={t} />)}
            </div>
          )}

          {/* Coming soon banner */}
          <div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(167,139,250,.04)", border: "1px solid rgba(167,139,250,.14)", borderRadius: 14, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Organisation templates coming to Pro</div>
              <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Customise any template to your organisation's format, save it, and reuse it every time you generate a document.</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: "rgba(167,139,250,.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,.2)", flexShrink: 0 }}>COMING SOON</span>
          </div>
        </div>
      </main>
    </div>
  );
}
