"use client";

import { useState, useEffect } from "react";
import type { UserBadge, UserProgress } from "@/lib/progress";
import { BADGE_DEFINITIONS } from "@/lib/progress";
import { BADGES } from "@/lib/badges";

// ── Extended types ─────────────────────────────────────────────────────────────

export interface PortfolioAttempt {
  id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_type: string;
  industry: string;
  difficulty_mode: string;
  total_score: number;
  score_problem_framing: number;
  score_root_cause: number;
  score_evidence_use: number;
  score_recommendation: number;
  completed_at: string;
  submission_text?: string;
}

export interface PortfolioPrefs {
  showSubmissions: boolean;
  showBadges: boolean;
  showModules: boolean;
  hiddenChallenges: string[];
}

export const DEFAULT_PREFS: PortfolioPrefs = {
  showSubmissions: true,
  showBadges: true,
  showModules: true,
  hiddenChallenges: [],
};

interface Props {
  fullName: string;
  baLevel: string;
  joinedYear: string;
  attempts: PortfolioAttempt[];
  badges: UserBadge[];
  progress: UserProgress;
  prefs: PortfolioPrefs;
  isPublic?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const LEARNING_BADGE_IDS = [
  "ba-foundations", "strategic-planner", "elicitation-specialist",
  "requirements-analyst", "governance-lead", "solution-evaluator",
];

const ALL_MODULES = [
  { id: "ba-foundations",         label: "BA Foundations",                    order: 1 },
  { id: "strategic-planner",      label: "Strategic Analysis & Planning",     order: 2 },
  { id: "elicitation-specialist", label: "Elicitation & Collaboration",       order: 3 },
  { id: "requirements-analyst",   label: "Requirements Analysis & Modelling", order: 4 },
  { id: "governance-lead",        label: "Requirements Lifecycle & Governance",order: 5 },
  { id: "solution-evaluator",     label: "Solution Evaluation",               order: 6 },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    discovery: "#0891b2", requirements: "#7c3aed",
    "solution-analysis": "#059669", uat: "#d97706",
    "production-incident": "#dc2626", elicitation: "#0284c7",
  };
  return map[type] || "#64748b";
}

function ScoreRing({ score }: { score: number }) {
  const size = 58;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="13" fontWeight="700" fontFamily="system-ui">{score}</text>
    </svg>
  );
}

// ── CaseStudy type ─────────────────────────────────────────────────────────────

type CaseStudy = {
  title: string;
  problem: string;
  approach: string;
  output: string;
  outcome: string;
  skills: string[];
};

type TransformStatus = "idle" | "loading" | "done" | "error";
type AssetStatus = "idle" | "loading" | "done" | "error";

// ── CaseStudyCard ───────────────────────────────────────────────────────────────

