"use client";

import { useState } from "react";
import type { AttentionItem } from "@/lib/projects/attention";
import { normalizeContextText } from "@/lib/projects/contextText";
import ProjectContextDrawer from "./ProjectContextDrawer";

// Project Home is for orientation and re-entry: which project, what was I
// working on, where can I work next. It never recommends a work area or
// implies a sequence — the BA may start anywhere.

// ── Types ──────────────────────────────────────────────────────────────────────
interface Artifact {
  id: string; type: string; status: string; version: number;
  created_at: string; updated_at?: string; source_artifact_ids?: string[];
}
interface Decision {
  id: string; decision_text: string; status: string; created_at: string;
}
interface WorkstreamLite {
  id: string; label: string; question: string; color: string; artifactType: string;
}
interface Project {
  id: string; name: string; problem_statement?: string; methodology?: string;
  organizations?: { name: string };
  created_at?: string; updated_at?: string;
}

interface Props {
  project: Project;
  artifacts: Artifact[];
  decisions: Decision[];
  attentionItems: AttentionItem[];
  workstreams: readonly WorkstreamLite[];
  methodologyLabel: Record<string, string>;
  wsStatusLabel: (artifactType: string, artifacts: Artifact[]) => { label: string; color: string };
  onSelectWs: (wsId: string) => void;
  onOpenIntelligence: () => void;
  onNoteAdded?: (note: { id: string; source_label: string; source_text: string; created_at: string }) => void;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function fmtLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  problem_analysis: "Problem Analysis", stakeholder_analysis: "Stakeholder Analysis",
  requirements: "Requirements", process_map: "Process Analysis",
  user_stories: "User Stories", brd: "Business Case", test_case: "Testing",
};

// Home-only orientation: what each work area covers. Informational labels —
// not artifact types, routes or generation settings.
const AREA_INFO: Record<string, { chips: string[]; about: string }> = {
  "problem-analysis":     { chips: ["Problem statement", "Current state", "Root causes", "Assumptions", "Open questions"], about: "Clarifies the business problem, current situation, root causes, assumptions and unanswered questions." },
  "stakeholder-analysis": { chips: ["Stakeholder list", "Personas", "Power-interest matrix", "Engagement approach"], about: "Identifies the people and groups affected by or able to influence the work, and how they should be engaged." },
  "requirements":         { chips: ["Functional requirements", "Non-functional requirements", "Business rules", "Acceptance criteria", "Traceability matrix"], about: "Defines what the solution must do and the constraints it must meet, including functional and non-functional requirements, business rules and acceptance criteria." },
  "process-analysis":     { chips: ["As-is flow", "Pain points", "To-be flow", "Swimlane"], about: "Examines how work happens today, where problems occur and how the future process could work." },
  "user-stories":         { chips: ["Epics", "User stories", "Acceptance criteria", "Story map"], about: "Translates needs into user-focused delivery items such as epics, stories and acceptance criteria." },
  "business-case":        { chips: ["Objectives", "Options", "Benefits", "Financials", "Risks", "Dependencies"], about: "Examines the business value, options, costs, benefits, risks and rationale for investment or change." },
  "testing":              { chips: ["Test scenarios", "Test cases", "UAT", "RTM"], about: "Defines how requirements and expected outcomes will be validated through scenarios, test cases, UAT and coverage." },
};

// Visual groupings only — not phases, not an order. The BA may start anywhere.
const AREA_GROUPS: { label: string; ids: string[]; className: string }[] = [
  { label: "Analyse & Define", ids: ["problem-analysis", "stakeholder-analysis", "requirements", "process-analysis"], className: "ph-grid ph-grid-2" },
  { label: "Shape & Deliver",  ids: ["user-stories", "business-case", "testing"], className: "ph-grid ph-grid-3" },
];

