"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, Zap, BarChart2, ChevronRight, ChevronLeft,
  Clock, CheckCircle, XCircle, RotateCcw, ArrowLeft,
  Play, TrendingUp, Award, AlertCircle, Layers,
} from "lucide-react";
import {
  AREA_LABELS, AREA_SHORT, BABOKArea, ExamQuestion, QUESTIONS,
  selectPracticeQuestions, selectMockQuestions,
} from "@/data/examQuestions";

// ── Types ───────────────────────────────────────────────────────────────────
type View =
  | "home" | "practice-session" | "practice-results"
  | "mock-intro" | "mock-session" | "mock-results" | "my-results";

type AreaOrAll = BABOKArea | "all";

interface PracticeSetup {
  area: AreaOrAll;
  count: 10 | 20 | 50;
  difficulty: "ecba" | "ccba" | "cbap" | "mixed";
}

interface ResultRecord {
  id: string;
  mode: "practice" | "mock";
  area?: string;
  difficulty?: string;
  score: number;
  total: number;
  area_breakdown: Record<string, { correct: number; total: number }>;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const AREAS: BABOKArea[] = [
  "planning", "elicitation", "lifecycle", "strategy",
  "analysis", "evaluation", "agile",
  "bi", "architecture", "it", "bpm", "competencies",
];

const MOCK_DURATION = 90 * 60;

const AREA_COLORS: Record<BABOKArea, string> = {
  planning: "#06b6d4",
  elicitation: "#8b5cf6",
  lifecycle: "#10b981",
  strategy: "#f59e0b",
  analysis: "#ef4444",
  evaluation: "#3b82f6",
  agile: "#f97316",
  bi: "#ec4899",
  architecture: "#6366f1",
  it: "#14b8a6",
  bpm: "#a855f7",
  competencies: "#84cc16",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectAllAreaQuestions(count: number, difficulty: string): ExamQuestion[] {
  let pool = [...QUESTIONS];
  if (difficulty !== "mixed") pool = pool.filter(q => q.difficulty === difficulty);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function computeAreaBreakdown(questions: ExamQuestion[], answers: (number | null)[]) {
  const bd: Record<string, { correct: number; total: number }> = {};
  for (const area of AREAS) bd[area] = { correct: 0, total: 0 };
  questions.forEach((q, i) => {
    bd[q.area].total++;
    if (answers[i] === q.correctIndex) bd[q.area].correct++;
  });
  return bd;
}

// ── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ scores, size = 240 }: { scores: Partial<Record<string, number>>; size?: number }) {
  const center = size / 2;
  const maxR = size * 0.34;
  const n = AREAS.length;
  const pt = (i: number, r: number) => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(l => (
        <polygon key={l}
          points={AREAS.map((_, i) => { const p = pt(i, maxR * l); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="var(--border)" strokeWidth={l === 1 ? 1.5 : 1}
          strokeDasharray={l < 1 ? "3,3" : undefined} />
      ))}
      {AREAS.map((_, i) => {
        const p = pt(i, maxR);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon
        points={AREAS.map((a, i) => { const r = ((scores[a] ?? 0) / 100) * maxR; const p = pt(i, r); return `${p.x},${p.y}`; }).join(" ")}
        fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth={2} />
      {AREAS.map((a, i) => {
        const r = ((scores[a] ?? 0) / 100) * maxR;
        const p = pt(i, r);
        return <circle key={a} cx={p.x} cy={p.y} r={3} fill="#06b6d4" />;
      })}
      {AREAS.map((a, i) => {
        const p = pt(i, maxR + 20);
        return (
          <text key={a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="var(--text-3)" fontFamily="inherit">{AREA_SHORT[a as BABOKArea]}</text>
        );
      })}
    </svg>
  );
}

// ── BABOK Wheel Diagram (professional visual, no emojis) ─────────────────────
function BABOKWheelDiagram() {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 88;
  const innerR = 36;
  const n = 7;
  const coreAreas: BABOKArea[] = ["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation", "agile"];
  const segments = coreAreas.map((area, i) => {
    const startAngle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const gap = 0.04;
    const x1 = cx + outerR * Math.cos(startAngle + gap);
    const y1 = cy + outerR * Math.sin(startAngle + gap);
    const x2 = cx + outerR * Math.cos(endAngle - gap);
    const y2 = cy + outerR * Math.sin(endAngle - gap);
    const x3 = cx + innerR * Math.cos(endAngle - gap);
    const y3 = cy + innerR * Math.sin(endAngle - gap);
    const x4 = cx + innerR * Math.cos(startAngle + gap);
    const y4 = cy + innerR * Math.sin(startAngle + gap);
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = (outerR + innerR) / 2;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    return { area, x1, y1, x2, y2, x3, y3, x4, y4, lx, ly, startAngle, endAngle, midAngle };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map(({ area, x1, y1, x2, y2, x3, y3, x4, y4, startAngle, endAngle }) => {
        const r = outerR;
        const ri = innerR;
        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        const d = [
          `M ${x4} ${y4}`,
          `A ${ri} ${ri} 0 ${largeArc} 1 ${x3} ${y3}`,
          `L ${x2} ${y2}`,
          `A ${r} ${r} 0 ${largeArc} 0 ${x1} ${y1}`,
          "Z",
        ].join(" ");
        return (
          <path key={area} d={d}
            fill={`${AREA_COLORS[area]}22`}
            stroke={AREA_COLORS[area]}
            strokeWidth={1.5} />
        );
      })}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="var(--bg-2)" stroke="var(--border)" strokeWidth={1} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--text-2)" fontFamily="inherit">BABOK</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="7" fill="var(--text-4)" fontFamily="inherit">v3 Core</text>
      {segments.map(({ area, lx, ly }) => (
        <circle key={`dot-${area}`} cx={lx} cy={ly} r={3} fill={AREA_COLORS[area]} opacity={0.9} />
      ))}
    </svg>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  background: "var(--teal)", color: "#fff", border: "none",
  borderRadius: "8px", padding: "10px 20px", fontSize: "13px",
  fontWeight: 700, cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: "6px", whiteSpace: "nowrap",
};
const btnSecondary: React.CSSProperties = {
  background: "var(--bg-2)", border: "1px solid var(--border)",
  borderRadius: "8px", padding: "9px 18px", fontSize: "13px",
  fontWeight: 600, color: "var(--text-2)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
};
const btnDanger: React.CSSProperties = {
  background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.35)",
  borderRadius: "8px", padding: "10px 20px", fontSize: "13px",
  fontWeight: 700, cursor: "pointer", color: "#8b5cf6",
  display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
};

// ── Main Component ───────────────────────────────────────────────────────────
interface ExamClientProps { tier: string; }

export default function ExamClient({ tier: _tier }: ExamClientProps) {
  const [view, setView] = useState<View>("home");
  const [setup, setSetup] = useState<PracticeSetup>({ area: "planning", count: 20, difficulty: "mixed" });

  // Practice state
  const [practiceQs, setPracticeQs] = useState<ExamQuestion[]>([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<(number | null)[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  // Mock state
  const [mockQs, setMockQs] = useState<ExamQuestion[]>([]);
  const [mockIdx, setMockIdx] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<(number | null)[]>([]);
  const [mockTimeLeft, setMockTimeLeft] = useState(MOCK_DURATION);
  const [mockRunning, setMockRunning] = useState(false);
  const [mockDone, setMockDone] = useState(false);

  // Results state
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Exit warning (back button / page unload guard)
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Back button and page-close guard during active sessions
  const sessionActive = view === "practice-session" || view === "mock-session";
  useEffect(() => {
    if (!sessionActive) return;
    // Push a dummy history entry so the back button triggers popstate
    // instead of immediately navigating away
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      // Re-push so the next back press is also intercepted
      window.history.pushState(null, "", window.location.href);
      setShowExitWarning(true);
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionActive]);

  // Mock timer
  useEffect(() => {
    if (!mockRunning || mockDone) return;
    if (mockTimeLeft <= 0) { void submitMock(); return; }
    const t = setInterval(() => setMockTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockRunning, mockDone, mockTimeLeft]);

  // Load results
  useEffect(() => {
    if (view !== "my-results") return;
    setResultsLoading(true);
    fetch("/api/exam/results")
      .then(r => r.json())
      .then(d => setResults(d.results ?? []))
      .catch(() => {})
      .finally(() => setResultsLoading(false));
  }, [view]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function startPractice() {
    const qs = setup.area === "all"
      ? selectAllAreaQuestions(setup.count, setup.difficulty)
      : selectPracticeQuestions(setup.area, setup.count, setup.difficulty);
    setPracticeQs(qs);
    setPracticeIdx(0);
    setPracticeAnswers(new Array(qs.length).fill(null));
    setShowFeedback(false);
    setView("practice-session");
  }

  function answerPractice(i: number) {
    if (showFeedback) return;
    setPracticeAnswers(prev => { const a = [...prev]; a[practiceIdx] = i; return a; });
    setShowFeedback(true);
  }

  async function finishPractice() {
    const bd = computeAreaBreakdown(practiceQs, practiceAnswers);
    const correct = practiceAnswers.filter((a, i) => a === practiceQs[i].correctIndex).length;
    try {
      await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "practice", area: setup.area, difficulty: setup.difficulty, score: correct, total: practiceQs.length, areaBreakdown: bd }),
      });
    } catch { /* fail silently */ }
    setView("practice-results");
  }

  function startMock() {
    const qs = selectMockQuestions();
    setMockQs(qs);
    setMockIdx(0);
    setMockAnswers(new Array(qs.length).fill(null));
    setMockTimeLeft(MOCK_DURATION);
    setMockDone(false);
    setMockRunning(true);
    setView("mock-session");
  }

  async function submitMock() {
    if (mockDone) return;
    setMockDone(true);
    setMockRunning(false);
    const bd = computeAreaBreakdown(mockQs, mockAnswers);
    const correct = mockAnswers.filter((a, i) => a === mockQs[i]?.correctIndex).length;
    try {
      await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "mock", score: correct, total: mockQs.length, areaBreakdown: bd }),
      });
    } catch { /* fail silently */ }
    setView("mock-results");
  }

  function goHome() { setView("home"); setMockRunning(false); }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const practiceScore = practiceQs.length > 0
    ? practiceAnswers.filter((a, i) => a === practiceQs[i]?.correctIndex).length : 0;
  const practicePct = practiceQs.length > 0 ? Math.round((practiceScore / practiceQs.length) * 100) : 0;

  const mockScore = mockQs.length > 0
    ? mockAnswers.filter((a, i) => a === mockQs[i]?.correctIndex).length : 0;
  const mockPct = mockQs.length > 0 ? Math.round((mockScore / mockQs.length) * 100) : 0;
  const mockBd = mockQs.length > 0 ? computeAreaBreakdown(mockQs, mockAnswers) : {};

  const radarScores = (() => {
    const totals: Record<string, { sum: number; n: number }> = {};
    for (const r of results) {
      for (const [area, bd] of Object.entries(r.area_breakdown)) {
        if (bd.total === 0) continue;
        if (!totals[area]) totals[area] = { sum: 0, n: 0 };
        totals[area].sum += (bd.correct / bd.total) * 100;
        totals[area].n++;
      }
    }
    return Object.fromEntries(Object.entries(totals).map(([a, { sum, n }]) => [a, Math.round(sum / n)]));
  })();

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.score / r.total) * 100, 0) / results.length) : null;
  const mockResults = results.filter(r => r.mode === "mock");
  const mockAvg = mockResults.length > 0
    ? Math.round(mockResults.reduce((s, r) => s + (r.score / r.total) * 100, 0) / mockResults.length) : null;

