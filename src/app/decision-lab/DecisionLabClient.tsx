"use client";

import { useState, useEffect, useRef } from "react";
import AppSidebar from "@/components/AppSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "compare-options" | "assess-risks" | "challenge-assumptions" | "analyze-stakeholders" | "recommend-direction";

interface ThoughtBuddyEntry {
  question: string;
  answer: string;
  timestamp: number;
}

interface ModeResult {
  content: string;
  generatedAt: number;
}

interface DecisionSession {
  id: string;
  situation: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  results: Partial<Record<Mode, ModeResult>>;
}

interface Props {
  user: { email: string };
  initialProjectId?: string | null;
}

interface ProjectOption { id: string; name: string; }

// ── Mode config ───────────────────────────────────────────────────────────────

const MODES: { id: Mode; label: string; shortLabel: string; description: string; color: string }[] = [
  {
    id: "compare-options",
    label: "Compare Options",
    shortLabel: "Compare",
    description: "Evaluate alternatives against the factors that matter.",
    color: "#2563eb",
  },
  {
    id: "assess-risks",
    label: "Assess Risks",
    shortLabel: "Risks",
    description: "Identify risks, impact, likelihood, and possible mitigations.",
    color: "#d97706",
  },
  {
    id: "challenge-assumptions",
    label: "Challenge Assumptions",
    shortLabel: "Assumptions",
    description: "Test assumptions and identify what may have been overlooked.",
    color: "#7c3aed",
  },
  {
    id: "analyze-stakeholders",
    label: "Stakeholder Analysis",
    shortLabel: "Stakeholders",
    description: "Examine stakeholder influence, impact, priorities, and potential conflicts.",
    color: "#0d9488",
  },
  {
    id: "recommend-direction",
    label: "Recommend Direction",
    shortLabel: "Recommend",
    description: "Analyze the situation and recommend the strongest course of action.",
    color: "#059669",
  },
];

const STORAGE_KEY = "decision_lab_sessions_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionTitle(situation: string): string {
  const first = situation.trim().split(/[\n.?!]/)[0].trim();
  return first.length > 70 ? first.slice(0, 67) + "..." : first;
}

function loadSessions(): DecisionSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: DecisionSession[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20))); } catch { /* ok */ }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      nodes.push(<h2 key={i} style={{ fontSize: 20, fontWeight: 800, color: "#1C1C2E", letterSpacing: "-0.02em", margin: "0 0 20px", fontFamily: "var(--font-display)" }}>{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "#0d9488", letterSpacing: "0.02em", textTransform: "uppercase" as const, margin: "28px 0 10px", paddingBottom: 6, borderBottom: "1px solid rgba(13,148,136,0.15)", fontFamily: "var(--font-mono)" }}>{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: "#1C1C2E", margin: "18px 0 6px" }}>{line.slice(4)}</h4>);
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4 && !line.slice(2, -2).includes("**")) {
      nodes.push(<div key={i} style={{ fontWeight: 700, color: "#1C1C2E", fontSize: 13.5, margin: "8px 0 4px" }}>{line.replace(/\*\*/g, "")}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d9488", flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s/, "");
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#0d9488", flexShrink: 0, marginTop: 1 }}>{num}</div>
          <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        </div>
      );
    } else if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].includes("---")) tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const rows = tableLines.slice(1).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        nodes.push(
          <div key={i} style={{ overflowX: "auto", margin: "12px 0 20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{headers.map((h, hi) => <th key={hi} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" as const, borderBottom: "2px solid #E5E7EB", whiteSpace: "nowrap", background: "#F9FAFB" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#F9FAFB" }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: "10px 14px", color: "#374151", borderBottom: "1px solid #E5E7EB", lineHeight: 1.5, verticalAlign: "top" }} dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    } else if (line.trim() === "---") {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "20px 0" }} />);
    } else if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: 6 }} />);
    } else if (line.trim()) {
      nodes.push(<p key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, margin: "0 0 8px" }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />);
    }
    i++;
  }
  return nodes;
}

// ── Mode card ─────────────────────────────────────────────────────────────────