function CaseStudyCard({ a, prefs, isPublic }: { a: PortfolioAttempt; prefs: PortfolioPrefs; isPublic: boolean }) {
  const storageKey = `cs_${a.id}`;
  const [txStatus, setTxStatus] = useState<TransformStatus>("idle");
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [txError, setTxError] = useState("");
  const [panel, setPanel] = useState<"bullets" | "interview" | null>(null);
  const [bulletsStatus, setBulletsStatus] = useState<AssetStatus>("idle");
  const [bullets, setBullets] = useState<string[]>([]);
  const [interviewStatus, setInterviewStatus] = useState<AssetStatus>("idle");
  const [interviewAnswer, setInterviewAnswer] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) { setCaseStudy(JSON.parse(stored)); setTxStatus("done"); }
    } catch { /* ignore */ }
  }, [storageKey]);

  const runTransform = async () => {
    if (!a.submission_text) return;
    setTxStatus("loading"); setTxError("");
    try {
      const res = await fetch("/api/career/portfolio-transform", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission: a.submission_text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Transform failed");
      localStorage.setItem(storageKey, JSON.stringify(data));
      setCaseStudy(data); setTxStatus("done");
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setTxStatus("error");
    }
  };

  const openPanel = async (type: "bullets" | "interview") => {
    if (panel === type) { setPanel(null); return; }
    setPanel(type);
    if (type === "bullets" && bulletsStatus === "idle") {
      setBulletsStatus("loading");
      try {
        const res = await fetch("/api/career/portfolio-bullets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseStudy }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
        setBullets(data.bullets || []); setBulletsStatus("done");
      } catch { setBulletsStatus("error"); }
    }
    if (type === "interview" && interviewStatus === "idle") {
      setInterviewStatus("loading");
      try {
        const res = await fetch("/api/career/portfolio-interview", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseStudy }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
        setInterviewAnswer(data.answer || ""); setInterviewStatus("done");
      } catch { setInterviewStatus("error"); }
    }
  };

  const scoreColor = a.total_score >= 80 ? "#16a34a" : a.total_score >= 60 ? "#d97706" : "#dc2626";
  const scoreLabel = a.total_score >= 80 ? "Strong pass" : a.total_score >= 60 ? "Pass" : "Developing";
  const scoreDimensions = [
    { label: "Problem Framing", score: a.score_problem_framing },
    { label: "Root Cause Analysis", score: a.score_root_cause },
    { label: "Evidence-Based Reasoning", score: a.score_evidence_use },
    { label: "Recommendations", score: a.score_recommendation },
  ];

  const sectionLabel = (text: string): React.CSSProperties => ({
    fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em",
    textTransform: "uppercase", marginBottom: "6px",
  });

  const displayedSkills = txStatus === "done" && caseStudy
    ? caseStudy.skills
    : scoreDimensions.map(s => s.label);

  return (
    <div className="pv-card" style={{
      background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
      overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ padding: "28px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: typeColor(a.challenge_type), background: `${typeColor(a.challenge_type)}12`, borderRadius: "4px", padding: "2px 8px" }}>{a.challenge_type}</span>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: "4px", padding: "2px 8px" }}>{a.industry}</span>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: "4px", padding: "2px 8px", textTransform: "capitalize" }}>{a.difficulty_mode}</span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px", lineHeight: 1.3 }}>
              {txStatus === "done" && caseStudy ? caseStudy.title : a.challenge_title}
            </h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Completed {fmtDate(a.completed_at)}</span>
          </div>
          <ScoreRing score={a.total_score} />
        </div>

        {/* Problem / Context */}
        <div style={{ marginBottom: "16px" }}>
          <div style={sectionLabel("PROBLEM")}>{txStatus === "done" ? "PROBLEM" : "CONTEXT"}</div>
          <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.75, margin: 0 }}>
            {txStatus === "done" && caseStudy
              ? caseStudy.problem
              : `A ${a.difficulty_mode} ${a.challenge_type} scenario in the ${a.industry} sector. This simulation presented a real business problem requiring structured analysis under realistic constraints.`}
          </p>
        </div>

        {/* Approach */}
        {txStatus === "done" && caseStudy ? (
          <div style={{ marginBottom: "16px" }}>
            <div style={sectionLabel("APPROACH")}>APPROACH</div>
            <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px 16px", borderLeft: "3px solid #0891b2" }}>
              <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.75, margin: 0 }}>{caseStudy.approach}</p>
            </div>
          </div>
        ) : prefs.showSubmissions && a.submission_text ? (
          <div style={{ marginBottom: "16px" }}>
            <div style={sectionLabel("APPROACH")}>APPROACH</div>
            <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px 16px", borderLeft: "3px solid #0891b2" }}>
              <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.75, margin: 0 }}>
                {a.submission_text.slice(0, 420)}{a.submission_text.length > 420 ? "…" : ""}
              </p>
            </div>
          </div>
        ) : null}

        {/* Output — only when transformed */}
        {txStatus === "done" && caseStudy && (
          <div style={{ marginBottom: "16px" }}>
            <div style={sectionLabel("OUTPUT")}>OUTPUT</div>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.75, margin: 0 }}>{caseStudy.output}</p>
          </div>
        )}

        {/* Outcome */}
        <div style={{ marginBottom: "16px" }}>
          <div style={sectionLabel("OUTCOME")}>OUTCOME</div>
          {txStatus === "done" && caseStudy && (
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.75, margin: "0 0 10px" }}>{caseStudy.outcome}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: scoreColor }}>{a.total_score}/100</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: scoreColor, background: `${scoreColor}12`, borderRadius: "4px", padding: "2px 8px" }}>{scoreLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
            {scoreDimensions.map(s => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>{s.label}</div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{s.score}<span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400 }}>/25</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div style={{ marginBottom: txStatus !== "done" && !isPublic && a.submission_text ? "20px" : "0" }}>
          <div style={sectionLabel("SKILLS")}>SKILLS DEMONSTRATED</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {displayedSkills.map(s => (
              <span key={s} style={{ fontSize: "11px", fontWeight: 600, color: "#0891b2", background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.2)", borderRadius: "20px", padding: "3px 10px" }}>{s}</span>
            ))}
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "3px 10px", textTransform: "capitalize" }}>{a.industry}</span>
          </div>
        </div>

        {/* Transform button — owner only, pre-transform */}
        {!isPublic && a.submission_text && txStatus !== "done" && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
            {txStatus === "error" && (
              <p style={{ fontSize: "12px", color: "#dc2626", marginBottom: "10px" }}>{txError}</p>
            )}
            <button onClick={runTransform} disabled={txStatus === "loading"} style={{
              background: txStatus === "loading" ? "rgba(8,145,178,0.06)" : "rgba(8,145,178,0.08)",
              border: "1px solid rgba(8,145,178,0.25)", borderRadius: "8px",
              padding: "9px 18px", color: "#0891b2", fontSize: "13px", fontWeight: 600,
              cursor: txStatus === "loading" ? "default" : "pointer",
            }}>
              {txStatus === "loading" ? "Transforming…" : "Transform into case study"}
            </button>
          </div>
        )}

        {/* Asset buttons — owner only, post-transform */}
        {!isPublic && txStatus === "done" && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => openPanel("bullets")} style={{
              background: panel === "bullets" ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.06)",
              border: `1px solid ${panel === "bullets" ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.2)"}`,
              borderRadius: "8px", padding: "9px 18px", color: "#7c3aed", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>
              Resume Bullets
            </button>
            <button onClick={() => openPanel("interview")} style={{
              background: panel === "interview" ? "rgba(5,150,105,0.12)" : "rgba(5,150,105,0.06)",
              border: `1px solid ${panel === "interview" ? "rgba(5,150,105,0.4)" : "rgba(5,150,105,0.2)"}`,
              borderRadius: "8px", padding: "9px 18px", color: "#059669", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>
              Interview Answer
            </button>
          </div>
        )}
      </div>

      {/* Bullets panel */}
      {panel === "bullets" && (
        <div style={{ borderTop: "1px solid #e2e8f0", background: "#faf5ff", padding: "20px 28px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>RESUME BULLETS</div>
          {bulletsStatus === "loading" && <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Generating…</p>}
          {bulletsStatus === "error" && <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>Could not generate bullets. Please try again.</p>}
          {bulletsStatus === "done" && (
            <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ fontSize: "14px", color: "#1e293b", lineHeight: 1.7, marginBottom: i < bullets.length - 1 ? "8px" : "0" }}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Interview panel */}
      {panel === "interview" && (
        <div style={{ borderTop: "1px solid #e2e8f0", background: "#f0fdf4", padding: "20px 28px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#059669", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>INTERVIEW ANSWER (SAR)</div>
          {interviewStatus === "loading" && <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Generating…</p>}
          {interviewStatus === "error" && <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>Could not generate answer. Please try again.</p>}
          {interviewStatus === "done" && (
            <p style={{ fontSize: "14px", color: "#1e293b", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{interviewAnswer}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PortfolioView({ fullName, baLevel, joinedYear, attempts, badges, progress, prefs, isPublic = false }: Props) {
  const earnedBadgeIds = new Set(badges.map(b => b.badge_id));
  const completedModules = new Set(LEARNING_BADGE_IDS.filter(id => earnedBadgeIds.has(id)));

  const achievementBadges = badges.filter(b => !LEARNING_BADGE_IDS.includes(b.badge_id));

  const visibleAttempts = attempts.filter(a => !prefs.hiddenChallenges.includes(a.id));

  const skillLabels = [
    { label: "Elicitation", score: Math.round((visibleAttempts.reduce((s, a) => s + (a.score_problem_framing / 25) * 100, 0) / (visibleAttempts.length || 1))) },
    { label: "Requirements", score: Math.round((visibleAttempts.reduce((s, a) => s + (a.score_root_cause / 25) * 100, 0) / (visibleAttempts.length || 1))) },
    { label: "Solution Analysis", score: Math.round((visibleAttempts.reduce((s, a) => s + (a.score_evidence_use / 25) * 100, 0) / (visibleAttempts.length || 1))) },
    { label: "Stakeholder Mgmt", score: Math.round((visibleAttempts.reduce((s, a) => s + (a.score_recommendation / 25) * 100, 0) / (visibleAttempts.length || 1))) },
  ];

  return (
    <div id="portfolio-root" style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>

      {/* Print styles */}
      <style>{`
        @media print {
          #portfolio-noprint { display: none !important; }
          body { background: white !important; }
          #portfolio-root { background: white !important; }
          .pv-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 32px 36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>

            {/* Avatar */}
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #0891b2, #0e7490)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px", fontWeight: "800", color: "white",
            }}>
              {initials(fullName) || "BA"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginBottom: "4px", letterSpacing: "-0.03em" }}>
                {fullName}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0891b2" }}>{baLevel}</span>
                <span style={{ color: "#cbd5e1" }}>·</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Member since {joinedYear}</span>
                <span style={{ color: "#cbd5e1" }}>·</span>
                <span style={{
                  fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em",
                  background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                  borderRadius: "20px", padding: "3px 10px",
                }}>VERIFIED BA PRACTICE PORTFOLIO</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
              {[
                { value: progress.challenges_completed, label: "Challenges" },
                { value: `${progress.avg_score}%`, label: "Avg Score" },
                { value: badges.length, label: "Badges" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill bars */}
          {visibleAttempts.length > 0 && (
            <div style={{ marginTop: "28px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
              {skillLabels.map(s => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>{s.label}</span>
                    <span style={{ fontSize: "11px", color: "#0891b2", fontWeight: "700" }}>{s.score}%</span>
                  </div>
                  <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.score}%`, background: "#0891b2", borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 32px" }}>

        {/* Case Studies */}
        {visibleAttempts.length > 0 && (
          <section style={{ marginBottom: "48px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.08em", color: "#0891b2", margin: 0, textTransform: "uppercase" }}>
                Case Studies
              </h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{visibleAttempts.length} completed</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {visibleAttempts.map(a => (
                <CaseStudyCard key={a.id} a={a} prefs={prefs} isPublic={isPublic} />
              ))}
            </div>
          </section>
        )}

        {/* Badges */}
        {!isPublic && prefs.showBadges && badges.length > 0 && (
          <section style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.08em", color: "#0891b2", margin: "0 0 20px", textTransform: "uppercase" }}>
              Badges Earned
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
              {/* Learning badges first */}
              {BADGES.filter(b => earnedBadgeIds.has(b.id)).map(b => (
                <div key={b.id} className="pv-card" style={{
                  background: "white", border: "1px solid #e2e8f0", borderRadius: "10px",
                  padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>{b.emoji}</div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>{b.name}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>{b.description.split("—")[0].trim()}</div>
                </div>
              ))}
              {/* Achievement badges */}
              {achievementBadges.map(b => {
                const def = BADGE_DEFINITIONS.find(d => d.id === b.badge_id);
                if (!def) return null;
                return (
                  <div key={b.id} className="pv-card" style={{
                    background: "white", border: "1px solid #e2e8f0", borderRadius: "10px",
                    padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>{def.icon}</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>{def.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>{def.description}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Module Completions */}
        {!isPublic && prefs.showModules && (
          <section style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.08em", color: "#0891b2", margin: "0 0 20px", textTransform: "uppercase" }}>
              Learning Modules
            </h2>
            <div className="pv-card" style={{
              background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
              overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              {ALL_MODULES.map((m, i) => {
                const done = completedModules.has(m.id);
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "14px 20px",
                    borderBottom: i < ALL_MODULES.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: done ? "#f0fdf4" : "white",
                  }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                      background: done ? "#16a34a" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", color: "white", fontWeight: "700",
                    }}>
                      {done ? "✓" : m.order}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: done ? "600" : "400", color: done ? "#15803d" : "#94a3b8" }}>
                      {m.label}
                    </span>
                    {done && (
                      <span style={{ marginLeft: "auto", fontSize: "11px", color: "#16a34a", fontWeight: "700", letterSpacing: "0.05em" }}>COMPLETE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #e2e8f0", paddingTop: "24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px",
        }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            Portfolio generated by <strong style={{ color: "#0891b2" }}>TheBAPortal</strong> — verified BA practice platform
          </p>
          {isPublic && (
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>thebaportal.com</p>
          )}
        </div>
      </div>
    </div>
  );
}
