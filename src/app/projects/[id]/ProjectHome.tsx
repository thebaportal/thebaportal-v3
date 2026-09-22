"use client";

import type { AttentionItem } from "@/lib/projects/attention";

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
  name: string; problem_statement?: string; methodology?: string;
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
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  problem_analysis: "Problem Analysis", stakeholder_analysis: "Stakeholder Analysis",
  requirements: "Requirements", process_map: "Process Analysis",
  user_stories: "User Stories", brd: "Business Case", test_case: "Testing",
};

function PhStyles() {
  return (
    <style>{`
      .ph-wrap { padding: 28px 24px 40px; overflow-y: auto; height: 100%; }
      .ph-card { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius-lg); padding: 18px 20px; margin-bottom: 14px; }
      .ph-eyebrow { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--lc-text-4); margin-bottom: 10px; }
      .ph-hero { border-color: rgba(52,64,125,.18); background: rgba(52,64,125,.02); }
      .ph-attention-material { border-color: rgba(168,63,50,.3); background: rgba(168,63,50,.04); }
      .ph-quiet-signal { font-size: 12.5px; color: var(--lc-text-3); margin-bottom: 14px; }
      .ph-primary-btn { background: var(--teal); color: #f5f1e7; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .ph-link-btn { background: none; border: none; color: var(--teal); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; flex-shrink: 0; }
      .ph-secondary-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
      .ph-compact { margin-bottom: 0; padding: 16px 18px; }
      .ph-hero-compact { padding: 12px 16px; }
      .ph-work-row { display: flex; align-items: center; gap: 9px; width: 100%; padding: 6px 2px; background: none; border: none; cursor: pointer; text-align: left; border-radius: 6px; }
      .ph-work-row:hover { background: var(--lc-faint); }
      .ph-door-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      .ph-door { text-align: left; background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius); padding: 14px 14px; cursor: pointer; font-family: inherit; transition: border-color .15s, background .15s; }
      .ph-door:hover { border-color: rgba(52,64,125,.25); background: var(--lc-faint); }
      .ph-door-label { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--lc-text-1); margin-bottom: 4px; }
      .ph-door-question { font-size: 11.5px; color: var(--lc-text-4); line-height: 1.4; }

      @media (max-width: 1100px) {
        .ph-door-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 900px) {
        .ph-secondary-row { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .ph-door-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

export default function ProjectHome({
  project, artifacts, decisions, attentionItems, workstreams,
  methodologyLabel, wsStatusLabel, onSelectWs, onOpenIntelligence,
}: Props) {
  const hasAnyWork = artifacts.length > 0;

  // ── Brand-new project ──────────────────────────────────────────────────────
  if (!hasAnyWork) {
    return (
      <div className="ph-wrap">
        <ProjectHeader project={project} methodologyLabel={methodologyLabel} />
        <div style={{ maxWidth: 720 }}>
          <p style={{ fontSize: 13, color: "var(--lc-text-3)", lineHeight: 1.65, marginBottom: 4 }}>
            <strong style={{ color: "var(--lc-text-1)", fontWeight: 700 }}>Where are you joining this project?</strong>
          </p>
          <p style={{ fontSize: 13, color: "var(--lc-text-4)", lineHeight: 1.65, marginBottom: 22 }}>
            Start with the work you need to do now. TheBAPortal will connect and strengthen the project as context develops.
          </p>
          <div className="ph-door-grid">
            {workstreams.map(ws => (
              <button key={ws.id} onClick={() => onSelectWs(ws.id)} className="ph-door">
                <div className="ph-door-label">{ws.label}</div>
                <div className="ph-door-question">{ws.question}</div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--lc-text-4)", marginTop: 18 }}>
            Starting from the beginning? Problem Analysis is often a useful place to start.
          </p>
        </div>
        <PhStyles />
      </div>
    );
  }

  // ── Established project ─────────────────────────────────────────────────────
  const material = attentionItems.filter(a => a.severity === "material");
  const noncritical = attentionItems.filter(a => a.severity === "noncritical");

  const active = artifacts.filter(a => a.status !== "superseded" && a.status !== "archived");
  const resumable = active
    .filter(a => a.status === "draft" || a.status === "in_review")
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())[0];
  const resumableWs = resumable ? workstreams.find(w => w.artifactType === resumable.type) : null;

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
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "4px 0" }}>
                <span style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.55 }}>{it.text}</span>
                <button onClick={onOpenIntelligence} className="ph-link-btn">{it.actionLabel} →</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const ContinueWorking = () => resumableWs ? (
    <div className="ph-card ph-hero ph-hero-compact">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: resumableWs.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <span className="ph-eyebrow" style={{ margin: 0 }}>Continue Working</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--lc-text-1)" }}>{resumableWs.label}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--lc-text-4)" }}>{resumable!.status === "in_review" ? "In Review" : "Draft"}</span>
        </div>
        <button onClick={() => onSelectWs(resumableWs.id)} className="ph-primary-btn" style={{ flexShrink: 0 }}>Resume →</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="ph-wrap">
      <ProjectHeader project={project} methodologyLabel={methodologyLabel} />

      {attentionItems.length === 0 && checksRan && (
        <div className="ph-quiet-signal">✓ No current issues detected</div>
      )}

      {material.length > 0 && <AttentionBlock items={material} prominent />}
      <ContinueWorking />
      {material.length === 0 && noncritical.length > 0 && <AttentionBlock items={noncritical} prominent={false} />}

      <div className="ph-secondary-row" style={recentEvents.length === 0 ? { gridTemplateColumns: "1fr" } : undefined}>
        <div className="ph-card ph-compact">
          <div className="ph-eyebrow">Work Areas</div>
          {workstreams.map(ws => {
            const st = wsStatusLabel(ws.artifactType, artifacts);
            return (
              <button key={ws.id} onClick={() => onSelectWs(ws.id)} className="ph-work-row">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: ws.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: "var(--lc-text-2)" }}>{ws.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: st.color }}>{st.label}</span>
              </button>
            );
          })}
        </div>

        {recentEvents.length > 0 && (
          <div className="ph-card ph-compact">
            <div className="ph-eyebrow">Recent Changes</div>
            {recentEvents.map(ev => (
              <div key={ev.id} style={{ padding: "5px 0" }}>
                <div style={{ fontSize: 12.5, color: "var(--lc-text-2)" }}>{ev.text}</div>
                <div style={{ fontSize: 10.5, color: "var(--lc-text-4)" }}>{ev.sub} · {fmtDateTime(ev.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <PhStyles />
    </div>
  );
}

function ProjectHeader({ project, methodologyLabel }: { project: Project; methodologyLabel: Record<string, string> }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", marginBottom: 4 }}>
        {project.name}
      </h1>
      {project.problem_statement && (
        <p style={{ fontSize: 13, color: "var(--lc-text-3)", lineHeight: 1.6, maxWidth: 640, marginBottom: 6 }}>
          {project.problem_statement}
        </p>
      )}
      {project.methodology && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(52,64,125,.08)", color: "var(--teal)", border: "1px solid rgba(52,64,125,.15)" }}>
          {methodologyLabel[project.methodology] ?? project.methodology}
        </span>
      )}
    </div>
  );
}