  // ── Area nav data ────────────────────────────────────────────────────────────
  const areaStats: Record<string, { done: number; avg: number | null }> = {};
  for (const area of AREAS) {
    const relevant = results.filter(r => r.area_breakdown[area]?.total > 0);
    const done = relevant.reduce((s, r) => s + (r.area_breakdown[area]?.total ?? 0), 0);
    const avg = relevant.length > 0
      ? Math.round(relevant.reduce((s, r) => {
          const bd = r.area_breakdown[area];
          return s + (bd.total > 0 ? (bd.correct / bd.total) * 100 : 0);
        }, 0) / relevant.length)
      : null;
    areaStats[area] = { done, avg };
  }

  // ── Exit warning modal ───────────────────────────────────────────────────────
  const ExitWarningModal = showExitWarning ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: "16px", padding: "32px", maxWidth: "420px", width: "100%",
        margin: "0 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-1)", marginBottom: "10px" }}>
          Leave this session?
        </div>
        <p style={{ fontSize: "14px", color: "var(--text-3)", lineHeight: 1.75, margin: "0 0 24px" }}>
          {view === "mock-session"
            ? "Your mock exam progress will be lost, including your timer and all answers. This cannot be undone."
            : "Your practice session progress will be lost. Your answers so far will not be saved."}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { setShowExitWarning(false); goHome(); }}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            Yes, leave session
          </button>
          <button
            onClick={() => setShowExitWarning(false)}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", background: "var(--teal)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            Stay in session
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Layout wrapper (used by all main views) ──────────────────────────────────
  function Workspace({ children, rightPanel, centerTitle }: {
    children: React.ReactNode;
    rightPanel?: React.ReactNode;
    centerTitle?: string;
  }) {
    const areaOptions: { value: AreaOrAll; label: string }[] = [
      { value: "all", label: "All Knowledge Areas" },
      { value: "planning", label: "Planning and Monitoring" },
      { value: "elicitation", label: "Elicitation and Collaboration" },
      { value: "lifecycle", label: "Requirements Lifecycle" },
      { value: "strategy", label: "Strategy Analysis" },
      { value: "analysis", label: "Analysis and Design Definition" },
      { value: "evaluation", label: "Solution Evaluation" },
      { value: "agile", label: "Agile Perspective" },
      { value: "bi", label: "BI Perspective" },
      { value: "architecture", label: "Business Architecture" },
      { value: "it", label: "IT Perspective" },
      { value: "bpm", label: "BPM Perspective" },
      { value: "competencies", label: "Underlying Competencies" },
    ];

    const sessionActive = view === "practice-session" || view === "mock-session";

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)", display: "flex", flexDirection: "column" }}>
        {ExitWarningModal}

        {/* TOP CONTROL BAR */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "var(--bg-1)", borderBottom: "1px solid var(--border)",
          padding: "0 24px",
        }}>
          {/* Readiness strip */}
          <div style={{
            display: "flex", alignItems: "center", gap: "32px",
            padding: "8px 0", borderBottom: "1px solid var(--border)",
            fontSize: "11px", color: "var(--text-4)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: avgScore != null && avgScore >= 70 ? "#10b981" : "#f59e0b" }} />
              <span style={{ fontWeight: 600, color: "var(--text-3)" }}>Practice Accuracy</span>
              <span style={{ fontWeight: 800, color: avgScore != null ? (avgScore >= 70 ? "#10b981" : "#f59e0b") : "var(--text-4)" }}>
                {avgScore != null ? `${avgScore}%` : "No data yet"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: mockAvg != null && mockAvg >= 70 ? "#10b981" : "#8b5cf6" }} />
              <span style={{ fontWeight: 600, color: "var(--text-3)" }}>Mock Average</span>
              <span style={{ fontWeight: 800, color: mockAvg != null ? (mockAvg >= 70 ? "#10b981" : "#8b5cf6") : "var(--text-4)" }}>
                {mockAvg != null ? `${mockAvg}%` : "Not attempted"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4" }} />
              <span style={{ fontWeight: 600, color: "var(--text-3)" }}>Sessions</span>
              <span style={{ fontWeight: 800, color: "#06b6d4" }}>{results.length}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 600, color: "var(--text-3)" }}>450 questions across 12 BABOK knowledge areas</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setView("my-results")}
                style={{ ...btnSecondary, padding: "5px 12px", fontSize: "11px" }}>
                <BarChart2 size={11} /> My Results
              </button>
            </div>
          </div>

          {/* Main control bar */}
          {!sessionActive && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <Layers size={14} color="var(--text-4)" />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em" }}>KNOWLEDGE AREA</span>
              </div>
              <select
                value={setup.area}
                onChange={e => setSetup(p => ({ ...p, area: e.target.value as AreaOrAll }))}
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "var(--text-1)", cursor: "pointer", fontWeight: 600, minWidth: "200px" }}>
                {areaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <div style={{ width: "1px", height: "28px", background: "var(--border)" }} />

              <select
                value={setup.count}
                onChange={e => setSetup(p => ({ ...p, count: Number(e.target.value) as 10 | 20 | 50 }))}
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "var(--text-1)", cursor: "pointer", fontWeight: 600 }}>
                <option value={10}>10 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={50}>50 Questions</option>
              </select>

              <select
                value={setup.difficulty}
                onChange={e => setSetup(p => ({ ...p, difficulty: e.target.value as PracticeSetup["difficulty"] }))}
                style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "7px 10px", fontSize: "12px", color: "var(--text-1)", cursor: "pointer", fontWeight: 600 }}>
                <option value="mixed">Mixed Difficulty</option>
                <option value="ecba">ECBA Level</option>
                <option value="ccba">CCBA Level</option>
                <option value="cbap">CBAP Level</option>
              </select>

              <button style={btnPrimary} onClick={startPractice}>
                <Play size={13} /> Start Practice
              </button>

              <button style={btnDanger} onClick={() => setView("mock-intro")}>
                <Zap size={13} /> Mock Exam
              </button>

              {view !== "home" && (
                <button style={{ ...btnSecondary, marginLeft: "auto" }} onClick={goHome}>
                  <ArrowLeft size={13} /> Home
                </button>
              )}
            </div>
          )}

          {/* Session top bar */}
          {sessionActive && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "10px 0" }}>
              <button onClick={goHome} style={{ ...btnSecondary, padding: "6px 12px", fontSize: "12px" }}>
                <ArrowLeft size={13} /> Exit
              </button>
              {view === "practice-session" && (
                <>
                  <div style={{ flex: 1, height: "5px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((practiceIdx + 1) / practiceQs.length) * 100}%`, background: "var(--teal)", borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-3)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Question {practiceIdx + 1} of {practiceQs.length}
                  </span>
                </>
              )}
              {view === "mock-session" && (
                <>
                  <div style={{ flex: 1, height: "5px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((mockIdx + 1) / mockQs.length) * 100}%`, background: "#8b5cf6", borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: mockTimeLeft < 600 ? "#ef4444" : "var(--text-2)", whiteSpace: "nowrap" }}>
                    <Clock size={14} />
                    <span style={{ fontSize: "15px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtTime(mockTimeLeft)}</span>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-4)", whiteSpace: "nowrap" }}>
                    {mockAnswers.filter(a => a !== null).length} of {mockQs.length} answered
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* MAIN WORKSPACE */}
        <div style={{ display: "flex", flex: 1, maxWidth: "1400px", width: "100%", margin: "0 auto", alignItems: "flex-start" }}>

          {/* LEFT SIDEBAR */}
          <div style={{
            width: "240px", flexShrink: 0, borderRight: "1px solid var(--border)",
            minHeight: "calc(100vh - 100px)", padding: "20px 0", position: "sticky", top: "100px",
            overflowY: "auto",
          }}>
            <div style={{ padding: "0 16px 12px", fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em" }}>
              BABOK KNOWLEDGE AREAS
            </div>
            {AREAS.map(area => {
              const stats = areaStats[area];
              const isActive = setup.area === area;
              const color = AREA_COLORS[area];
              return (
                <button key={area}
                  onClick={() => { setSetup(p => ({ ...p, area })); }}
                  style={{
                    width: "100%", textAlign: "left", background: isActive ? `${color}0f` : "transparent",
                    border: "none", borderLeft: `3px solid ${isActive ? color : "transparent"}`,
                    padding: "10px 16px 10px 13px", cursor: "pointer", transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: isActive ? color : "var(--text-2)", lineHeight: 1.3 }}>
                      {AREA_SHORT[area]}
                    </span>
                  </div>
                  <div style={{ paddingLeft: "15px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-4)", marginBottom: "4px" }}>
                      {stats.done > 0 ? `${stats.done} questions done` : "Not started"}
                      {stats.avg != null && ` · ${stats.avg}% avg`}
                    </div>
                    <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (stats.done / 40) * 100)}%`, background: color, borderRadius: "2px" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CENTER WORKSPACE */}
          <div style={{ flex: 1, minWidth: 0, padding: "28px 32px" }}>
            {centerTitle && (
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-1)", margin: 0 }}>{centerTitle}</h2>
              </div>
            )}
            {children}
          </div>

          {/* RIGHT PANEL */}
          {rightPanel && (
            <div style={{
              width: "280px", flexShrink: 0, borderLeft: "1px solid var(--border)",
              minHeight: "calc(100vh - 100px)", padding: "20px", position: "sticky",
              top: "100px", overflowY: "auto",
            }}>
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "home") {
    const sessionEstimate = setup.count <= 10 ? "10 to 15 min" : setup.count <= 20 ? "20 to 30 min" : "50 to 60 min";
    return (
      <Workspace
        centerTitle="Business Analysis Certification Practice"
        rightPanel={
          <div>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "16px" }}>SESSION CONFIGURATION</div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-4)" }}>Knowledge Area</span>
                <span style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "11px", textAlign: "right", maxWidth: "120px" }}>
                  {setup.area === "all" ? "All Areas" : AREA_SHORT[setup.area as BABOKArea]}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-4)" }}>Questions</span>
                <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{setup.count}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-4)" }}>Difficulty</span>
                <span style={{ fontWeight: 700, color: "var(--text-1)" }}>
                  {setup.difficulty === "mixed" ? "Mixed" : setup.difficulty.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-4)" }}>Est. time</span>
                <span style={{ fontWeight: 700, color: "#06b6d4" }}>{sessionEstimate}</span>
              </div>
            </div>
            <button style={{ ...btnPrimary, width: "100%", justifyContent: "center" }} onClick={startPractice}>
              <Play size={14} /> Start Session
            </button>

            <div style={{ marginTop: "24px", fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "12px" }}>MOCK EXAM</div>
            <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "10px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#8b5cf6", marginBottom: "6px" }}>Full Simulation</div>
              <div style={{ fontSize: "11px", color: "var(--text-4)", lineHeight: 1.6, marginBottom: "12px" }}>
                120 questions across all 7 core BABOK knowledge areas. 90 minute timer. No feedback until submission.
              </div>
              <button style={{ ...btnDanger, width: "100%", justifyContent: "center", fontSize: "12px", padding: "8px" }} onClick={() => setView("mock-intro")}>
                <Zap size={12} /> Start Mock Exam
              </button>
            </div>
          </div>
        }
      >
        {/* Exam readiness stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "28px" }}>
          {[
            { label: "Practice Accuracy", value: avgScore != null ? `${avgScore}%` : "No data", color: avgScore != null ? (avgScore >= 70 ? "#10b981" : "#f59e0b") : "var(--text-3)", sub: `${results.filter(r => r.mode === "practice").length} practice sessions` },
            { label: "Mock Exam Average", value: mockAvg != null ? `${mockAvg}%` : "Not taken", color: mockAvg != null ? (mockAvg >= 70 ? "#10b981" : "#8b5cf6") : "var(--text-3)", sub: `${mockResults.length} mock exams completed` },
            { label: "Questions Answered", value: String(results.reduce((s, r) => s + r.total, 0) || 0), color: "#06b6d4", sub: "Across all sessions" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "8px" }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color, lineHeight: 1, marginBottom: "4px" }}>{value}</div>
              <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Two column: diagram + mode cards */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", marginBottom: "28px" }}>
          {/* BABOK Wheel */}
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "12px" }}>BABOK v3 FRAMEWORK</div>
            <BABOKWheelDiagram />
            <div style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "10px", textAlign: "center", lineHeight: 1.5 }}>
              Seven core knowledge areas tested in ECBA, CCBA, and CBAP examinations
            </div>
          </div>

          {/* Study modes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              {
                color: "#06b6d4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.25)",
                icon: <BookOpen size={18} color="#06b6d4" />,
                title: "Practice by Knowledge Area",
                desc: "Select a BABOK area, choose your question count and difficulty level. Instant explanation after every answer — including why the wrong options are wrong.",
                cta: "Configure and start", action: () => { /* already configured in top bar */ startPractice(); },
                badge: "450 questions",
              },
              {
                color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)",
                icon: <Zap size={18} color="#8b5cf6" />,
                title: "Mock Certification Exam",
                desc: "120 questions across all seven core knowledge areas. 90 minute timer with no answer feedback until you submit. Designed to simulate exam conditions exactly.",
                cta: "Start mock exam", action: () => setView("mock-intro"),
                badge: "Exam simulation",
              },
              {
                color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)",
                icon: <BarChart2 size={18} color="#10b981" />,
                title: "Performance Analytics",
                desc: "Radar chart of your performance across all BABOK areas. Score history, weak area identification, and targeted study recommendations.",
                cta: "View my results", action: () => setView("my-results"),
                badge: "Progress tracking",
              },
            ].map(({ color, bg, border, icon, title, desc, cta, action, badge }) => (
              <div key={title}
                onClick={action}
                style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px", padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "16px", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = color}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = border}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)" }}>{title}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color, background: `${color}15`, padding: "2px 8px", borderRadius: "10px" }}>{badge}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.6, marginBottom: "10px" }}>{desc}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color, fontSize: "12px", fontWeight: 700 }}>
                    {cta} <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam tracks */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>CERTIFICATION TRACKS SUPPORTED</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { level: "ECBA", full: "Entry Certificate in Business Analysis", desc: "Foundation level. Tests core BA concepts and BABOK knowledge area definitions.", color: "#06b6d4" },
              { level: "CCBA", full: "Certification of Competency in Business Analysis", desc: "Intermediate level. Tests application of BA techniques in realistic scenarios.", color: "#8b5cf6" },
              { level: "CBAP", full: "Certified Business Analysis Professional", desc: "Expert level. Tests strategic judgment, governance, and complex stakeholder situations.", color: "#10b981" },
            ].map(({ level, full, desc, color }) => (
              <div key={level} style={{ borderLeft: `3px solid ${color}`, paddingLeft: "14px" }}>
                <div style={{ fontSize: "16px", fontWeight: 900, color, marginBottom: "3px" }}>{level}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-2)", marginBottom: "5px" }}>{full}</div>
                <div style={{ fontSize: "11px", color: "var(--text-4)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRACTICE SESSION
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "practice-session" && practiceQs.length > 0) {
    const q = practiceQs[practiceIdx];
    const selectedAnswer = practiceAnswers[practiceIdx];
    const isLast = practiceIdx === practiceQs.length - 1;
    const answeredCount = practiceAnswers.filter(a => a !== null).length;

    const rightPanel = (
      <div>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "14px" }}>SESSION SUMMARY</div>
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-4)" }}>Area</span>
            <span style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "11px", textAlign: "right", maxWidth: "130px" }}>
              {setup.area === "all" ? "All Areas" : AREA_SHORT[setup.area as BABOKArea]}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-4)" }}>Difficulty</span>
            <span style={{ fontWeight: 700, color: "var(--text-1)" }}>
              {setup.difficulty === "mixed" ? "Mixed" : setup.difficulty.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-4)" }}>Progress</span>
            <span style={{ fontWeight: 700, color: "#06b6d4" }}>{answeredCount} of {practiceQs.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span style={{ color: "var(--text-4)" }}>Correct so far</span>
            <span style={{ fontWeight: 700, color: "#10b981" }}>
              {practiceAnswers.filter((a, i) => a !== null && a === practiceQs[i].correctIndex).length}
            </span>
          </div>
        </div>

        {/* Question navigator */}
        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "10px" }}>QUESTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
          {practiceQs.map((_, i) => {
            const answered = practiceAnswers[i] !== null;
            const isCorrect = practiceAnswers[i] === practiceQs[i].correctIndex;
            const isCurr = i === practiceIdx;
            let bg = "var(--bg-1)", border = "var(--border)", color = "var(--text-4)";
            if (isCurr) { bg = "#06b6d4"; border = "#06b6d4"; color = "#fff"; }
            else if (answered) { bg = isCorrect ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)"; border = isCorrect ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"; color = isCorrect ? "#10b981" : "#ef4444"; }
            return (
              <button key={i} onClick={() => { setPracticeIdx(i); setShowFeedback(practiceAnswers[i] !== null); }}
                style={{ width: "28px", height: "28px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, cursor: "pointer", background: bg, border: `1px solid ${border}`, color }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        {answeredCount > 0 && (
          <button style={{ ...btnSecondary, width: "100%", justifyContent: "center", fontSize: "12px", marginTop: "8px" }} onClick={finishPractice}>
            Finish and see results
          </button>
        )}
      </div>
    );

    return (
      <Workspace rightPanel={rightPanel}>
        <div style={{ maxWidth: "680px" }}>
          {/* Question meta */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: `${AREA_COLORS[q.area]}14`, border: `1px solid ${AREA_COLORS[q.area]}35`, color: AREA_COLORS[q.area], letterSpacing: "0.06em" }}>
              {q.difficulty.toUpperCase()}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-4)" }}>
              {AREA_LABELS[q.area as BABOKArea]}
            </div>
          </div>

          {/* Question text */}
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.55, marginBottom: "28px" }}>
            {q.question}
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
            {q.options.map((opt, i) => {
              const isSel = selectedAnswer === i;
              const isCorrect = i === q.correctIndex;
              let bg = "var(--bg-2)", border = "var(--border)", color = "var(--text-2)";
              if (showFeedback) {
                if (isCorrect) { bg = "rgba(16,185,129,0.09)"; border = "rgba(16,185,129,0.45)"; color = "#10b981"; }
                else if (isSel) { bg = "rgba(239,68,68,0.09)"; border = "rgba(239,68,68,0.45)"; color = "#ef4444"; }
              } else if (isSel) { bg = "rgba(6,182,212,0.09)"; border = "rgba(6,182,212,0.45)"; color = "var(--text-1)"; }
              return (
                <button key={i} onClick={() => answerPractice(i)}
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: showFeedback ? "default" : "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.15s" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color, flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: "15px", color, lineHeight: 1.7, flex: 1 }}>{opt}</span>
                  {showFeedback && isCorrect && <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />}
                  {showFeedback && isSel && !isCorrect && <XCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showFeedback && (
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#06b6d4", letterSpacing: "0.08em", marginBottom: "10px" }}>EXPLANATION</div>
              <p style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.85, margin: "0 0 12px" }}>{q.explanation}</p>
              <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-4)", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <span><strong style={{ color: "var(--text-3)" }}>Reference:</strong> {q.babokRef}</span>
                <span><strong style={{ color: "var(--text-3)" }}>Technique:</strong> {q.technique}</span>
              </div>
            </div>
          )}

          {showFeedback && (
            <div style={{ display: "flex", gap: "10px" }}>
              {isLast ? (
                <button style={btnPrimary} onClick={finishPractice}>
                  <Award size={14} /> See Full Results
                </button>
              ) : (
                <button style={btnPrimary} onClick={() => { setPracticeIdx(p => p + 1); setShowFeedback(false); }}>
                  Next Question <ChevronRight size={14} />
                </button>
              )}
              {practiceIdx > 0 && (
                <button style={btnSecondary} onClick={() => { setPracticeIdx(p => p - 1); setShowFeedback(practiceAnswers[practiceIdx - 1] !== null); }}>
                  <ChevronLeft size={14} /> Previous
                </button>
              )}
            </div>
          )}
        </div>
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRACTICE RESULTS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "practice-results") {
    const bd = computeAreaBreakdown(practiceQs, practiceAnswers);
    const passed = practicePct >= 70;
    const missedQs = practiceQs.filter((_, i) => practiceAnswers[i] !== practiceQs[i].correctIndex);

    const rightPanel = (
      <div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "52px", fontWeight: 900, color: passed ? "#10b981" : "#ef4444", lineHeight: 1 }}>{practicePct}%</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-2)", marginTop: "4px" }}>{practiceScore} of {practiceQs.length} correct</div>
          <div style={{ marginTop: "8px", padding: "5px 12px", borderRadius: "20px", display: "inline-block", background: passed ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", color: passed ? "#10b981" : "#ef4444", fontSize: "11px", fontWeight: 700 }}>
            {passed ? "PASS" : "NEEDS WORK"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          <button style={{ ...btnPrimary, justifyContent: "center" }} onClick={startPractice}>
            <RotateCcw size={13} /> Try Again
          </button>
          <button style={{ ...btnSecondary, justifyContent: "center" }} onClick={goHome}>Back to Home</button>
          <button style={{ ...btnSecondary, justifyContent: "center" }} onClick={() => setView("my-results")}>View All Results</button>
        </div>
        {!passed && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#ef4444", marginBottom: "6px" }}>RECOMMENDATION</div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", lineHeight: 1.6 }}>
              Review the missed question explanations below. Each one explains why the correct answer is right and why the others are wrong. Aim for 75% before attempting the mock exam.
            </div>
          </div>
        )}
      </div>
    );

    return (
      <Workspace centerTitle="Practice Session Results" rightPanel={rightPanel}>
        {/* Area breakdown */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>PERFORMANCE BY KNOWLEDGE AREA</div>
          {Object.entries(bd).filter(([, v]) => v.total > 0).map(([area, { correct, total }]) => {
            const pct = Math.round((correct / total) * 100);
            const color = AREA_COLORS[area as BABOKArea] ?? "#06b6d4";
            return (
              <div key={area} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{AREA_SHORT[area as BABOKArea] ?? area}</span>
                  <span style={{ color: pct >= 70 ? "#10b981" : "#ef4444", fontWeight: 700 }}>{correct}/{total} ({pct}%)</span>
                </div>
                <div style={{ height: "5px", background: "var(--bg-1)", borderRadius: "3px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.6s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Missed questions */}
        {missedQs.length > 0 && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>
              QUESTIONS TO REVIEW ({missedQs.length})
            </div>
            {practiceQs.map((q, i) => {
              if (practiceAnswers[i] === q.correctIndex) return null;
              const yourAnswer = practiceAnswers[i];
              return (
                <div key={q.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "18px", marginBottom: "18px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.6, marginBottom: "8px" }}>
                    Q{i + 1}. {q.question}
                  </div>
                  {yourAnswer !== null && (
                    <div style={{ fontSize: "12px", color: "#ef4444", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <XCircle size={12} /> Your answer: {q.options[yourAnswer]}
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "#10b981", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <CheckCircle size={12} /> Correct: {q.options[q.correctIndex]}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-4)", lineHeight: 1.7, background: "var(--bg-1)", borderRadius: "8px", padding: "10px 12px" }}>
                    {q.explanation}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "6px" }}>
                    {q.babokRef} · {q.technique}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK INTRO
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "mock-intro") {
    return (
      <Workspace centerTitle="Mock Certification Exam" rightPanel={
        <div>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "14px" }}>EXAM CONFIGURATION</div>
          {[
            { label: "Questions", value: "120" },
            { label: "Time limit", value: "90 minutes" },
            { label: "Feedback", value: "After submission only" },
            { label: "Passing score", value: "70% or above" },
            { label: "Knowledge areas", value: "All 7 core BABOK areas" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-4)" }}>{label}</span>
              <span style={{ fontWeight: 700, color: "var(--text-1)", textAlign: "right", maxWidth: "130px" }}>{value}</span>
            </div>
          ))}
          <button style={{ ...btnDanger, width: "100%", justifyContent: "center", marginTop: "8px" }} onClick={startMock}>
            <Zap size={14} /> Begin Exam
          </button>
        </div>
      }>
        <div style={{ maxWidth: "600px" }}>
          <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#8b5cf6", marginBottom: "12px" }}>Before you begin</div>
            <div style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.8 }}>
              This simulation is designed to replicate actual CBAP exam conditions. 120 questions are drawn randomly from the full question bank across all seven core BABOK knowledge areas. The timer starts immediately and runs for 90 minutes. You can navigate between questions freely but answers are not revealed until you submit. There is no pause function.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
            {[
              { icon: <BookOpen size={20} color="#8b5cf6" />, label: "120 Questions", sub: "All 7 core BABOK areas" },
              { icon: <Clock size={20} color="#8b5cf6" />, label: "90 Minutes", sub: "Strict time limit" },
              { icon: <AlertCircle size={20} color="#8b5cf6" />, label: "No Live Feedback", sub: "Results shown at end" },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>{icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "14px" }}>KNOWLEDGE AREAS COVERED</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {(["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation", "agile"] as BABOKArea[]).map(area => (
                <div key={area} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-3)" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: AREA_COLORS[area], flexShrink: 0 }} />
                  {AREA_SHORT[area]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK SESSION
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "mock-session" && mockQs.length > 0) {
    const q = mockQs[mockIdx];
    const answeredCount = mockAnswers.filter(a => a !== null).length;

    const rightPanel = (
      <div>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "14px" }}>QUESTION NAVIGATOR</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px" }}>
          {mockQs.map((_, i) => {
            const answered = mockAnswers[i] !== null;
            const isCurr = i === mockIdx;
            let bg = "var(--bg-1)", border = "var(--border)", color = "var(--text-4)";
            if (isCurr) { bg = "#8b5cf6"; border = "#8b5cf6"; color = "#fff"; }
            else if (answered) { bg = "rgba(139,92,246,0.15)"; border = "rgba(139,92,246,0.35)"; color = "#8b5cf6"; }
            return (
              <button key={i} onClick={() => setMockIdx(i)}
                style={{ width: "26px", height: "26px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, cursor: "pointer", background: bg, border: `1px solid ${border}`, color }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", fontSize: "11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-4)" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }} />
            Answered ({answeredCount})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-4)" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--bg-1)", border: "1px solid var(--border)" }} />
            Unanswered ({mockQs.length - answeredCount})
          </div>
        </div>
        <button onClick={() => void submitMock()} style={{ ...btnDanger, width: "100%", justifyContent: "center", fontSize: "12px" }}>
          Submit Exam ({answeredCount}/{mockQs.length})
        </button>
      </div>
    );

    return (
      <Workspace rightPanel={rightPanel}>
        <div style={{ maxWidth: "700px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <div style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: `${AREA_COLORS[q.area]}14`, border: `1px solid ${AREA_COLORS[q.area]}35`, color: AREA_COLORS[q.area], letterSpacing: "0.06em" }}>
              {q.difficulty.toUpperCase()}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{AREA_LABELS[q.area as BABOKArea]}</div>
          </div>

          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.55, marginBottom: "26px" }}>
            {q.question}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
            {q.options.map((opt, i) => {
              const isSel = mockAnswers[mockIdx] === i;
              return (
                <button key={i}
                  onClick={() => setMockAnswers(p => { const a = [...p]; a[mockIdx] = i; return a; })}
                  style={{ background: isSel ? "rgba(139,92,246,0.09)" : "var(--bg-2)", border: `1px solid ${isSel ? "rgba(139,92,246,0.45)" : "var(--border)"}`, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.15s" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${isSel ? "rgba(139,92,246,0.6)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: isSel ? "#8b5cf6" : "var(--text-3)", flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: "15px", color: isSel ? "var(--text-1)" : "var(--text-2)", lineHeight: 1.7 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setMockIdx(p => Math.max(0, p - 1))} style={{ ...btnSecondary, opacity: mockIdx === 0 ? 0.4 : 1 }} disabled={mockIdx === 0}>
              <ChevronLeft size={14} /> Previous
            </button>
            {mockIdx < mockQs.length - 1 ? (
              <button onClick={() => setMockIdx(p => p + 1)} style={btnPrimary}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={() => void submitMock()} style={{ ...btnPrimary, background: "#10b981" }}>
                <CheckCircle size={14} /> Submit Exam
              </button>
            )}
          </div>
        </div>
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK RESULTS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "mock-results") {
    const passed = mockPct >= 70;
    const weakAreas = AREAS
      .map(area => ({ area, pct: mockBd[area]?.total > 0 ? Math.round((mockBd[area].correct / mockBd[area].total) * 100) : null }))
      .filter(x => x.pct !== null && x.pct < 70)
      .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

    const rightPanel = (
      <div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "52px", fontWeight: 900, color: passed ? "#10b981" : "#ef4444", lineHeight: 1 }}>{mockPct}%</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-2)", marginTop: "4px" }}>{mockScore} of {mockQs.length} correct</div>
          <div style={{ marginTop: "8px", padding: "5px 12px", borderRadius: "20px", display: "inline-block", background: passed ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", color: passed ? "#10b981" : "#ef4444", fontSize: "11px", fontWeight: 700 }}>
            {passed ? "PASS" : "NEEDS WORK"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button style={{ ...btnDanger, justifyContent: "center" }} onClick={() => setView("mock-intro")}>
            <RotateCcw size={13} /> New Mock Exam
          </button>
          <button style={{ ...btnSecondary, justifyContent: "center" }} onClick={goHome}>Back to Home</button>
          <button style={{ ...btnSecondary, justifyContent: "center" }} onClick={() => setView("my-results")}>View All Results</button>
        </div>
      </div>
    );

    return (
      <Workspace centerTitle="Mock Exam Results" rightPanel={rightPanel}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "10px" }}>PERFORMANCE RADAR</div>
            <RadarChart scores={Object.fromEntries(Object.entries(mockBd).map(([a, { correct, total }]) => [a, total > 0 ? Math.round((correct / total) * 100) : 0]))} />
          </div>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>BY KNOWLEDGE AREA</div>
            {AREAS.map(area => {
              const bd = mockBd[area] ?? { correct: 0, total: 0 };
              if (bd.total === 0) return null;
              const pct = Math.round((bd.correct / bd.total) * 100);
              const color = AREA_COLORS[area];
              return (
                <div key={area} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)" }}>{AREA_SHORT[area]}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{bd.correct}/{bd.total} ({pct}%)</span>
                  </div>
                  <div style={{ height: "5px", background: "var(--bg-1)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {weakAreas.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#ef4444", letterSpacing: "0.08em", marginBottom: "14px" }}>AREAS REQUIRING FOCUSED STUDY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {weakAreas.map(({ area, pct }) => (
                <div key={area} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-2)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: AREA_COLORS[area as BABOKArea] }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)" }}>{AREA_SHORT[area as BABOKArea]}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#ef4444" }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Workspace>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MY RESULTS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "my-results") {
    const mockCount = results.filter(r => r.mode === "mock").length;
    const weakestArea = Object.keys(radarScores).length > 0
      ? Object.entries(radarScores).map(([area, avg]) => ({ area, avg })).sort((a, b) => a.avg - b.avg)[0]
      : null;

    const rightPanel = (
      <div>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "14px" }}>OVERALL STATS</div>
        {[
          { label: "Practice Accuracy", value: avgScore != null ? `${avgScore}%` : "No data", color: avgScore != null ? (avgScore >= 70 ? "#10b981" : "#f59e0b") : "var(--text-3)" },
          { label: "Total Sessions", value: String(results.length), color: "#06b6d4" },
          { label: "Mock Exams", value: String(mockCount), color: "#8b5cf6" },
          { label: "Mock Average", value: mockAvg != null ? `${mockAvg}%` : "N/A", color: mockAvg != null ? (mockAvg >= 70 ? "#10b981" : "#8b5cf6") : "var(--text-3)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-4)" }}>{label}</span>
            <span style={{ fontWeight: 800, color }}>{value}</span>
          </div>
        ))}
        <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: "10px" }} onClick={startPractice}>
          <Play size={13} /> Start Practising
        </button>
      </div>
    );

    return (
      <Workspace centerTitle="My Performance Analytics" rightPanel={rightPanel}>
        {resultsLoading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "var(--text-4)", fontSize: "14px" }}>Loading your results...</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <TrendingUp size={28} color="var(--text-4)" />
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-2)", marginBottom: "8px" }}>No results yet</div>
            <div style={{ fontSize: "13px", color: "var(--text-4)", marginBottom: "24px", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 24px" }}>
              Complete a practice session or mock exam to see your performance analytics here.
            </div>
            <button style={btnPrimary} onClick={startPractice}>Start Your First Session</button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "10px" }}>ALL-TIME PERFORMANCE</div>
                <RadarChart scores={radarScores} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {weakestArea && (
                  <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "18px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#ef4444", letterSpacing: "0.08em", marginBottom: "10px" }}>PRIORITY FOCUS AREA</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-1)", marginBottom: "5px" }}>
                      {AREA_LABELS[weakestArea.area as BABOKArea] ?? weakestArea.area}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.6, marginBottom: "14px" }}>
                      Your average in this area is {Math.round(weakestArea.avg)}%. This is your biggest opportunity to improve your overall readiness score.
                    </div>
                    <button style={{ ...btnPrimary, fontSize: "12px", padding: "8px 16px" }}
                      onClick={() => { setSetup(p => ({ ...p, area: weakestArea.area as BABOKArea })); startPractice(); }}>
                      Practice This Area
                    </button>
                  </div>
                )}
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "14px" }}>AREA AVERAGES</div>
                  {Object.entries(radarScores).map(([area, score]) => {
                    const color = AREA_COLORS[area as BABOKArea] ?? "#06b6d4";
                    return (
                      <div key={area} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <div style={{ width: "100px", fontSize: "11px", color: "var(--text-3)", fontWeight: 600, flexShrink: 0 }}>{AREA_SHORT[area as BABOKArea] ?? area}</div>
                        <div style={{ flex: 1, height: "5px", background: "var(--bg-1)", borderRadius: "3px" }}>
                          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px" }} />
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 800, color, width: "32px", textAlign: "right" }}>{score}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Session history table */}
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: "10px", fontWeight: 800, color: "var(--text-4)", letterSpacing: "0.08em" }}>
                SESSION HISTORY ({results.length} sessions)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-1)" }}>
                      {["Date", "Mode", "Area", "Difficulty", "Score", "Result"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...results].reverse().map(r => {
                      const pct = Math.round((r.score / r.total) * 100);
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-1)"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                          <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-3)" }}>
                            {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "5px", background: r.mode === "mock" ? "rgba(139,92,246,0.12)" : "rgba(6,182,212,0.1)", color: r.mode === "mock" ? "#8b5cf6" : "#06b6d4" }}>
                              {r.mode === "mock" ? "MOCK" : "PRACTICE"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-3)" }}>
                            {r.area ? (AREA_SHORT[r.area as BABOKArea] ?? r.area) : "All areas"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "11px", color: "var(--text-4)", fontWeight: 600 }}>
                            {r.difficulty ? r.difficulty.toUpperCase() : "Mixed"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "var(--text-1)" }}>
                            {r.score}/{r.total} <span style={{ fontWeight: 400, color: "var(--text-4)" }}>({pct}%)</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: pct >= 70 ? "#10b981" : "#ef4444" }}>
                              {pct >= 70 ? "PASS" : "BELOW TARGET"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Workspace>
    );
  }

  return null;
}