function PhStyles() {
  return (
    <style>{`
      .ph-wrap { padding: 30px 32px 48px; overflow-y: auto; height: 100%; }
      .ph-inner { max-width: 1400px; margin: 0 auto; }
      .ph-card { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius-lg); padding: 20px 24px; margin-bottom: 16px; }
      .ph-eyebrow { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--lc-text-4); margin-bottom: 10px; }
      .ph-attention-material { border-color: rgba(168,63,50,.3); background: rgba(168,63,50,.04); }
      .ph-quiet-signal { font-size: 12.5px; color: var(--lc-text-3); margin-bottom: 16px; }
      .ph-link-btn { background: none; border: none; color: var(--teal); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; flex-shrink: 0; padding: 0; }
      .ph-brief-text { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

      /* Work areas — compact cards; the whole card opens the work area. */
      .ph-group { margin-bottom: 22px; }
      .ph-grid { display: grid; gap: 12px; }
      .ph-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ph-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ph-area { position: relative; display: flex; flex-direction: column; gap: 10px; text-align: left; cursor: pointer; outline: none;
        background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius); padding: 14px 44px 15px 18px;
        transition: border-color .15s, box-shadow .15s; }
      .ph-area:hover { border-color: rgba(52,64,125,.32); box-shadow: var(--lc-shadow-sm); }
      .ph-area:focus-visible { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(52,64,125,.15); }
      .ph-area:hover .ph-area-chev { color: var(--teal); transform: translateX(2px); }
      .ph-area-chev { position: absolute; right: 16px; top: 50%; margin-top: -7px; color: var(--lc-text-5); transition: color .15s, transform .15s; pointer-events: none; }
      .ph-area-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--lc-text-1); letter-spacing: -0.01em; }
      .ph-pill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; white-space: nowrap; line-height: 1.5; background: var(--lc-bg); border: 1px solid var(--lc-border); color: var(--lc-text-3); }
      .ph-pill-approved { color: var(--lc-green); border-color: var(--lc-green-border); background: var(--lc-green-bg); }
      .ph-pill-none { color: var(--lc-text-4); background: transparent; }
      .ph-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .ph-chip { font-size: 11.5px; color: var(--lc-text-3); background: var(--lc-bg); border: 1px solid var(--lc-border-soft); border-radius: 6px; padding: 2px 8px; white-space: nowrap; }

      /* Info tooltip — hover or keyboard focus on the (i) button. */
      .ph-info { position: relative; display: inline-flex; }
      .ph-info-btn { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border-radius: 50%; border: none; background: none; color: var(--lc-text-5); cursor: help; }
      .ph-info-btn:hover, .ph-info-btn:focus-visible { color: var(--teal); outline: none; }
      .ph-info-btn:focus-visible { box-shadow: 0 0 0 2px rgba(52,64,125,.35); }
      .ph-tip { position: absolute; z-index: 40; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: 280px; max-width: 70vw;
        background: var(--lc-text-1); color: #f5f1e7; font-size: 12px; font-weight: 400; line-height: 1.5; padding: 9px 11px; border-radius: 8px;
        box-shadow: var(--lc-shadow-md); opacity: 0; visibility: hidden; transition: opacity .12s; pointer-events: none; text-align: left; }
      .ph-info:hover .ph-tip, .ph-info-btn:focus-visible + .ph-tip { opacity: 1; visibility: visible; }

      @media (max-width: 1100px) { .ph-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 767px) {
        .ph-wrap { padding: 22px 16px 40px; }
        .ph-grid-2, .ph-grid-3 { grid-template-columns: 1fr; }
        .ph-card { padding: 16px 18px; }
        /* Phones: anchor the tooltip to the width of its card so it can never overflow the screen. */
        .ph-info { position: static; }
        .ph-tip { left: 12px; right: 12px; width: auto; max-width: none; transform: none; bottom: calc(100% + 6px); }
        .ph-header { flex-direction: column; align-items: flex-start !important; }
      }
    `}</style>
  );
}