function ModeCard({ mode, isActive, isComplete, isLoading, isRunning, onRun }: {
  mode: typeof MODES[0];
  isActive: boolean;
  isComplete: boolean;
  isLoading: boolean;
  isRunning: boolean;
  onRun: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const borderColor = isActive
    ? "#0d9488"
    : hovered
    ? "#CBD5E1"
    : "#E5E7EB";

  const bg = isActive
    ? "rgba(13,148,136,0.05)"
    : hovered
    ? "#FAFAFA"
    : "#fff";

  const labelColor = isActive ? "#0d9488" : "#1C1C2E";
  const shadow = hovered && !isActive ? "0 2px 8px rgba(0,0,0,0.07)" : isActive ? "0 2px 8px rgba(13,148,136,0.12)" : "none";
  const transform = hovered && !isActive ? "translateY(-1px)" : "none";

  return (
    <button
      onClick={onRun}
      disabled={isRunning && !isLoading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 0",
        minWidth: 140,
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 10,
        border: isActive ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
        background: bg,
        cursor: (isRunning && !isLoading) ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 200ms ease",
        boxShadow: shadow,
        transform,
        opacity: (isRunning && !isLoading) ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        {isLoading && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" /></svg>
        )}
        {isComplete && !isLoading && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9488", flexShrink: 0, display: "inline-block" }} />
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: labelColor, lineHeight: 1.3 }}>
          {isLoading ? "Analyzing..." : mode.label}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.55, margin: 0, fontWeight: 400 }}>
        {mode.description}
      </p>
    </button>
  );
}

// ── Input panel ───────────────────────────────────────────────────────────────

