"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "requirement" | "business_rule" | "unresolved_question" | "contradiction" | "edge_case";
type ReviewStatus = "proposed" | "accepted" | "rejected";

interface Finding {
  id: string;
  session_id: string;
  category: Category;
  finding_text: string;
  original_finding_text: string | null;
  source_evidence: string | null;
  review_status: ReviewStatus;
  linked_finding_ids: string[];
  created_at: string;
}

interface FullSession {
  id: string;
  project_id: string;
  source_label: string;
  source_text: string;
  status: string;
  created_at: string;
}

interface SessionSummary {
  id: string;
  source_label: string;
  source_preview: string;
  status: string;
  created_at: string;
  finding_count: number;
  reviewed_count: number;
}

interface ProjectOption { id: string; name: string; }

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  initialProjects: ProjectOption[];
  initialProjectId?: string | null;
}

// ── Config ────────────────────────────────────────────────────────────────────
const CATEGORY_META: { id: Category; label: string; color: string }[] = [
  { id: "requirement",          label: "Potential Requirements",  color: "var(--teal)" },
  { id: "business_rule",        label: "Business Rules",          color: "#38bdf8" },
  { id: "unresolved_question",  label: "Unresolved Questions",    color: "#d97706" },
  { id: "contradiction",        label: "Contradictions",          color: "#dc2626" },
  { id: "edge_case",            label: "Possible Edge Cases",     color: "#a78bfa" },
];

const SOURCE_TYPES = ["Meeting Notes", "Workshop Notes", "Interview Notes", "Discovery Notes", "Transcript"];

const REVIEW_STATUS_STYLE: Record<ReviewStatus, { bg: string; text: string; border: string; label: string }> = {
  proposed: { bg: "var(--lc-faint)", text: "var(--lc-text-3)", border: "var(--lc-border)", label: "Proposed" },
  accepted: { bg: "rgba(31,191,159,.1)", text: "#1fbf9f", border: "rgba(31,191,159,.2)", label: "Accepted" },
  rejected: { bg: "rgba(248,113,113,.08)", text: "#f87171", border: "rgba(248,113,113,.2)", label: "Rejected" },
};

const LOADING_MESSAGES = [
  "Reading stakeholder input…",
  "Extracting potential requirements…",
  "Checking for contradictions…",
  "Identifying open questions…",
];

