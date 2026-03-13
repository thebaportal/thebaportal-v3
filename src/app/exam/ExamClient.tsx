"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, Zap, BarChart2, ChevronRight, ChevronLeft,
  Clock, CheckCircle, XCircle, Target, RotateCcw, ArrowLeft,
} from "lucide-react";
import {
  AREA_LABELS, AREA_SHORT, BABOKArea, ExamQuestion,
  selectPracticeQuestions, selectMockQuestions,
} from "@/data/examQuestions";

// ── Types ──────────────────────────────────────────────────────────────────────
type View =
  | "home" | "practice-setup" | "practice-session" | "practice-results"
  | "mock-intro" | "mock-session" | "mock-results" | "my-results";

interface PracticeSetup {
  area: BABOKArea;
  count: 10 | 20;
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

// ── Constants ──────────────────────────────────────────────────────────────────
const AREAS: BABOKArea[] = ["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation", "agile"];
const MOCK_DURATION = 90 * 60;

const AREA_COLORS: Record<BABOKArea, string> = {
  planning: "#06b6d4",
  elicitation: "#8b5cf6",
  lifecycle: "#10b981",
  strategy: "#f59e0b",
  analysis: "#ef4444",
  evaluation: "#3b82f6",
  agile: "#f97316",
};

const AREA_ICONS: Record<BABOKArea, string> = {
  planning: "🗺️",
  elicitation: "💬",
  lifecycle: "🔄",
  strategy: "🎯",
  analysis: "🔍",
  evaluation: "✅",
  agile: "⚡",
};

// ── Radar Chart ────────────────────────────────────────────────────────────────
function RadarChart({ scores }: { scores: Partial<Record<string, number>> }) {
  const size = 260;
  const center = size / 2;
  const maxR = 88;
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
        return <circle key={a} cx={p.x} cy={p.y} r={3.5} fill="#06b6d4" />;
      })}
      {AREAS.map((a, i) => {
        const p = pt(i, maxR + 22);
        return (
          <text key={a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="var(--text-3)" fontFamily="inherit">{AREA_SHORT[a as BABOKArea]}</text>
        );
      })}
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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

// ── Shared styles ──────────────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  background: "var(--teal)", color: "#fff", border: "none",
  borderRadius: "8px", padding: "10px 22px", fontSize: "14px",
  fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: "8px", padding: "9px 20px", fontSize: "13px",
  fontWeight: 600, color: "var(--text-2)", cursor: "pointer",
};
const card: React.CSSProperties = {
  background: "var(--bg-2)", border: "1px solid var(--border)",
  borderRadius: "14px", padding: "24px", cursor: "pointer",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

// ── Main Component ─────────────────────────────────────────────────────────────
interface ExamClientProps { tier: string; }

export default function ExamClient({ tier: _tier }: ExamClientProps) {
  const [view, setView] = useState<View>("home");

  // Practice state
  const [setup, setSetup] = useState<PracticeSetup>({ area: "planning", count: 10, difficulty: "mixed" });
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

  // ── Actions ──────────────────────────────────────────────────────────────────
  function startPractice() {
    const qs = selectPracticeQuestions(setup.area, setup.count, setup.difficulty);
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

  // ══════════════════════════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "home") return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "56px 32px" }}>

        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "20px", padding: "5px 14px", marginBottom: "16px" }}>
            <Target size={13} color="#06b6d4" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#06b6d4", letterSpacing: "0.05em" }}>EXAM PREP</span>
          </div>
          <h1 style={{ fontSize: "34px", fontWeight: 800, color: "var(--text-1)", margin: "0 0 10px", lineHeight: 1.15 }}>
            Certification Practice
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-3)", margin: 0, lineHeight: 1.7, maxWidth: "560px" }}>
            Prepare for ECBA, CCBA, and CBAP certification. Practice by knowledge area,
            simulate the real exam, and track your performance over time.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "40px" }}>
          {/* Practice */}
          {[
            {
              color: "#06b6d4", bg: "rgba(6,182,212,0.1)", icon: <BookOpen size={20} color="#06b6d4" />,
              title: "Practice by Area", desc: "10 or 20 questions from any BABOK knowledge area with instant feedback after each answer.",
              cta: "Start practice", onClick: () => setView("practice-setup"),
            },
            {
              color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: <Zap size={20} color="#8b5cf6" />,
              title: "Mock Exam", desc: "50 questions, 90-minute timer, no feedback until submission. As close to the real exam as it gets.",
              cta: "Start mock exam", onClick: () => setView("mock-intro"),
            },
            {
              color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: <BarChart2 size={20} color="#10b981" />,
              title: "My Results", desc: "Radar chart of your performance across all BABOK areas, score history, and weak area guidance.",
              cta: "View dashboard", onClick: () => setView("my-results"),
            },
          ].map(({ color, bg, icon, title, desc, cta, onClick }) => (
            <div key={title} style={card} onClick={onClick}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = color; el.style.boxShadow = `0 0 0 1px ${color}33`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                {icon}
              </div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-1)", marginBottom: "8px" }}>{title}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.65, marginBottom: "20px" }}>{desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color, fontSize: "13px", fontWeight: 600 }}>
                {cta} <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>BABOK v3 KNOWLEDGE AREAS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {AREAS.map(area => (
              <div key={area} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: AREA_COLORS[area], flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.4 }}>{AREA_LABELS[area]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // PRACTICE SETUP
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "practice-setup") return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 32px" }}>
        <button onClick={goHome} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: "6px", marginBottom: "32px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1)", margin: "0 0 8px" }}>Practice Setup</h2>
        <p style={{ fontSize: "14px", color: "var(--text-3)", margin: "0 0 36px", lineHeight: 1.6 }}>
          Choose a knowledge area, question count, and difficulty level.
        </p>

        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "14px" }}>KNOWLEDGE AREA</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {AREAS.map(area => {
              const sel = setup.area === area;
              const color = AREA_COLORS[area];
              return (
                <button key={area} onClick={() => setSetup(p => ({ ...p, area }))}
                  style={{ background: sel ? `${color}14` : "var(--bg-2)", border: `1px solid ${sel ? color + "55" : "var(--border)"}`, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <span style={{ fontSize: "18px" }}>{AREA_ICONS[area]}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: sel ? color : "var(--text-2)", lineHeight: 1.2 }}>{AREA_SHORT[area]}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "2px" }}>20 questions</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "14px" }}>QUESTION COUNT</div>
          <div style={{ display: "flex", gap: "10px" }}>
            {([10, 20] as const).map(n => (
              <button key={n} onClick={() => setSetup(p => ({ ...p, count: n }))}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", background: setup.count === n ? "rgba(6,182,212,0.1)" : "var(--bg-2)", border: `1px solid ${setup.count === n ? "rgba(6,182,212,0.4)" : "var(--border)"}`, cursor: "pointer", fontSize: "15px", fontWeight: 700, color: setup.count === n ? "#06b6d4" : "var(--text-2)" }}>
                {n} questions
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "14px" }}>DIFFICULTY</div>
          <div style={{ display: "flex", gap: "10px" }}>
            {(["mixed", "ecba", "ccba", "cbap"] as const).map(d => {
              const labels = { mixed: "Mixed", ecba: "ECBA", ccba: "CCBA", cbap: "CBAP" };
              const sel = setup.difficulty === d;
              return (
                <button key={d} onClick={() => setSetup(p => ({ ...p, difficulty: d }))}
                  style={{ flex: 1, padding: "11px 8px", borderRadius: "10px", background: sel ? "rgba(6,182,212,0.1)" : "var(--bg-2)", border: `1px solid ${sel ? "rgba(6,182,212,0.4)" : "var(--border)"}`, cursor: "pointer", fontSize: "13px", fontWeight: 700, color: sel ? "#06b6d4" : "var(--text-2)" }}>
                  {labels[d]}
                </button>
              );
            })}
          </div>
        </div>

        <button style={btnPrimary} onClick={startPractice}>
          Start Practice Session <ChevronRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // PRACTICE SESSION
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "practice-session" && practiceQs.length > 0) {
    const q = practiceQs[practiceIdx];
    const selectedAnswer = practiceAnswers[practiceIdx];
    const isLast = practiceIdx === practiceQs.length - 1;
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-1)", borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={goHome} style={{ ...btnGhost, padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
            <ArrowLeft size={13} /> Exit
          </button>
          <div style={{ flex: 1, height: "6px", background: "var(--bg-2)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((practiceIdx + 1) / practiceQs.length) * 100}%`, background: "var(--teal)", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: "13px", color: "var(--text-3)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {practiceIdx + 1} / {practiceQs.length}
          </span>
        </div>

        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: `${AREA_COLORS[q.area]}14`, border: `1px solid ${AREA_COLORS[q.area]}40`, borderRadius: "20px", padding: "4px 12px", marginBottom: "20px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: AREA_COLORS[q.area] }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: AREA_COLORS[q.area], letterSpacing: "0.06em" }}>
              {q.difficulty.toUpperCase()} · {AREA_SHORT[q.area as BABOKArea]}
            </span>
          </div>

          <div style={{ fontSize: "19px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.5, marginBottom: "28px" }}>
            {q.question}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
            {q.options.map((opt, i) => {
              const isSel = selectedAnswer === i;
              const isCorrect = i === q.correctIndex;
              let bg = "var(--bg-2)", border = "var(--border)", color = "var(--text-2)";
              if (showFeedback) {
                if (isCorrect) { bg = "rgba(16,185,129,0.1)"; border = "rgba(16,185,129,0.5)"; color = "#10b981"; }
                else if (isSel) { bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.5)"; color = "#ef4444"; }
              } else if (isSel) { bg = "rgba(6,182,212,0.1)"; border = "rgba(6,182,212,0.5)"; color = "var(--text-1)"; }
              return (
                <button key={i} onClick={() => answerPractice(i)}
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: showFeedback ? "default" : "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.15s" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color, flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: "14px", color, lineHeight: 1.65 }}>{opt}</span>
                  {showFeedback && isCorrect && <CheckCircle size={16} color="#10b981" style={{ marginLeft: "auto", flexShrink: 0, marginTop: "2px" }} />}
                  {showFeedback && isSel && !isCorrect && <XCircle size={16} color="#ef4444" style={{ marginLeft: "auto", flexShrink: 0, marginTop: "2px" }} />}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", marginBottom: "28px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#06b6d4", letterSpacing: "0.07em", marginBottom: "8px" }}>EXPLANATION</div>
              <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.75, margin: "0 0 8px" }}>{q.explanation}</p>
              <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{q.babokRef} · {q.technique}</div>
            </div>
          )}

          {showFeedback && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {isLast ? (
                <button style={btnPrimary} onClick={finishPractice}>See Results</button>
              ) : (
                <button style={btnPrimary} onClick={() => { setPracticeIdx(p => p + 1); setShowFeedback(false); }}>
                  Next question <ChevronRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRACTICE RESULTS
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "practice-results") {
    const bd = computeAreaBreakdown(practiceQs, practiceAnswers);
    const passed = practicePct >= 70;
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "56px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ fontSize: "76px", fontWeight: 900, color: passed ? "#10b981" : "#ef4444", lineHeight: 1, marginBottom: "8px" }}>
              {practicePct}%
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", marginBottom: "6px" }}>
              {practiceScore} of {practiceQs.length} correct
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-3)" }}>
              {passed ? "Strong work. Keep building on this foundation." : "Good effort. Review the explanations and try again."}
            </div>
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "18px" }}>AREA BREAKDOWN</div>
            {Object.entries(bd).filter(([, v]) => v.total > 0).map(([area, { correct, total }]) => {
              const pct = Math.round((correct / total) * 100);
              const color = AREA_COLORS[area as BABOKArea] ?? "#06b6d4";
              return (
                <div key={area} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{AREA_SHORT[area as BABOKArea] ?? area}</span>
                    <span style={{ color: pct >= 70 ? "#10b981" : "#ef4444", fontWeight: 700 }}>{correct}/{total}</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-1)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {practiceQs.some((q, i) => practiceAnswers[i] !== q.correctIndex) && (
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "32px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "18px" }}>MISSED QUESTIONS</div>
              {practiceQs.map((q, i) => {
                if (practiceAnswers[i] === q.correctIndex) return null;
                return (
                  <div key={q.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)", lineHeight: 1.6, marginBottom: "6px" }}>{i + 1}. {q.question}</div>
                    <div style={{ fontSize: "12px", color: "#10b981", marginBottom: "4px" }}>✓ {q.options[q.correctIndex]}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-4)", lineHeight: 1.65 }}>{q.explanation}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button style={btnPrimary} onClick={startPractice}>
              <RotateCcw size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
              Try again
            </button>
            <button style={btnGhost} onClick={goHome}>Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOCK INTRO
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "mock-intro") return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "56px 32px" }}>
        <button onClick={goHome} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: "6px", marginBottom: "36px" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚡</div>
        <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-1)", margin: "0 0 12px" }}>Mock Exam</h2>
        <p style={{ fontSize: "15px", color: "var(--text-3)", lineHeight: 1.7, marginBottom: "36px" }}>
          Simulate the real certification exam with 50 questions across all BABOK knowledge areas.
          The clock starts immediately and runs for 90 minutes. Your answers are not revealed until you submit.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "40px" }}>
          {[
            { icon: <BookOpen size={18} color="#8b5cf6" />, label: "50 Questions", sub: "All BABOK areas" },
            { icon: <Clock size={18} color="#8b5cf6" />, label: "90 Minutes", sub: "Strict time limit" },
            { icon: <XCircle size={18} color="#8b5cf6" />, label: "No Feedback", sub: "Revealed at end" },
          ].map(({ icon, label, sub }) => (
            <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>{icon}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)", marginBottom: "3px" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{sub}</div>
            </div>
          ))}
        </div>
        <button style={{ ...btnPrimary, fontSize: "15px", padding: "13px 28px" }} onClick={startMock}>
          Start Mock Exam <ChevronRight size={15} style={{ display: "inline", verticalAlign: "middle" }} />
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // MOCK SESSION
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "mock-session" && mockQs.length > 0) {
    const q = mockQs[mockIdx];
    const answeredCount = mockAnswers.filter(a => a !== null).length;
    const isUrgent = mockTimeLeft < 600;
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-1)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>Question {mockIdx + 1} of {mockQs.length}</span>
            <span style={{ fontSize: "12px", color: "var(--text-4)" }}>· {answeredCount} answered</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: isUrgent ? "#ef4444" : "var(--text-2)" }}>
            <Clock size={14} />
            <span style={{ fontSize: "15px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtTime(mockTimeLeft)}</span>
          </div>
        </div>

        <div style={{ maxWidth: "740px", margin: "0 auto", padding: "36px 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: `${AREA_COLORS[q.area]}14`, border: `1px solid ${AREA_COLORS[q.area]}40`, borderRadius: "20px", padding: "4px 12px", marginBottom: "18px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: AREA_COLORS[q.area] }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: AREA_COLORS[q.area], letterSpacing: "0.06em" }}>
              {q.difficulty.toUpperCase()} · {AREA_SHORT[q.area as BABOKArea]}
            </span>
          </div>

          <div style={{ fontSize: "19px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.5, marginBottom: "26px" }}>{q.question}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
            {q.options.map((opt, i) => {
              const isSel = mockAnswers[mockIdx] === i;
              return (
                <button key={i} onClick={() => setMockAnswers(p => { const a = [...p]; a[mockIdx] = i; return a; })}
                  style={{ background: isSel ? "rgba(139,92,246,0.1)" : "var(--bg-2)", border: `1px solid ${isSel ? "rgba(139,92,246,0.5)" : "var(--border)"}`, borderRadius: "10px", padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.15s" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${isSel ? "rgba(139,92,246,0.6)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: isSel ? "#8b5cf6" : "var(--text-3)", flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: "14px", color: isSel ? "var(--text-1)" : "var(--text-2)", lineHeight: 1.65 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <button onClick={() => setMockIdx(p => Math.max(0, p - 1))} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: "6px", opacity: mockIdx === 0 ? 0.4 : 1 }} disabled={mockIdx === 0}>
              <ChevronLeft size={14} /> Previous
            </button>
            {mockIdx < mockQs.length - 1 ? (
              <button onClick={() => setMockIdx(p => p + 1)} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "6px" }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={() => void submitMock()} style={{ ...btnPrimary, background: "#10b981" }}>
                Submit Exam
              </button>
            )}
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.07em", marginBottom: "12px" }}>QUESTION NAVIGATOR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {mockQs.map((_, i) => {
                const answered = mockAnswers[i] !== null;
                const isCurr = i === mockIdx;
                return (
                  <button key={i} onClick={() => setMockIdx(i)}
                    style={{ width: "32px", height: "32px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: isCurr ? "var(--teal)" : answered ? "rgba(6,182,212,0.15)" : "var(--bg-1)", border: `1px solid ${isCurr ? "var(--teal)" : answered ? "rgba(6,182,212,0.3)" : "var(--border)"}`, color: isCurr ? "#fff" : answered ? "#06b6d4" : "var(--text-4)" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              {[{ bg: "rgba(6,182,212,0.15)", border: "rgba(6,182,212,0.3)", label: "Answered" }, { bg: "var(--bg-1)", border: "var(--border)", label: "Unanswered" }].map(({ bg, border, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-4)" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: bg, border: `1px solid ${border}` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button onClick={() => void submitMock()} style={{ fontSize: "12px", color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Submit early ({answeredCount}/{mockQs.length} answered)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOCK RESULTS
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "mock-results") {
    const passed = mockPct >= 70;
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "56px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.1em", marginBottom: "12px" }}>MOCK EXAM COMPLETE</div>
            <div style={{ fontSize: "80px", fontWeight: 900, color: passed ? "#10b981" : "#ef4444", lineHeight: 1, marginBottom: "8px" }}>
              {mockPct}%
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", marginBottom: "8px" }}>{mockScore} of {mockQs.length} correct</div>
            <div style={{ fontSize: "14px", color: "var(--text-3)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.7 }}>
              {passed
                ? "Excellent work. You are performing at certification level. Keep practising to build consistency."
                : "Solid attempt. Analyse the areas below and focus your next study session on the weaker ones."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", marginBottom: "32px", alignItems: "start" }}>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "10px" }}>PERFORMANCE RADAR</div>
              <RadarChart scores={Object.fromEntries(Object.entries(mockBd).map(([a, { correct, total }]) => [a, total > 0 ? Math.round((correct / total) * 100) : 0]))} />
            </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "18px" }}>BY KNOWLEDGE AREA</div>
              {AREAS.map(area => {
                const { correct, total } = (mockBd[area] ?? { correct: 0, total: 0 });
                if (total === 0) return null;
                const pct = Math.round((correct / total) * 100);
                const color = AREA_COLORS[area];
                return (
                  <div key={area} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>{AREA_SHORT[area]}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{correct}/{total} ({pct}%)</span>
                    </div>
                    <div style={{ height: "6px", background: "var(--bg-1)", borderRadius: "3px" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button style={btnPrimary} onClick={() => setView("mock-intro")}>
              <RotateCcw size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
              New mock exam
            </button>
            <button style={btnGhost} onClick={goHome}>Back to home</button>
            <button style={btnGhost} onClick={() => setView("my-results")}>View all results</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MY RESULTS
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "my-results") {
    const avgScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + (r.score / r.total) * 100, 0) / results.length) : null;
    const mockCount = results.filter(r => r.mode === "mock").length;

    const weakestArea = (() => {
      if (Object.keys(radarScores).length === 0) return null;
      return Object.entries(radarScores).map(([area, avg]) => ({ area, avg })).sort((a, b) => a.avg - b.avg)[0];
    })();

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
        <div style={{ maxWidth: "880px", margin: "0 auto", padding: "48px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
            <button onClick={goHome} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: "6px" }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-1)", margin: 0 }}>My Results</h2>
              <div style={{ fontSize: "13px", color: "var(--text-4)" }}>{results.length} sessions recorded</div>
            </div>
          </div>

          {resultsLoading ? (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-4)", fontSize: "14px" }}>Loading your results...</div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px" }}>
              <div style={{ fontSize: "44px", marginBottom: "16px" }}>📊</div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-2)", marginBottom: "8px" }}>No results yet</div>
              <div style={{ fontSize: "14px", color: "var(--text-4)", marginBottom: "24px", lineHeight: 1.7 }}>
                Complete a practice session or mock exam to see your performance here.
              </div>
              <button style={btnPrimary} onClick={() => setView("practice-setup")}>Start practising</button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
                {[
                  { label: "Average Score", value: avgScore != null ? `${avgScore}%` : "—", color: avgScore != null ? (avgScore >= 70 ? "#10b981" : "#ef4444") : "var(--text-2)" },
                  { label: "Sessions", value: String(results.length), color: "#06b6d4" },
                  { label: "Mock Exams", value: String(mockCount), color: "#8b5cf6" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "30px", fontWeight: 900, color, marginBottom: "4px" }}>{value}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-3)" }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", marginBottom: "32px", alignItems: "start" }}>
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "10px" }}>ALL-TIME PERFORMANCE</div>
                  <RadarChart scores={radarScores} />
                </div>
                <div>
                  {weakestArea && (
                    <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em", marginBottom: "10px" }}>FOCUS AREA</div>
                      <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-1)", marginBottom: "6px" }}>
                        {AREA_LABELS[weakestArea.area as BABOKArea] ?? weakestArea.area}
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.65, marginBottom: "14px" }}>
                        Your average in this area is {Math.round(weakestArea.avg)}%. Spend your next session here to close the gap.
                      </div>
                      <button style={{ ...btnPrimary, padding: "8px 18px", fontSize: "13px" }}
                        onClick={() => { setSetup(p => ({ ...p, area: weakestArea.area as BABOKArea })); setView("practice-setup"); }}>
                        Practice this area
                      </button>
                    </div>
                  )}
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>AREA AVERAGES</div>
                    {Object.entries(radarScores).map(([area, score]) => {
                      const color = AREA_COLORS[area as BABOKArea] ?? "#06b6d4";
                      return (
                        <div key={area} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <div style={{ width: "90px", fontSize: "12px", color: "var(--text-3)", fontWeight: 600, flexShrink: 0 }}>{AREA_SHORT[area as BABOKArea] ?? area}</div>
                          <div style={{ flex: 1, height: "6px", background: "var(--bg-1)", borderRadius: "3px" }}>
                            <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px" }} />
                          </div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color, width: "36px", textAlign: "right" }}>{score}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em" }}>
                  SESSION HISTORY
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Date", "Mode", "Area", "Score", "Result"].map(h => (
                          <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...results].reverse().map(r => {
                        const pct = Math.round((r.score / r.total) * 100);
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--text-3)" }}>
                              {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "12px 20px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", background: r.mode === "mock" ? "rgba(139,92,246,0.1)" : "rgba(6,182,212,0.1)", color: r.mode === "mock" ? "#8b5cf6" : "#06b6d4" }}>
                                {r.mode === "mock" ? "MOCK" : "PRACTICE"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 20px", fontSize: "13px", color: "var(--text-3)" }}>
                              {r.area ? (AREA_SHORT[r.area as BABOKArea] ?? r.area) : "All areas"}
                            </td>
                            <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 700, color: "var(--text-1)" }}>
                              {r.score}/{r.total} ({pct}%)
                            </td>
                            <td style={{ padding: "12px 20px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: pct >= 70 ? "#10b981" : "#ef4444" }}>
                                {pct >= 70 ? "PASS" : "NEEDS WORK"}
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
        </div>
      </div>
    );
  }

  return null;
}