function InputPanel({ situation, onChange, onRun, loading, activeMode, completedModes, situationLocked }: {
  situation: string;
  onChange: (v: string) => void;
  onRun: (mode: Mode) => void;
  loading: Mode | null;
  activeMode: Mode | null;
  completedModes: Set<Mode>;
  situationLocked: boolean;
}) {
  const [expanded, setExpanded] = useState(!situationLocked);
  const hasContent = situation.trim().length > 0;

  useEffect(() => { if (!situationLocked) setExpanded(true); }, [situationLocked]);

  return (
    <div>
      {/* Situation input card */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono)", marginBottom: 10 }}>
            What are you working through?
          </div>
          {situationLocked && !expanded ? (
            <button
              onClick={() => setExpanded(true)}
              style={{ width: "100%", textAlign: "left", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#374151", cursor: "pointer", lineHeight: 1.5 }}
            >
              {situation.length > 120 ? situation.slice(0, 117) + "..." : situation}
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>Edit</span>
            </button>
          ) : (
            <textarea
              value={situation}
              onChange={e => onChange(e.target.value)}
              placeholder="Describe the decision, problem, or situation. Include any context that matters."
              rows={situationLocked ? 4 : 6}
              style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#1C1C2E", lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "inherit", background: "#FAFAFA", boxSizing: "border-box", transition: "border-color 180ms ease" }}
              onFocus={e => e.currentTarget.style.borderColor = "#0d9488"}
              onBlur={e => e.currentTarget.style.borderColor = "#E5E7EB"}
            />
          )}
        </div>
      </div>

      {/* Mode cards — revealed once content is present */}
      <div style={{
        marginTop: 16,
        opacity: hasContent ? 1 : 0,
        transform: hasContent ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
        pointerEvents: hasContent ? "auto" : "none",
      }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C2E", marginBottom: 3 }}>Choose an analysis approach</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>Select the approach you want Decision Lab to use.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {MODES.map(m => (
            <ModeCard
              key={m.id}
              mode={m}
              isActive={activeMode === m.id}
              isComplete={completedModes.has(m.id)}
              isLoading={loading === m.id}
              isRunning={loading !== null}
              onRun={() => onRun(m.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ content, generatedAt }: { content: string; generatedAt: number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const ta = document.createElement("textarea");
        ta.value = content;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fail silently */ }
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>
        Generated {timeAgo(generatedAt)}
      </span>
      <button
        onClick={handleCopy}
        style={{ fontSize: 12, fontWeight: 600, color: copied ? "#0d9488" : "#6B7280", background: copied ? "rgba(13,148,136,0.06)" : "none", border: `1px solid ${copied ? "rgba(13,148,136,0.3)" : "#E5E7EB"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ── Level 2 suggestion helpers ────────────────────────────────────────────────

const LEVEL2_HEADING = "## Another Option Worth Considering";
const LEVEL2_CTA = "Add this option and compare again?";

function extractLevel2Name(content: string): string | null {
  const idx = content.indexOf(LEVEL2_HEADING);
  if (idx === -1) return null;
  const section = content.slice(idx);
  const match = section.match(/\*\*([^*\n]{3,80})\*\*/);
  return match?.[1]?.trim() ?? null;
}

function stripLevel2Cta(content: string): string {
  return content.replace(new RegExp(`\\n?${LEVEL2_CTA}\\s*$`), "").trimEnd();
}

// ── Level 2 action bar ────────────────────────────────────────────────────────

function Level2Action({ name, onAdd }: { name: string; onAdd: (n: string) => void }) {
  const [added, setAdded] = useState(false);

  function handle() {
    onAdd(name);
    setAdded(true);
  }

  return (
    <div style={{ marginTop: 20, padding: "14px 18px", background: "#F8F7F4", borderRadius: 10, border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
        Add <strong>{name}</strong> and compare again?
      </span>
      <button
        onClick={handle}
        disabled={added}
        style={{
          flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 7,
          border: added ? "1px solid rgba(13,148,136,0.3)" : "1px solid #CBD5E1",
          background: added ? "rgba(13,148,136,0.06)" : "#fff",
          color: added ? "#0d9488" : "#374151",
          cursor: added ? "default" : "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!added) { e.currentTarget.style.borderColor = "#0d9488"; e.currentTarget.style.color = "#0d9488"; } }}
        onMouseLeave={e => { if (!added) { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#374151"; } }}
      >
        {added ? "Added" : "Add to situation"}
      </button>
    </div>
  );
}

// ── Gate detection helpers ────────────────────────────────────────────────────

const ONE_OPTION_GATE = "I can see one option in what you've described";
const ZERO_OPTION_GATE = "I couldn't identify multiple options to compare";

function isOneOptionGate(content: string) { return content.includes(ONE_OPTION_GATE); }
function isZeroOptionGate(content: string) { return content.includes(ZERO_OPTION_GATE); }
function isGateMessage(content: string) { return isOneOptionGate(content) || isZeroOptionGate(content); }

// ── Suggestions panel ─────────────────────────────────────────────────────────

interface Alternative { name: string; rationale: string; }

function SuggestionsPanel({ situation, onAdd }: {
  situation: string;
  onAdd: (name: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function suggest() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/decision-lab/suggest-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Could not generate suggestions.");
      setAlternatives(data.alternatives ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(name: string) {
    onAdd(name);
    setAdded(prev => new Set([...prev, name]));
  }

  if (alternatives !== null) {
    return (
      <div style={{ marginTop: 20, padding: "20px 24px", background: "#F8F7F4", borderRadius: 12, border: "1px solid #E5E7EB" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono)", marginBottom: 14 }}>
          Alternatives to consider
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alternatives.map((alt, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1C2E", marginBottom: 4 }}>{alt.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.55 }}>{alt.rationale}</div>
              </div>
              <button
                onClick={() => handleAdd(alt.name)}
                disabled={added.has(alt.name)}
                style={{
                  flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                  border: added.has(alt.name) ? "1px solid rgba(13,148,136,0.3)" : "1px solid #E5E7EB",
                  background: added.has(alt.name) ? "rgba(13,148,136,0.06)" : "#fff",
                  color: added.has(alt.name) ? "#0d9488" : "#374151",
                  cursor: added.has(alt.name) ? "default" : "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                {added.has(alt.name) ? "Added" : "Add to situation"}
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "14px 0 0", lineHeight: 1.5 }}>
          To include any of these in a comparison, add them to your situation and run Compare Options again.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 10px" }}>{error}</p>}
      <button
        onClick={suggest}
        disabled={loading}
        style={{
          fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8,
          border: "1px solid #CBD5E1", background: "#fff", color: "#374151",
          cursor: loading ? "default" : "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "#0d9488"; e.currentTarget.style.color = "#0d9488"; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#374151"; }}
      >
        {loading && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" /></svg>
        )}
        {loading ? "Finding alternatives..." : "Suggest alternatives"}
      </button>
    </div>
  );
}

// ── Results panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ activeMode, results, onSwitchMode, loading, situation, onAddToSituation, explorerActive, onExplorerClick }: {
  activeMode: Mode | null;
  results: Partial<Record<Mode, ModeResult>>;
  onSwitchMode: (m: Mode) => void;
  loading: Mode | null;
  situation: string;
  onAddToSituation: (name: string) => void;
  explorerActive: boolean;
  onExplorerClick: () => void;
}) {
  const completedModes = MODES.filter(m => results[m.id]);
  const hasSituation = situation.trim().length > 0;

  if (!hasSituation && !activeMode && completedModes.length === 0) return null;

  const currentResult = activeMode ? results[activeMode] : null;
  const activeConfig = MODES.find(m => m.id === activeMode);
  const showGate = currentResult && isGateMessage(currentResult.content);
  const showSuggestButton = currentResult && isOneOptionGate(currentResult.content);
  const showExplorerContent = explorerActive && !loading;

  const hasAnyTab = completedModes.length > 0 || (activeMode !== null) || hasSituation;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 16 }}>

      {/* Tab bar — always shown when there's a situation */}
      {hasAnyTab && (
        <div style={{ borderBottom: "1px solid #E5E7EB", display: "flex", overflowX: "auto", flexShrink: 0 }}>
          {MODES.map(m => {
            const isComplete = !!results[m.id];
            const isActive = !explorerActive && activeMode === m.id;
            if (!isComplete && !isActive) return null;
            return (
              <button
                key={m.id}
                onClick={() => { onSwitchMode(m.id); }}
                style={{
                  padding: "12px 18px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", background: "none", border: "none",
                  borderBottom: isActive ? `2px solid ${m.color}` : "2px solid transparent",
                  color: isActive ? m.color : "#6B7280",
                  whiteSpace: "nowrap" as const,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isComplete && <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block" }} />}
                {m.shortLabel}
              </button>
            );
          })}

          {/* Decision Explorer tab — always visible when situation exists */}
          {hasSituation && (
            <>
              {completedModes.length > 0 && (
                <div style={{ width: 1, background: "#E5E7EB", margin: "8px 4px", flexShrink: 0 }} />
              )}
              <button
                onClick={onExplorerClick}
                style={{
                  padding: "12px 18px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", background: "none", border: "none",
                  borderBottom: explorerActive ? "2px solid #6366f1" : "2px solid transparent",
                  color: explorerActive ? "#6366f1" : "#6B7280",
                  whiteSpace: "nowrap" as const,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                Decision Explorer
              </button>
            </>
          )}
        </div>
      )}

      {/* Decision Explorer content */}
      {showExplorerContent && (
        <DecisionExplorerPanel situation={situation} />
      )}

      {/* Loading state */}
      {!explorerActive && loading && !currentResult && (
        <div style={{ padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${activeConfig?.color ?? "#0d9488"}20`, borderTop: `3px solid ${activeConfig?.color ?? "#0d9488"}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Running {activeConfig?.label ?? "analysis"}...</p>
        </div>
      )}

      {/* Re-run prompt — shown after a suggested option is added */}
      {!explorerActive && !activeMode && !loading && completedModes.length > 0 && (
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
            Your situation has been updated. Run Compare Options again to include the new alternative.
          </p>
          <button
            onClick={() => onSwitchMode("compare-options")}
            style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "1px solid #0d9488", background: "rgba(13,148,136,0.06)", color: "#0d9488", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}
          >
            Run Compare Options
          </button>
        </div>
      )}

      {/* Empty state — situation entered but no mode run yet and not on Explorer */}
      {!explorerActive && !activeMode && !loading && completedModes.length === 0 && hasSituation && (
        <div style={{ padding: "40px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
            Choose an analysis approach above, or open Decision Explorer to ask a question.
          </p>
        </div>
      )}

      {/* Gate message */}
      {!explorerActive && showGate && !loading && (
        <div style={{ padding: "28px 32px" }}>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{currentResult.content}</p>
          {showSuggestButton && (
            <SuggestionsPanel situation={situation} onAdd={onAddToSituation} />
          )}
        </div>
      )}

      {/* Normal result content */}
      {!explorerActive && currentResult && !showGate && !loading && (
        <div style={{ padding: "28px 32px", maxWidth: 900 }}>
          {renderMarkdown(stripLevel2Cta(currentResult.content))}
          {(() => {
            const name = extractLevel2Name(currentResult.content);
            return name ? <Level2Action name={name} onAdd={onAddToSituation} /> : null;
          })()}
          <CopyButton content={currentResult.content} generatedAt={currentResult.generatedAt} />
        </div>
      )}
    </div>
  );
}

// ── Decision Explorer ─────────────────────────────────────────────────────────

function DecisionExplorerPanel({ situation }: { situation: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ThoughtBuddyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setQuestion("");

    try {
      const res = await fetch("/api/decision-lab/thought-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, question: q }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Something went wrong.");
      setHistory(prev => [...prev, { question: q, answer: data.result, timestamp: Date.now() }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div>
      {/* Empty state header */}
      {history.length === 0 && (
        <div style={{ padding: "28px 32px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1C2E", marginBottom: 4 }}>Decision Explorer</div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
            Ask a question, test a scenario, run the numbers, or challenge the analysis.
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ padding: "0 32px", maxHeight: 560, overflowY: "auto" }}>
          {history.map((entry, i) => (
            <div key={i} style={{ borderBottom: i < history.length - 1 ? "1px solid #F3F4F6" : "none", padding: "24px 0" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Q</span>
                </div>
                <p style={{ fontSize: 14, color: "#1C1C2E", fontWeight: 600, margin: 0, lineHeight: 1.55, paddingTop: 2 }}>{entry.question}</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(13,148,136,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#0d9488" }}>A</span>
                </div>
                <div style={{ flex: 1 }}>
                  {renderMarkdown(entry.answer)}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ padding: history.length > 0 ? "16px 32px 24px" : "4px 32px 24px", borderTop: history.length > 0 ? "1px solid #F3F4F6" : "none" }}>
        {error && <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 10px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this decision…"
            rows={2}
            disabled={loading}
            style={{
              flex: 1, border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, color: "#1C1C2E", lineHeight: 1.6, resize: "none",
              outline: "none", fontFamily: "inherit", background: loading ? "#F9FAFB" : "#FAFAFA",
              boxSizing: "border-box" as const, transition: "border-color 180ms ease",
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={e => e.currentTarget.style.borderColor = "#0d9488"}
            onBlur={e => e.currentTarget.style.borderColor = "#E5E7EB"}
          />
          <button
            onClick={handleAsk}
            disabled={!question.trim() || loading}
            style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 10,
              border: "none", background: (!question.trim() || loading) ? "#E5E7EB" : "#0d9488",
              cursor: (!question.trim() || loading) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 150ms ease",
            }}
          >
            {loading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={!question.trim() ? "#9CA3AF" : "#fff"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#C4C9D4", margin: "8px 0 0", fontFamily: "var(--font-mono)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ── Decision Log ──────────────────────────────────────────────────────────────

function DecisionLog({ sessions, onOpen, onClose, visible }: {
  sessions: DecisionSession[];
  onOpen: (s: DecisionSession) => void;
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }} onClick={onClose}>
      <div style={{ marginLeft: "auto", width: 360, background: "#fff", height: "100%", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1C2E" }}>Decision Log</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>×</button>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.6, margin: 0 }}>No previous decisions yet. Run your first analysis to see it here.</p>
          </div>
        ) : (
          <div style={{ padding: "12px 0" }}>
            {sessions.map(s => {
              const completed = MODES.filter(m => s.results[m.id]);
              return (
                <button
                  key={s.id}
                  onClick={() => { onOpen(s); onClose(); }}
                  style={{ width: "100%", textAlign: "left", padding: "14px 24px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid #F3F4F6" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C2E", marginBottom: 4, lineHeight: 1.4 }}>{s.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{timeAgo(s.createdAt)}</span>
                    {completed.map(m => (
                      <span key={m.id} style={{ fontSize: 10, fontWeight: 700, color: m.color, background: `${m.color}10`, border: `1px solid ${m.color}30`, borderRadius: 4, padding: "1px 6px" }}>{m.shortLabel}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Project picker ───────────────────────────────────────────────────────────

function ProjectPicker({ projects, selectedId, onSelect }: {
  projects: ProjectOption[]; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  return (
    <select
      value={selectedId ?? ""}
      onChange={e => onSelect(e.target.value || null)}
      style={{ fontSize: 13, fontWeight: 600, color: "#1C1C2E", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}
    >
      <option value="">No project</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

// ── Save to project ───────────────────────────────────────────────────────────

function buildDecisionArtifactContent(situation: string, results: Partial<Record<Mode, ModeResult>>): string {
  const parts = [`**Situation**\n${situation.trim()}`];
  for (const m of MODES) {
    const r = results[m.id];
    if (r) parts.push(`## ${m.label}\n${r.content}`);
  }
  return parts.join("\n\n---\n\n");
}

export default function DecisionLabClient({ user, initialProjectId }: Props) {
  const [situation, setSituation] = useState("");
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [results, setResults] = useState<Partial<Record<Mode, ModeResult>>>({});
  const [loading, setLoading] = useState<Mode | null>(null);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [staleWarning, setStaleWarning] = useState(false);
  const [explorerActive, setExplorerActive] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [contextSourceIds, setContextSourceIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const prevSituationRef = useRef("");
  const mainRef = useRef<HTMLElement>(null);
  const situationRef = useRef("");

  const situationLocked = Object.keys(results).length > 0;
  const completedModes = new Set<Mode>(Object.keys(results) as Mode[]);

  useEffect(() => {
    setSessions(loadSessions());
    fetch("/api/projects").then(r => r.json()).then(d => {
      if (Array.isArray(d.projects)) {
        const fetched = d.projects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
        setProjects(fetched);
        // The URL project param is only a selection hint (arriving from Project
        // Workspace) — only trust it once it's confirmed present in this user's own
        // fetched, ownership-scoped project list.
        if (initialProjectId && fetched.some((p: ProjectOption) => p.id === initialProjectId)) {
          setSelectedProjectId(initialProjectId);
        }
      }
    }).catch(() => {});
    // inject styles
    const id = "dl-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style"); s.id = id;
      s.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      document.head.appendChild(s);
    }
  }, []);

  function persistSession(newResults: Partial<Record<Mode, ModeResult>>, sit: string) {
    const all = loadSessions();
    const now = Date.now();
    if (sessionId) {
      const idx = all.findIndex(s => s.id === sessionId);
      if (idx >= 0) {
        all[idx] = { ...all[idx], results: newResults, updatedAt: now };
        setSessions([...all]);
        saveSessions(all);
        return;
      }
    }
    const newId = `dl_${now}`;
    setSessionId(newId);
    const newSession: DecisionSession = {
      id: newId,
      situation: sit,
      title: sessionTitle(sit),
      createdAt: now,
      updatedAt: now,
      results: newResults,
    };
    const updated = [newSession, ...all];
    setSessions(updated);
    saveSessions(updated);
  }

  function handleSituationChange(v: string) {
    if (situationLocked && v !== situation) {
      if (Math.abs(v.length - situation.length) > 20) setStaleWarning(true);
    }
    situationRef.current = v;
    setSituation(v);
  }

  async function runMode(mode: Mode) {
    // Always read from ref — guarantees latest value regardless of render timing
    const currentSituation = situationRef.current || situation;
    if (!currentSituation.trim()) return;
    setActiveMode(mode);
    setExplorerActive(false);
    setError("");

    // Use cached result unless it is a gate message — gate messages must re-run after the user adds options
    const existing = results[mode];
    if (existing && !isGateMessage(existing.content)) return;

    setLoading(mode);
    prevSituationRef.current = currentSituation;

    try {
      const res = await fetch("/api/decision-lab/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: currentSituation.trim(), mode, project_id: selectedProjectId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Analysis failed.");

      const newResults = { ...results, [mode]: { content: data.result, generatedAt: Date.now() } };
      setResults(newResults);
      persistSession(newResults, currentSituation.trim());
      if (Array.isArray(data.source_artifact_ids)) setContextSourceIds(data.source_artifact_ids);
      setSaveStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function openSession(s: DecisionSession) {
    setSituation(s.situation);
    setResults(s.results);
    setSessionId(s.id);
    setActiveMode(Object.keys(s.results)[0] as Mode ?? null);
    setStaleWarning(false);
    setError("");
    setSaveStatus("idle");
    setContextSourceIds([]);
  }

  function startNew() {
    setSituation("");
    setResults({});
    setActiveMode(null);
    setSessionId(null);
    setStaleWarning(false);
    setError("");
    setExplorerActive(false);
    setSaveStatus("idle");
    setContextSourceIds([]);
  }

  async function saveToProject() {
    if (!selectedProjectId || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "decision_lab_output",
          title: sessionTitle(situation),
          content: buildDecisionArtifactContent(situation, results),
          reasoning_context: { tool: "decision-lab", modes: Object.keys(results), saved_at: new Date().toISOString() },
          status: "draft",
          source_artifact_ids: contextSourceIds,
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  function addToSituation(name: string) {
    const updated = (situationRef.current || situation).trimEnd() + `\n\nOption: ${name}`;
    situationRef.current = updated;
    setSituation(updated);
    // Mark compare-options as needing a re-run by storing a sentinel
    // The results panel stays visible so the user can see the re-run prompt
    setResults(prev => {
      const next = { ...prev };
      delete next["compare-options"];
      return next;
    });
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F8F7F4" }}>
      <AppSidebar activeHref="/decision-lab" profile={null} user={user} />

      <main ref={mainRef} style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "40px 40px 60px", maxWidth: 960, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#1C1C2E", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                Decision Lab
              </h1>
              <p style={{ fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                Enter your situation once. Analyze it five different ways.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <ProjectPicker projects={projects} selectedId={selectedProjectId} onSelect={id => { setSelectedProjectId(id); setSaveStatus("idle"); }} />
              {Object.keys(results).length > 0 && selectedProjectId && (
                <button
                  onClick={saveToProject}
                  disabled={saveStatus === "saving"}
                  style={{ fontSize: 13, fontWeight: 700, color: saveStatus === "saved" ? "#0d9488" : "#fff", background: saveStatus === "saved" ? "rgba(13,148,136,0.08)" : "#0d9488", border: saveStatus === "saved" ? "1px solid rgba(13,148,136,0.3)" : "none", borderRadius: 8, padding: "8px 16px", cursor: saveStatus === "saving" ? "default" : "pointer", fontFamily: "inherit" }}
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved to project" : saveStatus === "error" ? "Save failed, retry" : "Save to project"}
                </button>
              )}
              {(situation.trim().length > 0 || Object.keys(results).length > 0) && (
                <button
                  onClick={startNew}
                  style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#374151"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setLogOpen(true)}
                style={{ fontSize: 13, fontWeight: 600, color: "#1C1C2E", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Decision Log
                {sessions.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#0d9488", color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{sessions.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Stale warning */}
          {staleWarning && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 13, color: "#92400E" }}>You have changed your situation. Previous analyses may no longer reflect the updated information.</span>
              <button onClick={() => { setResults({}); setActiveMode(null); setStaleWarning(false); }} style={{ fontSize: 12, fontWeight: 700, color: "#92400E", background: "none", border: "1px solid #FED7AA", borderRadius: 6, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit" }}>
                Clear old results
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#dc2626" }}>
              {error}
            </div>
          )}

          {/* Input panel */}
          <InputPanel
            situation={situation}
            onChange={handleSituationChange}
            onRun={runMode}
            loading={loading}
            activeMode={activeMode}
            completedModes={completedModes}
            situationLocked={situationLocked}
          />

          {/* Results + Decision Explorer */}
          <ResultsPanel
            activeMode={activeMode}
            results={results}
            onSwitchMode={mode => {
              setActiveMode(mode);
              setExplorerActive(false);
              const existing = results[mode];
              if (!existing || isGateMessage(existing.content)) runMode(mode);
            }}
            loading={loading}
            situation={situation}
            onAddToSituation={addToSituation}
            explorerActive={explorerActive}
            onExplorerClick={() => { setExplorerActive(true); setActiveMode(null); }}
          />

        </div>
      </main>

      <DecisionLog
        sessions={sessions}
        onOpen={openSession}
        onClose={() => setLogOpen(false)}
        visible={logOpen}
      />
    </div>
  );
}