export default function ProjectHome({
  project, artifacts, decisions, attentionItems, workstreams,
  methodologyLabel, wsStatusLabel, onSelectWs, onOpenIntelligence, onNoteAdded,
}: Props) {
  const hasAnyWork = artifacts.length > 0;
  const [showDrawer, setShowDrawer] = useState(false);

  const material = attentionItems.filter(a => a.severity === "material");
  const noncritical = attentionItems.filter(a => a.severity === "noncritical");

  const active = artifacts.filter(a => a.status !== "superseded" && a.status !== "archived");

  // "Checks meaningfully ran" — enough connection for an all-clear signal to be
  // an honest claim, not just enough for the page to be non-empty. See the
  // locked distinction: no material attention items is NOT the same as clear.
  const hasConnectedWork = artifacts.some(a => (a.source_artifact_ids ?? []).length > 0) || active.length >= 2;
  const checksRan = hasConnectedWork; // findings-based checks folded in via attentionItems already

  const recentEvents = [
    ...active
      .filter(a => a.status === "approved" || a.status === "in_review" || a.status === "superseded")
      .map(a => ({
        id: `art-${a.id}`,
        date: a.updated_at ?? a.created_at,
        text: `${ARTIFACT_TYPE_LABEL[a.type] ?? a.type} → ${a.status === "in_review" ? "In Review" : a.status === "approved" ? "Approved" : "Superseded"}`,
        sub: `v${a.version}`,
      })),
    ...decisions.map(d => ({
      id: `dec-${d.id}`,
      date: d.created_at,
      text: "Decision recorded",
      sub: d.decision_text.slice(0, 60),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Quiet project dates — last updated reflects the latest saved work, not just the project row.
  const lastUpdated = [project.updated_at, ...artifacts.map(a => a.updated_at ?? a.created_at)]
    .filter((d): d is string => !!d).sort().pop();

  const AttentionBlock = ({ items, prominent }: { items: AttentionItem[]; prominent: boolean }) => {
    const grouped = new Map<string, AttentionItem[]>();
    for (const it of items) {
      if (!grouped.has(it.categoryLabel)) grouped.set(it.categoryLabel, []);
      grouped.get(it.categoryLabel)!.push(it);
    }
    return (
      <div className={prominent ? "ph-card ph-attention-material" : "ph-card ph-attention-quiet"}>
        <div className="ph-eyebrow" style={{ color: prominent ? "var(--lc-red)" : "var(--lc-amber)" }}>
          {prominent ? "⚠ Attention" : "Attention"}
        </div>
        {Array.from(grouped.entries()).map(([label, its]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--lc-text-2)", marginBottom: 4 }}>{label}</div>
            {its.map(it => (
              <div key={it.id} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 14px", padding: "4px 0" }}>
                <span style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.55 }}>{it.text}</span>
                <button onClick={onOpenIntelligence} className="ph-link-btn">{it.actionLabel} →</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="ph-wrap">
      <div className="ph-inner">
        {/* Header — project, organisation, quiet dates. No statistics. */}
        <div className="ph-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "6px 24px", marginBottom: 20 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", lineHeight: 1.15, margin: 0 }}>
              {project.name}
            </h1>
            {(project.organizations?.name || project.methodology) && (
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--lc-text-3)" }}>
                {[project.organizations?.name, project.methodology ? (methodologyLabel[project.methodology] ?? project.methodology) : null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          {(project.created_at || lastUpdated) && (
            <div style={{ fontSize: 12, color: "var(--lc-text-4)", whiteSpace: "nowrap", paddingBottom: 3 }}>
              {[project.created_at ? `Created ${fmtLong(project.created_at)}` : null, lastUpdated ? `Updated ${fmtLong(lastUpdated)}` : null].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {/* Project brief — the stored context, line-clamped; full context lives in the drawer. */}
        <div className="ph-card">
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>Project Brief</div>
          {project.problem_statement ? (
            <p className="ph-brief-text" style={{ fontSize: 14, color: "var(--lc-text-2)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
              {normalizeContextText(project.problem_statement)}
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "var(--lc-text-4)", lineHeight: 1.6, margin: 0 }}>No context has been added yet.</p>
          )}
          <button onClick={() => setShowDrawer(true)} className="ph-link-btn" style={{ marginTop: 12 }}>Project context →</button>
        </div>

        {hasAnyWork && attentionItems.length === 0 && checksRan && (
          <div className="ph-quiet-signal">✓ No current issues detected</div>
        )}
        {material.length > 0 && <AttentionBlock items={material} prominent />}

        {material.length === 0 && noncritical.length > 0 && <AttentionBlock items={noncritical} prominent={false} />}

        {/* Work areas — visual groupings only; any area, in any order. Each
            card shows its real state and is the way back into that work. */}
        {AREA_GROUPS.map(group => (
          <section key={group.label} className="ph-group" aria-label={group.label}>
            <div className="ph-eyebrow" style={{ marginBottom: 10 }}>{group.label}</div>
            <div className={group.className}>
              {group.ids.map(id => {
                const ws = workstreams.find(w => w.id === id);
                if (!ws) return null;
                const info = AREA_INFO[id];
                const raw = wsStatusLabel(ws.artifactType, artifacts).label;
                const status = raw === "Approved" ? "Approved" : raw === "Not started" ? "Not started" : "Draft";
                const tipId = `ph-tip-${id}`;
                const open = () => onSelectWs(ws.id);
                return (
                  <div key={id} role="button" tabIndex={0} className="ph-area" onClick={open}
                    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}
                    aria-label={`${ws.label} — ${status}`}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: ws.color, flexShrink: 0 }} />
                      <span className="ph-area-name">{ws.label}</span>
                      <span className="ph-info">
                        <button type="button" className="ph-info-btn" aria-label={`About ${ws.label}`} aria-describedby={tipId}
                          onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/></svg>
                        </button>
                        <span id={tipId} role="tooltip" className="ph-tip">{info.about}</span>
                      </span>
                      <span className={`ph-pill${status === "Approved" ? " ph-pill-approved" : status === "Not started" ? " ph-pill-none" : ""}`} style={{ marginLeft: "auto" }}>{status}</span>
                    </span>
                    <span className="ph-chips">
                      {info.chips.map(c => <span key={c} className="ph-chip">{c}</span>)}
                    </span>
                    <svg className="ph-area-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {recentEvents.length > 0 && (
          <div className="ph-card" style={{ marginTop: 28 }}>
            <div className="ph-eyebrow">Recent changes</div>
            {recentEvents.map(ev => (
              <div key={ev.id} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 12px", padding: "5px 0" }}>
                <span style={{ fontSize: 13, color: "var(--lc-text-2)" }}>{ev.text}</span>
                <span style={{ fontSize: 11.5, color: "var(--lc-text-4)" }}>{ev.sub} · {fmtDateTime(ev.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <PhStyles />
      {showDrawer && <ProjectContextDrawer projectId={project.id} overview={project.problem_statement} onClose={() => setShowDrawer(false)} onNoteAdded={onNoteAdded} />}
    </div>
  );
}