const MIN_INPUT_LENGTH = 40;
const LAST_PROJECT_KEY = "ba_intel_last_project";
const activeSessionKey = (projectId: string) => `ba_intel_active_session_${projectId}`;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Project selection screen ──────────────────────────────────────────────────
function ProjectSelectScreen({ projects, onSelect }: { projects: ProjectOption[]; onSelect: (id: string) => void }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", marginBottom: 8 }}>
        Select a project
      </h1>
      <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.65, marginBottom: 32 }}>
        BA Intelligence findings are saved against a project, so what you accept becomes part of that project&apos;s context.
      </p>

      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 32px", background: "var(--lc-surface)", border: "1px dashed var(--lc-border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.65, maxWidth: 360, margin: "0 auto 20px" }}>
            You don&apos;t have a project yet. Create one, then come back here to start an analysis.
          </p>
          <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", background: "var(--teal)", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", textDecoration: "none" }}>
            Create a project
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", width: "100%", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: "16px 18px", cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, background .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,.3)"; e.currentTarget.style.background = "var(--lc-faint)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--lc-border)"; e.currentTarget.style.background = "var(--lc-surface)"; }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--lc-text-1)" }}>{p.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Link href="/projects/new" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--teal)", textDecoration: "none" }}>
              + Create a new project
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ── Session history panel ─────────────────────────────────────────────────────
function SessionHistoryPanel({ visible, sessions, loading, onOpen, onClose }: {
  visible: boolean; sessions: SessionSummary[]; loading: boolean;
  onOpen: (id: string) => void; onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }} onClick={onClose}>
      <div
        style={{ marginLeft: "auto", width: 380, maxWidth: "90vw", background: "var(--lc-surface)", height: "100%", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--lc-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)" }}>Previous analyses</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--lc-text-4)", lineHeight: 1 }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 13.5, color: "var(--lc-text-4)" }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--lc-text-4)", lineHeight: 1.6, margin: 0 }}>No previous analyses for this project yet.</p>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => onOpen(s.id)}
                style={{ width: "100%", textAlign: "left", padding: "14px 24px", background: "none", border: "none", borderBottom: "1px solid var(--lc-border-soft)", cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--lc-faint)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--lc-text-1)", marginBottom: 3 }}>{s.source_label}</div>
                <div style={{ fontSize: 12, color: "var(--lc-text-4)", marginBottom: 6 }}>{fmtDate(s.created_at)}</div>
                <div style={{ fontSize: 12.5, color: "var(--lc-text-3)", lineHeight: 1.5, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never }}>
                  {s.source_preview}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--lc-text-4)" }}>
                  {s.finding_count} finding{s.finding_count !== 1 ? "s" : ""} · {s.reviewed_count} reviewed
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────
function FindingCard({
  finding, categoryColor, subdued, isEditing, editDraft, onEditDraftChange,
  onStartEdit, onSaveEdit, onCancelEdit, onAccept, onReject, onRestore,
  originalExpanded, onToggleOriginal, cardRef, highlighted, onViewRelated, hasLinkedTarget,
}: {
  finding: Finding; categoryColor: string; subdued: boolean;
  isEditing: boolean; editDraft: string; onEditDraftChange: (v: string) => void;
  onStartEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void;
  onAccept: () => void; onReject: () => void; onRestore: () => void;
  originalExpanded: boolean; onToggleOriginal: () => void;
  cardRef: (el: HTMLDivElement | null) => void; highlighted: boolean;
  onViewRelated: (() => void) | null; hasLinkedTarget: boolean;
}) {
  const hasOriginal = !!finding.original_finding_text;
  const status = REVIEW_STATUS_STYLE[finding.review_status];

  return (
    <div
      ref={cardRef}
      style={{
        background: "var(--lc-surface)",
        border: `1px solid ${highlighted ? "rgba(31,191,159,.5)" : "var(--lc-border)"}`,
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        opacity: subdued ? 0.6 : 1,
        transition: "border-color .3s, opacity .2s",
        boxShadow: highlighted ? "0 0 0 3px rgba(31,191,159,.15)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: categoryColor, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--lc-text-4)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {CATEGORY_META.find(c => c.id === finding.category)?.label}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>
          {status.label}
        </span>
      </div>

      {isEditing ? (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={editDraft}
            onChange={e => onEditDraftChange(e.target.value)}
            autoFocus
            rows={3}
            style={{ width: "100%", fontSize: 14, color: "var(--lc-text-1)", lineHeight: 1.6, fontFamily: "inherit", border: "1px solid rgba(31,191,159,.35)", borderRadius: 8, padding: "10px 12px", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={onSaveEdit} style={{ fontSize: 12.5, fontWeight: 700, color: "#041a13", background: "var(--teal)", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Save</button>
            <button onClick={onCancelEdit} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lc-text-3)", background: "none", border: "1px solid var(--lc-border)", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14.5, color: "var(--lc-text-1)", lineHeight: 1.6, margin: "0 0 10px" }}>{finding.finding_text}</p>
      )}

      {finding.source_evidence && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Source evidence
          </div>
          <div style={{ borderLeft: "3px solid var(--lc-border)", background: "var(--lc-faint)", borderRadius: "0 6px 6px 0", padding: "8px 12px", fontSize: 13, fontStyle: "italic", color: "var(--lc-text-3)", lineHeight: 1.55 }}>
            &ldquo;{finding.source_evidence}&rdquo;
          </div>
        </div>
      )}

      {finding.category === "contradiction" && hasLinkedTarget && onViewRelated && !isEditing && (
        <button
          onClick={onViewRelated}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>
          Conflicts with another finding — view
        </button>
      )}

      {!isEditing && finding.review_status === "proposed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onAccept} style={{ fontSize: 12.5, fontWeight: 700, color: "#041a13", background: "var(--teal)", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Accept</button>
          <button onClick={onStartEdit} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lc-text-2)", background: "none", border: "1px solid var(--lc-border)", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Edit</button>
          <button onClick={onReject} style={{ fontSize: 12.5, fontWeight: 600, color: "#f87171", background: "none", border: "1px solid rgba(248,113,113,.25)", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Reject</button>

          {hasOriginal && (
            <button onClick={onToggleOriginal} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "var(--lc-text-4)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {originalExpanded ? "Hide original AI suggestion" : "View original AI suggestion"}
            </button>
          )}
        </div>
      )}

      {!isEditing && finding.review_status === "rejected" && (
        <button onClick={onRestore} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--lc-text-2)", background: "none", border: "1px solid var(--lc-border)", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>
          Restore to Proposed
        </button>
      )}

      {hasOriginal && originalExpanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--lc-border-soft)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Original AI suggestion
          </div>
          <p style={{ fontSize: 12.5, color: "var(--lc-text-4)", lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>{finding.original_finding_text}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BAIntelligenceClient({ user, profile, initialProjects, initialProjectId }: Props) {
  const [projects] = useState<ProjectOption[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [session, setSession] = useState<FullSession | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);

  const [sourceLabel, setSourceLabel] = useState(SOURCE_TYPES[0]);
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState<SessionSummary[]>([]);

  const [showRejected, setShowRejected] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [expandedOriginal, setExpandedOriginal] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Select a project on mount: prefer the project-aware URL hint (arriving from
  // Project Workspace), validated against initialProjects (already ownership-scoped
  // server-side) before trusting it, same as the pre-existing "last used project"
  // restore below. Reuses selectProject() so an incoming project loads its active
  // session exactly as a manual click does.
  useEffect(() => {
    let cancelled = false;
    if (initialProjectId && initialProjects.some(p => p.id === initialProjectId)) {
      selectProject(initialProjectId);
      setHydrated(true);
      return () => { cancelled = true; };
    }
    const lastProject = localStorage.getItem(LAST_PROJECT_KEY);
    if (lastProject && initialProjects.some(p => p.id === lastProject)) {
      setSelectedProjectId(lastProject);
      const activeSessionId = localStorage.getItem(activeSessionKey(lastProject));
      if (activeSessionId) {
        fetch(`/api/ba-intelligence/sessions/${activeSessionId}`)
          .then(r => (r.ok ? r.json() : null))
          .then(data => {
            if (!cancelled && data?.session) {
              setSession(data.session);
              setFindings(data.findings ?? []);
            }
          })
          .catch(() => {});
      }
    }
    setHydrated(true);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => setLoadingMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 1400);
    return () => clearInterval(id);
  }, [analyzing]);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  function selectProject(id: string) {
    setSelectedProjectId(id);
    localStorage.setItem(LAST_PROJECT_KEY, id);
    setSession(null);
    setFindings([]);
    setError("");
    const activeSessionId = localStorage.getItem(activeSessionKey(id));
    if (activeSessionId) {
      fetch(`/api/ba-intelligence/sessions/${activeSessionId}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.session) { setSession(data.session); setFindings(data.findings ?? []); }
        })
        .catch(() => {});
    }
  }

  function changeProject() {
    setSelectedProjectId(null);
    setSession(null);
    setFindings([]);
    setInputText("");
    setError("");
  }

  function startNewAnalysis() {
    if (selectedProjectId) localStorage.removeItem(activeSessionKey(selectedProjectId));
    setSession(null);
    setFindings([]);
    setInputText("");
    setError("");
    setShowRejected(false);
  }

  async function runAnalysis() {
    if (!selectedProjectId || inputText.trim().length < MIN_INPUT_LENGTH || analyzing) return;
    setAnalyzing(true);
    setError("");
    setLoadingMsgIndex(0);
    try {
      const res = await fetch("/api/ba-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProjectId, source_label: sourceLabel, source_text: inputText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed. Please try again.");
      setSession(data.session);
      setFindings(data.findings ?? []);
      localStorage.setItem(activeSessionKey(selectedProjectId), data.session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    if (!selectedProjectId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/ba-intelligence/sessions?project_id=${selectedProjectId}`);
      const data = await res.json();
      setHistorySessions(res.ok ? data.sessions ?? [] : []);
    } catch {
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openSession(id: string) {
    setHistoryOpen(false);
    try {
      const res = await fetch(`/api/ba-intelligence/sessions/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSession(data.session);
        setFindings(data.findings ?? []);
        setShowRejected(false);
        if (selectedProjectId) localStorage.setItem(activeSessionKey(selectedProjectId), id);
      }
    } catch { /* ignore */ }
  }

  const patchFinding = useCallback(async (id: string, body: { action: string; finding_text?: string }) => {
    try {
      const res = await fetch(`/api/ba-intelligence/findings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.detail || data.error || "That action could not be completed."); return; }
      setFindings(prev => prev.map(f => (f.id === id ? data.finding : f)));
    } catch {
      setActionError("That action could not be completed. Please try again.");
    }
  }, []);

  function accept(id: string) { patchFinding(id, { action: "accept" }); }
  function reject(id: string) { patchFinding(id, { action: "reject" }); }
  function restore(id: string) { patchFinding(id, { action: "restore" }); }
  function startEdit(f: Finding) { setEditingId(f.id); setEditDraft(f.finding_text); }
  function cancelEdit() { setEditingId(null); setEditDraft(""); }
  async function saveEdit(id: string) {
    if (!editDraft.trim()) return;
    await patchFinding(id, { action: "edit", finding_text: editDraft.trim() });
    setEditingId(null);
    setEditDraft("");
  }
  function toggleOriginal(id: string) {
    setExpandedOriginal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function viewRelated(targetId: string) {
    const el = cardRefs.current.get(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(targetId);
    setTimeout(() => setHighlightedId(prev => (prev === targetId ? null : prev)), 1800);
  }

  const rejectedCount = findings.filter(f => f.review_status === "rejected").length;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/ba-intelligence" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        {!hydrated ? null : !selectedProjectId ? (
          <ProjectSelectScreen projects={projects} onSelect={selectProject} />
        ) : (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 32px 60px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                  BA Intelligence
                </h1>
                <p style={{ fontSize: 13.5, color: "var(--lc-text-3)", margin: 0, lineHeight: 1.5 }}>
                  Turn stakeholder input into structured findings you can review and validate.
                </p>
                <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--lc-text-4)" }}>
                  Project: <strong style={{ color: "var(--lc-text-2)" }}>{projects.find(p => p.id === selectedProjectId)?.name}</strong>
                  {" · "}
                  <button onClick={changeProject} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--teal)", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
                    Switch project
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {session && (
                  <button onClick={startNewAnalysis} style={{ fontSize: 13, fontWeight: 600, color: "var(--lc-text-2)", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}>
                    New analysis
                  </button>
                )}
                <button onClick={openHistory} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--lc-text-2)", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
                  History
                </button>
              </div>
            </div>

            {!session ? (
              analyzing ? (
                <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius-lg)", padding: "64px 32px", textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, margin: "0 auto 20px", border: "3px solid var(--lc-border)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "baintel-spin 0.9s linear infinite" }} />
                  <p style={{ fontSize: 14.5, color: "var(--lc-text-2)", fontWeight: 600, margin: 0 }}>{LOADING_MESSAGES[loadingMsgIndex]}</p>
                  <style>{`@keyframes baintel-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div>
                  {error && (
                    <div style={{ background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: "var(--lc-red)" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--lc-text-3)", marginBottom: 8 }}>Source type</label>
                    <select
                      value={sourceLabel}
                      onChange={e => setSourceLabel(e.target.value)}
                      style={{ fontSize: 13.5, fontWeight: 600, color: "var(--lc-text-1)", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Paste stakeholder notes, workshop output, interview notes, or a transcript."
                    rows={14}
                    style={{ width: "100%", fontSize: 14.5, lineHeight: 1.65, color: "var(--lc-text-1)", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: "16px 18px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: inputText.trim().length > 0 && inputText.trim().length < MIN_INPUT_LENGTH ? "#d97706" : "var(--lc-text-4)" }}>
                      {inputText.length} characters
                      {inputText.trim().length > 0 && inputText.trim().length < MIN_INPUT_LENGTH ? ` — paste at least ${MIN_INPUT_LENGTH} characters` : ""}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--lc-text-4)", lineHeight: 1.6, marginTop: 14 }}>
                    Submitted content is sent to our AI provider to be analysed. Avoid pasting information you would not want processed by a third-party AI system.
                  </p>

                  <button
                    onClick={runAnalysis}
                    disabled={inputText.trim().length < MIN_INPUT_LENGTH}
                    style={{
                      marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 26px",
                      background: inputText.trim().length < MIN_INPUT_LENGTH ? "var(--lc-border)" : "var(--teal)",
                      color: inputText.trim().length < MIN_INPUT_LENGTH ? "var(--lc-text-4)" : "#041a13",
                      border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700,
                      cursor: inputText.trim().length < MIN_INPUT_LENGTH ? "not-allowed" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    Analyse Input
                  </button>
                </div>
              )
            ) : (
              <div>
                {actionError && (
                  <div style={{ background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "var(--lc-red)" }}>
                    {actionError}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "var(--lc-text-3)" }}>
                    <strong style={{ color: "var(--lc-text-1)" }}>{session.source_label}</strong> · {fmtDate(session.created_at)}
                  </div>
                  {rejectedCount > 0 && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--lc-text-3)", cursor: "pointer" }}>
                      <input type="checkbox" checked={showRejected} onChange={e => setShowRejected(e.target.checked)} />
                      Show rejected ({rejectedCount})
                    </label>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {CATEGORY_META.map(cat => {
                    const all = findings.filter(f => f.category === cat.id);
                    const visible = all.filter(f => f.review_status !== "rejected" || showRejected);
                    return (
                      <div key={cat.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)", margin: 0 }}>{cat.label}</h2>
                          <span style={{ fontSize: 12, color: "var(--lc-text-4)" }}>({all.length})</span>
                        </div>

                        {all.length === 0 ? (
                          <p style={{ fontSize: 13, color: "var(--lc-text-4)", fontStyle: "italic", margin: 0 }}>No findings identified.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {visible.map(f => {
                              const linkedTarget = f.linked_finding_ids[0];
                              return (
                                <FindingCard
                                  key={f.id}
                                  finding={f}
                                  categoryColor={cat.color}
                                  subdued={f.review_status === "rejected"}
                                  isEditing={editingId === f.id}
                                  editDraft={editDraft}
                                  onEditDraftChange={setEditDraft}
                                  onStartEdit={() => startEdit(f)}
                                  onSaveEdit={() => saveEdit(f.id)}
                                  onCancelEdit={cancelEdit}
                                  onAccept={() => accept(f.id)}
                                  onReject={() => reject(f.id)}
                                  onRestore={() => restore(f.id)}
                                  originalExpanded={expandedOriginal.has(f.id)}
                                  onToggleOriginal={() => toggleOriginal(f.id)}
                                  cardRef={el => { if (el) cardRefs.current.set(f.id, el); else cardRefs.current.delete(f.id); }}
                                  highlighted={highlightedId === f.id}
                                  onViewRelated={linkedTarget ? () => viewRelated(linkedTarget) : null}
                                  hasLinkedTarget={!!linkedTarget}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SessionHistoryPanel
        visible={historyOpen}
        sessions={historySessions}
        loading={historyLoading}
        onOpen={openSession}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}
