"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, RotateCcw, ChevronRight,
  ChevronDown, Shield, Zap, AlertTriangle,
  MessageSquare, CheckCircle2, ArrowRight,
  Lightbulb, User, FileText, X, ClipboardCheck,
} from "lucide-react";
import ValidationClient from "./ValidationClient";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stakeholder {
  id: string;
  name: string;
  role: string;
  initials: string;
}

interface Challenge {
  id: string;
  title: string;
  industry: string;
  type: string;
  duration: string;
  tier: string;
  brief: {
    situation: string;
    yourRole: string;
    deliverable: string;
    hints?: string[];
    successCriteria?: string[];
  };
  stakeholders: Stakeholder[];
  flawedDocument?: string;
  plantedErrors?: {
    id: string;
    location: string;
    errorType: string;
    flawedStatement: string;
    correctStatement: string;
    explanation: string;
  }[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  stakeholderId?: string;
}

interface EvalResult {
  totalScore: number;
  dimensions: {
    problemFraming:        { score: number; verdict: string; tip: string };
    rootCause:             { score: number; verdict: string; tip: string };
    evidenceUse:           { score: number; verdict: string; tip: string };
    recommendationQuality: { score: number; verdict: string; tip: string };
  };
  feedback: string;
}

interface ValidationFinding {
  id: string;
  errorLocation: string;
  whatIsWrong: string;
  correction: string;
  whyItMatters: string;
}

interface ValidationResult {
  score: number;
  errorsFound: number;
  totalErrors: number;
  feedback: string;
  dimensions: {
    name: string;
    score: number;
    max: number;
    comment: string;
  }[];
  plantedErrors: {
    id: string;
    found: boolean;
    location: string;
    userFinding?: string;
    correctAnswer: string;
  }[];
}

interface ChallengeClientProps {
  challenge: Challenge;
  mode: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const difficultyConfig = {
  normal: {
    label: "Normal",
    icon: Shield,
    color: "#1fbf9f",
    bg: "rgba(31,191,159,0.08)",
    border: "rgba(31,191,159,0.18)",
    description: "Stakeholders are cooperative and answer questions directly.",
  },
  hard: {
    label: "Hard",
    icon: Zap,
    color: "#fb923c",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.18)",
    description: "One stakeholder is defensive and evasive. Ask sharper questions.",
  },
  expert: {
    label: "Expert",
    icon: AlertTriangle,
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.18)",
    description: "Stakeholders contradict each other and one is disingenuous. Navigate the conflict to find truth.",
  },
};

const dimensionMeta = [
  { key: "problemFraming",        label: "Problem Framing",        color: "#38bdf8" },
  { key: "rootCause",             label: "Root Cause",             color: "#a78bfa" },
  { key: "evidenceUse",           label: "Evidence Use",           color: "#fb923c" },
  { key: "recommendationQuality", label: "Recommendation Quality", color: "#1fbf9f" },
];

function scoreColor(score: number, max = 100): string {
  const pct = score / max;
  if (pct >= 0.8) return "#1fbf9f";
  if (pct >= 0.6) return "#fb923c";
  return "#f87171";
}

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "22px 24px",
};

const cardTeal: React.CSSProperties = {
  background: "rgba(31,191,159,0.04)",
  border: "1px solid var(--teal-border, rgba(31,191,159,0.2))",
  borderRadius: "14px",
  padding: "22px 24px",
};

const defaultHints = [
  "Can you walk me through when this problem started?",
  "What do you think is the primary driver of this issue?",
  "What data do you have that supports that view?",
  "Have there been any recent changes that might be relevant?",
  "What would a successful resolution look like to you?",
];

function renderDeliverable(text: string, fontSize: string, color: string) {
  const numbered = text.match(/\(?\d+\)?[.)]\s+[^()\d.]+/g);
  if (numbered && numbered.length >= 2) {
    const firstMatch = text.search(/\(?\d+\)?[.)]\s+/);
    const intro = firstMatch > 0 ? text.slice(0, firstMatch).trim() : "";
    const items = numbered.map(s => s.replace(/^\(?\d+\)?[.)]\s+/, "").trim());
    return (
      <>
        {intro && (
          <p style={{ fontSize, lineHeight: 1.75, color, marginBottom: "14px", marginTop: 0 }}>{intro}</p>
        )}
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{
                flexShrink: 0, marginTop: "3px", width: "18px", height: "18px", borderRadius: "50%",
                background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 700, color: "var(--teal)",
                fontFamily: "'Inter','Open Sans',sans-serif",
              }}>{i + 1}</span>
              <span style={{ fontSize, lineHeight: 1.65, color }}>{item}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  const paragraphs = text.split("\n\n").filter(Boolean);
  if (paragraphs.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ fontSize, lineHeight: 1.75, color, margin: 0 }}>{para}</p>
        ))}
      </div>
    );
  }
  return <p style={{ fontSize, lineHeight: 1.75, color, margin: 0 }}>{text}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChallengeClient({ challenge, mode: initialMode }: ChallengeClientProps) {
  const router = useRouter();

  const isElicitation = challenge.type === "elicitation";
  type TabType = "brief" | "interview" | "submit" | "validate";

  const [activeTab,   setActiveTab]   = useState<TabType>("brief");
  const [mode,        setMode]        = useState(initialMode || "normal");

  const [activeStakeholderId, setActiveStakeholderId] = useState(challenge.stakeholders[0]?.id || "");
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [inputValue,    setInputValue]    = useState("");
  const [isLoading,     setIsLoading]     = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [showHints,     setShowHints]     = useState(false);
  const [showSummary,   setShowSummary]   = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Phase A — requirements submission
  const [submission,   setSubmission]   = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult,   setEvalResult]   = useState<EvalResult | null>(null);
  const [evalError,    setEvalError]    = useState("");

  // Phase B — validation
  const [isValidating,     setIsValidating]     = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [phaseASubmitted,  setPhaseASubmitted]  = useState(false);

  const activeStakeholder = challenge.stakeholders.find(s => s.id === activeStakeholderId);
  const currentMessages   = conversations[activeStakeholderId] || [];
  const diff = difficultyConfig[mode as keyof typeof difficultyConfig] || difficultyConfig.normal;
  const hints = challenge.brief.hints ?? defaultHints;
  const errorCount = challenge.plantedErrors?.length ?? 5;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isLoading]);

  function switchMode(newMode: string) {
    if (newMode === mode) return;
    setMode(newMode);
    setConversations({});
    setQuestionCount(0);
    setInputValue("");
    setSubmission("");
    setEvalResult(null);
    setEvalError("");
    setValidationResult(null);
  }

  function resetAll() {
    const hasWork =
      questionCount > 0 ||
      submission.trim().length > 0 ||
      evalResult !== null ||
      validationResult !== null;

    if (!hasWork) return;

    if (!confirm("Reset all your work for this challenge? This cannot be undone.")) return;
    setConversations({});
    setQuestionCount(0);
    setInputValue("");
    setSubmission("");
    setEvalResult(null);
    setEvalError("");
    setValidationResult(null);
    setPhaseASubmitted(false);
    setActiveTab("brief");
  }

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isLoading || !activeStakeholder) return;
    const userMsg: Message = { role: "user", content: text, stakeholderId: activeStakeholderId };
    const updated = [...currentMessages, userMsg];
    setConversations(prev => ({ ...prev, [activeStakeholderId]: updated }));
    setInputValue("");
    setIsLoading(true);
    setQuestionCount(prev => prev + 1);
    try {
      const res = await fetch("/api/challenge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, stakeholder: activeStakeholder, messages: updated, difficultyMode: mode }),
      });
      const data = await res.json();
      const aiMsg: Message = { role: "assistant", content: data.response || "Could you clarify what you mean?", stakeholderId: activeStakeholderId };
      setConversations(prev => ({ ...prev, [activeStakeholderId]: [...updated, aiMsg] }));
    } catch {
      setConversations(prev => ({
        ...prev,
        [activeStakeholderId]: [...updated, { role: "assistant", content: "Connection error. Please try again.", stakeholderId: activeStakeholderId }],
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function evaluateSubmission() {
    if (!submission.trim()) { setEvalError("Write your submission before evaluating."); return; }
    setIsEvaluating(true);
    setEvalError("");
    setEvalResult(null);
    const allConversations = Object.entries(conversations)
      .map(([sid, msgs]) => {
        const s = challenge.stakeholders.find(x => x.id === sid);
        return msgs.map(m => `${m.role === "user" ? "BA" : s?.name}: ${m.content}`).join("\n");
      })
      .join("\n\n---\n\n");
    try {
      const res = await fetch("/api/challenge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, submission, conversations: allConversations, difficultyMode: mode, questionCount }),
      });
      const data = await res.json();
      if (data.error) { setEvalError(data.error); return; }
      setEvalResult(data);
      if (isElicitation) setPhaseASubmitted(true);
    } catch {
      setEvalError("Evaluation failed. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleValidationSubmit(findings: ValidationFinding[]) {
    setIsValidating(true);
    const allConversations = Object.entries(conversations)
      .map(([sid, msgs]) => {
        const s = challenge.stakeholders.find(x => x.id === sid);
        return msgs.map(m => `${m.role === "user" ? "BA" : s?.name}: ${m.content}`).join("\n");
      })
      .join("\n\n---\n\n");
    try {
      const res = await fetch("/api/challenge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          phase: "validation",
          findings,
          conversations: allConversations,
          difficultyMode: mode,
        }),
      });
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }
      setValidationResult(data);
    } catch (e) {
      console.error("Validation failed", e);
    } finally {
      setIsValidating(false);
    }
  }

  function resetInterview() {
    setConversations({});
    setQuestionCount(0);
    setInputValue("");
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "brief",     label: "Brief" },
    { key: "interview", label: "Interview" },
    { key: "submit",    label: isElicitation ? "Phase A — Document" : "Submit" },
    ...(isElicitation ? [{ key: "validate" as TabType, label: "Phase B — Validate" }] : []),
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* TOP BAR */}
      <header style={{
        height: "56px", display: "flex", alignItems: "center",
        padding: "0 24px", borderBottom: "1px solid var(--border)",
        background: "rgba(9,9,11,0.92)", backdropFilter: "blur(20px)",
        flexShrink: 0, gap: "16px",
      }}>
        <button onClick={() => router.push("/scenarios")}
          style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div style={{
          fontFamily: "'Inter','Open Sans',sans-serif",
          fontWeight: 600, fontSize: "14px", color: "var(--text-1)",
          flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {challenge.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {questionCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 12px", borderRadius: "99px",
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            }}>
              <MessageSquare className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>{questionCount}Q</span>
            </div>
          )}
          {(questionCount > 0 || submission.trim().length > 0 || evalResult !== null || validationResult !== null) && (
          <button onClick={resetAll} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "99px",
            background: "none", border: "1px solid var(--border)",
            color: "var(--text-4)", fontSize: "12px", fontWeight: 500,
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(248,113,113,0.4)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-4)"; }}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "99px",
            background: diff.bg, border: `1px solid ${diff.border}`,
          }}>
            <diff.icon className="w-3.5 h-3.5" style={{ color: diff.color }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: diff.color }}>{diff.label}</span>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div style={{
        display: "flex", padding: "0 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0,
      }}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.key;
          const isDone =
            (tab.key === "brief" && activeTab !== "brief") ||
            (tab.key === "interview" && (activeTab === "submit" || activeTab === "validate")) ||
            (tab.key === "submit" && activeTab === "validate" && phaseASubmitted);
          const isLocked = tab.key === "validate" && !phaseASubmitted;
          return (
            <button
              key={tab.key}
              onClick={() => !isLocked && setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "14px 20px", fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                color: isLocked ? "var(--text-4)" : isActive ? "var(--text-1)" : "var(--text-3)",
                background: "none", border: "none",
                borderBottom: isActive ? "2px solid var(--teal)" : "2px solid transparent",
                cursor: isLocked ? "not-allowed" : "pointer",
                transition: "all 0.15s ease", marginBottom: "-1px",
              }}
            >
              <span style={{
                width: "20px", height: "20px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                background: isActive ? "var(--teal)" : isDone ? "rgba(31,191,159,0.15)" : isLocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
                color: isActive ? "#05120f" : isDone ? "var(--teal)" : isLocked ? "var(--text-4)" : "var(--text-3)",
                flexShrink: 0,
              }}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : tab.key === "validate" ? <ClipboardCheck className="w-3 h-3" /> : i + 1}
              </span>
              {tab.label}
              {isLocked && (
                <span style={{ fontSize: "10px", color: "var(--text-4)", marginLeft: "2px" }}>— complete Phase A first</span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div style={{
        flex: 1,
        overflow: activeTab === "interview" || activeTab === "validate" ? "hidden" : "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <AnimatePresence mode="wait">

          {/* ════ BRIEF TAB ════ */}
          {activeTab === "brief" && (
            <motion.div key="brief"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ maxWidth: "1000px", margin: "0 auto", padding: "36px 24px 60px" }}
            >
              <div style={{ marginBottom: "32px" }}>
                <div className="type-label" style={{ marginBottom: "12px" }}>Select Difficulty Mode</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {Object.entries(difficultyConfig).map(([key, cfg]) => {
                    const isSelected = mode === key;
                    return (
                      <button key={key} onClick={() => switchMode(key)} style={{
                        padding: "18px 20px", borderRadius: "14px",
                        border: `1px solid ${isSelected ? cfg.border : "var(--border)"}`,
                        background: isSelected ? cfg.bg : "var(--card)",
                        cursor: "pointer", textAlign: "left", transition: "all 0.18s ease",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <cfg.icon className="w-4 h-4" style={{ color: isSelected ? cfg.color : "var(--text-3)" }} />
                          <span style={{ fontSize: "15px", fontWeight: 700, color: isSelected ? cfg.color : "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.55, margin: 0 }}>{cfg.description}</p>
                      </button>
                    );
                  })}
                </div>
                {Object.keys(conversations).some(k => (conversations[k] || []).length > 0) && (
                  <p style={{ fontSize: "12px", color: "#fb923c", marginTop: "10px", fontStyle: "italic" }}>
                    Switching difficulty resets your current conversation.
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div>
                    <div className="type-label" style={{ marginBottom: "12px" }}>Situation</div>
                    <div style={card}>
                      <p style={{ fontSize: "15px", lineHeight: 1.75, color: "var(--text-1)", margin: 0 }}>
                        {challenge.brief.situation}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="type-label" style={{ marginBottom: "12px" }}>Required Deliverable</div>
                    <div style={cardTeal}>
                      {renderDeliverable(challenge.brief.deliverable, "15px", "var(--text-1)")}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ height: "28px" }} />
                  <div style={{ ...card, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif", marginBottom: "12px" }}>
                      Your Role
                    </div>
                    <div style={{ height: "1px", background: "var(--border)", marginBottom: "16px" }} />
                    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-2)", margin: 0, marginBottom: "20px" }}>
                      {challenge.brief.yourRole}
                    </p>
                    <div style={{ height: "1px", background: "var(--border)", marginBottom: "20px" }} />
                    <p style={{ fontSize: "14px", color: "var(--text-3)", lineHeight: 1.65, margin: 0, marginBottom: "16px" }}>
                      {isElicitation
                        ? "Interview all four stakeholders, then document requirements (Phase A) and validate the captured document (Phase B)."
                        : "The next step opens simulated stakeholder conversations."}
                    </p>
                    <button onClick={() => setActiveTab("interview")} className="btn-teal"
                      style={{ width: "100%", justifyContent: "center", fontSize: "14px", padding: "12px 16px" }}>
                      Begin Stakeholder Interviews <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {challenge.brief.successCriteria && challenge.brief.successCriteria.length > 0 && (
                    <div style={{ ...card, marginTop: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif", marginBottom: "12px" }}>
                        Success Criteria
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {challenge.brief.successCriteria.map((item, i) => (
                          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--teal)" }} />
                            <span style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.6 }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ INTERVIEW TAB ════ */}
          {activeTab === "interview" && (
            <motion.div key="interview"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                minHeight: 0, position: "relative",
                maxWidth: "820px", margin: "0 auto", width: "100%", padding: "0 24px",
              }}
            >
              {/* Stakeholder tabs */}
              <div style={{ display: "flex", gap: "10px", padding: "20px 0 16px", flexShrink: 0 }}>
                {challenge.stakeholders.map(s => {
                  const isActive = s.id === activeStakeholderId;
                  const msgCount = (conversations[s.id] || []).filter(m => m.role === "user").length;
                  return (
                    <button key={s.id} onClick={() => setActiveStakeholderId(s.id)} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 16px", borderRadius: "12px",
                      border: `1px solid ${isActive ? "var(--teal-border, rgba(31,191,159,0.3))" : "var(--border)"}`,
                      background: isActive ? "rgba(31,191,159,0.06)" : "var(--card)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}>
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700,
                        background: isActive ? "var(--teal)" : "rgba(255,255,255,0.08)",
                        color: isActive ? "#05120f" : "var(--text-2)",
                        fontFamily: "'Inter','Open Sans',sans-serif",
                      }}>
                        {s.initials}
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "var(--teal)" : "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
                          {s.role}{msgCount > 0 ? ` · ${msgCount}Q` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                  <button onClick={resetInterview} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 14px", borderRadius: "10px",
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--text-3)", fontSize: "13px", cursor: "pointer",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />Reset
                  </button>
                </div>
              </div>

              {/* Stakeholder header */}
              {activeStakeholder && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 20px", borderRadius: "14px",
                  background: "var(--card)", border: "1px solid var(--border)",
                  marginBottom: "16px", flexShrink: 0,
                }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 700,
                    background: "rgba(31,191,159,0.08)", color: "var(--teal)",
                    border: "1px solid rgba(31,191,159,0.2)",
                    fontFamily: "'Inter','Open Sans',sans-serif", flexShrink: 0,
                  }}>
                    {activeStakeholder.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                      {activeStakeholder.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)" }}>{activeStakeholder.role}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 4px rgba(31,191,159,0.5)" }} />
                    <span style={{ fontSize: "12px", color: "var(--teal)", fontWeight: 500 }}>Available for interview</span>
                  </div>
                </div>
              )}

              {/* Chat */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {currentMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <User className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-4)" }} />
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-3)", marginBottom: "6px" }}>
                      Start by asking {activeStakeholder?.name?.split(" ")[0]} a question
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-4)" }}>
                      Use your interview to uncover the root cause of the business problem.
                    </p>
                  </div>
                )}
                {currentMessages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: "10px", alignItems: "flex-start" }}>
                      {!isUser && (
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "11px", fontWeight: 700, flexShrink: 0,
                          background: "rgba(31,191,159,0.08)", color: "var(--teal)",
                          border: "1px solid rgba(31,191,159,0.2)",
                          fontFamily: "'Inter','Open Sans',sans-serif", marginTop: "2px",
                        }}>
                          {activeStakeholder?.initials}
                        </div>
                      )}
                      <div style={{
                        maxWidth: "72%", padding: "13px 18px",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isUser ? "rgba(31,191,159,0.08)" : "var(--card)",
                        border: `1px solid ${isUser ? "rgba(31,191,159,0.2)" : "var(--border)"}`,
                        fontSize: "15px", lineHeight: 1.65, color: "var(--text-1)",
                      }}>
                        {msg.content}
                      </div>
                      {isUser && (
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border)", marginTop: "2px",
                        }}>
                          <User className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, flexShrink: 0,
                      background: "rgba(31,191,159,0.08)", color: "var(--teal)",
                      border: "1px solid rgba(31,191,159,0.2)",
                      fontFamily: "'Inter','Open Sans',sans-serif",
                    }}>
                      {activeStakeholder?.initials}
                    </div>
                    <div style={{
                      padding: "14px 18px", borderRadius: "16px 16px 16px 4px",
                      background: "var(--card)", border: "1px solid var(--border)",
                      display: "flex", gap: "5px", alignItems: "center",
                    }}>
                      {[0, 1, 2].map(j => (
                        <motion.div key={j} animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                          style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-3)" }} />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Hints */}
              <div style={{ flexShrink: 0, marginTop: "12px" }}>
                <button onClick={() => setShowHints(h => !h)} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "10px 16px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "none",
                  cursor: "pointer", color: "var(--text-3)", fontSize: "13px", fontWeight: 500,
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(31,191,159,0.3)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: "#fb923c" }} />
                  <span style={{ flex: 1, textAlign: "left" }}>Not sure what to ask? View hints</span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ transform: showHints ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                <AnimatePresence>
                  {showHints && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      style={{
                        overflow: "hidden", background: "rgba(251,146,60,0.05)",
                        border: "1px solid rgba(251,146,60,0.15)", borderTop: "none",
                        borderRadius: "0 0 10px 10px", padding: "14px 16px",
                      }}>
                      <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "10px", fontWeight: 600 }}>
                        Hints to guide your investigation:
                      </p>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {hints.map((hint, i) => (
                          <li key={i} onClick={() => { setInputValue(hint); setShowHints(false); }} style={{
                            fontSize: "13px", color: "var(--text-2)",
                            paddingBottom: i < hints.length - 1 ? "8px" : 0,
                            marginBottom: i < hints.length - 1 ? "8px" : 0,
                            borderBottom: i < hints.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                            cursor: "pointer",
                          }}>
                            → {hint}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input */}
              <div style={{ flexShrink: 0, padding: "14px 0 20px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Ask ${activeStakeholder?.name?.split(" ")[0] || "stakeholder"} a question...`}
                  rows={1}
                  style={{
                    flex: 1, padding: "13px 18px", borderRadius: "12px",
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--text-1)", fontSize: "15px",
                    fontFamily: "'Open Sans', sans-serif",
                    resize: "none", outline: "none", lineHeight: 1.5,
                    transition: "border-color 0.15s", maxHeight: "120px", overflowY: "auto",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(31,191,159,0.3)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <button onClick={sendMessage} disabled={isLoading || !inputValue.trim()} style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: inputValue.trim() ? "var(--teal)" : "rgba(255,255,255,0.06)",
                  border: "none", cursor: inputValue.trim() ? "pointer" : "default",
                  transition: "all 0.15s ease", flexShrink: 0,
                }}>
                  <Send className="w-4 h-4" style={{ color: inputValue.trim() ? "#05120f" : "var(--text-4)" }} />
                </button>
              </div>

              {/* Summary Overlay */}
              <AnimatePresence>
                {showSummary && (
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    style={{
                      position: "absolute", bottom: "110px", left: 0, right: 0,
                      background: "var(--surface, #0e0e12)", border: "1px solid var(--border)",
                      borderRadius: "16px", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
                      zIndex: 50, maxHeight: "380px", display: "flex", flexDirection: "column",
                    }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                        Interview Summary
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          onClick={() => {
                            const summaryLines = challenge.stakeholders.map((s: {id: string; name: string; role: string}) => {
                              const msgs = conversations[s.id] || [];
                              if (msgs.length === 0) return `${s.name} (${s.role})\n  Not yet interviewed`;
                              const lines = msgs.map((m: {role: string; content: string}) =>
                                m.role === "user" ? `  You: ${m.content}` : `  ${s.name}: ${m.content}`
                              ).join("\n\n");
                              return `${s.name} (${s.role})\n\n${lines}`;
                            }).join("\n\n---\n\n");
                            const text = `INTERVIEW SUMMARY\n${challenge.title}\n${"=".repeat(50)}\n\n${summaryLines}`;
                            const blob = new Blob([text], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url; a.download = `interview-summary-${challenge.id}.txt`; a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                            color: "var(--teal)", background: "rgba(31,191,159,0.08)",
                            border: "1px solid rgba(31,191,159,0.2)", cursor: "pointer",
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" /> Export .txt
                        </button>
                        <button onClick={() => setShowSummary(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex" }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
                      {challenge.stakeholders.map(s => {
                        const msgs = conversations[s.id] || [];
                        return (
                          <div key={s.id} style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: msgs.length > 0 ? "var(--teal)" : "var(--text-4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                              {s.name} — {s.role}
                            </div>
                            {msgs.length === 0 ? (
                              <p style={{ fontSize: "13px", color: "var(--text-4)", fontStyle: "italic", margin: 0 }}>Not yet interviewed</p>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {msgs.map((m, i) => (
                                  <div key={i} style={{
                                    padding: "10px 14px", borderRadius: "10px",
                                    background: m.role === "user" ? "rgba(31,191,159,0.05)" : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${m.role === "user" ? "rgba(31,191,159,0.15)" : "rgba(255,255,255,0.06)"}`,
                                  }}>
                                    <div style={{ fontSize: "10px", fontWeight: 700, color: m.role === "user" ? "var(--teal)" : "var(--text-3)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      {m.role === "user" ? "You" : s.name}
                                    </div>
                                    <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>{m.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status bar */}
              <div style={{
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0 20px", borderTop: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-3)" }}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {questionCount} question{questionCount !== 1 ? "s" : ""} asked
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-3)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {Object.keys(conversations).filter(sid => (conversations[sid] || []).length > 0).length}/{challenge.stakeholders.length} interviewed
                  </span>
                  {questionCount > 0 && (
                    <button onClick={() => setShowSummary(s => !s)} style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                      color: showSummary ? "var(--teal)" : "var(--text-3)",
                      background: showSummary ? "rgba(31,191,159,0.08)" : "none",
                      border: `1px solid ${showSummary ? "rgba(31,191,159,0.2)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <FileText className="w-3.5 h-3.5" />
                      {showSummary ? "Hide" : "View"} Summary
                    </button>
                  )}
                </div>
                {(() => {
                  const interviewedCount = Object.keys(conversations).filter(sid => (conversations[sid] || []).length > 0).length;
                  const allInterviewed = interviewedCount >= challenge.stakeholders.length;
                  return (
                    <button
                      onClick={() => setActiveTab("submit")}
                      className={allInterviewed ? "btn-teal" : "btn-outline"}
                      style={{ padding: "9px 20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {allInterviewed ? (
                        <>{isElicitation ? "Document Requirements" : "Submit Work"} <ChevronRight className="w-3.5 h-3.5" /></>
                      ) : (
                        <>{interviewedCount}/{challenge.stakeholders.length} Interviewed — Submit Anyway</>
                      )}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* ════ SUBMIT / PHASE A TAB ════ */}
          {activeTab === "submit" && (
            <motion.div key="submit"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ maxWidth: "820px", margin: "0 auto", padding: "36px 24px 60px" }}
            >
              {!evalResult ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "28px", alignItems: "start" }}>
                  <div>
                    <div className="type-label" style={{ marginBottom: "12px" }}>
                      {isElicitation ? "Phase A — Required Deliverable" : "Required Deliverable"}
                    </div>
                    <div style={cardTeal}>
                      {renderDeliverable(challenge.brief.deliverable, "14px", "var(--text-2)")}
                    </div>
                    <div style={{
                      marginTop: "16px", padding: "14px 16px", borderRadius: "12px",
                      background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.15)",
                    }}>
                      <p style={{ fontSize: "12px", color: "#fb923c", margin: 0, lineHeight: 1.65, fontWeight: 500 }}>
                        💡 Reference your stakeholder conversations. Name specific insights, data points, or contradictions you uncovered.
                      </p>
                    </div>
                    {isElicitation && (
                      <div style={{
                        marginTop: "12px", padding: "14px 16px", borderRadius: "12px",
                        background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.15)",
                      }}>
                        <p style={{ fontSize: "12px", color: "var(--teal)", margin: 0, lineHeight: 1.65, fontWeight: 500 }}>
                          After submitting Phase A, Phase B — Validate will unlock where you will review the captured requirements document for errors.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="type-label" style={{ marginBottom: "12px" }}>Your Submission</div>
                    <textarea
                      value={submission}
                      onChange={e => setSubmission(e.target.value)}
                      placeholder="Write your complete deliverable here. Be thorough — Alex Rivera will evaluate every dimension of your response."
                      style={{
                        width: "100%", minHeight: "340px", padding: "18px 20px",
                        borderRadius: "14px", border: "1px solid var(--border)",
                        background: "var(--card)", color: "var(--text-1)",
                        fontSize: "15px", fontFamily: "'Open Sans', sans-serif",
                        lineHeight: 1.7, resize: "vertical", outline: "none",
                        transition: "border-color 0.15s", boxSizing: "border-box",
                      }}
                      onFocus={e => (e.target.style.borderColor = "rgba(31,191,159,0.3)")}
                      onBlur={e => (e.target.style.borderColor = "var(--border)")}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{submission.length} characters</span>
                      {submission.length > 0 && submission.length < 200 && (
                        <span style={{ fontSize: "12px", color: "#fb923c" }}>Write more — aim for 300+ characters</span>
                      )}
                    </div>
                    {evalError && (
                      <div style={{
                        padding: "12px 16px", borderRadius: "10px",
                        background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                        marginTop: "12px", fontSize: "14px", color: "#f87171",
                      }}>
                        {evalError}
                      </div>
                    )}
                    <button onClick={evaluateSubmission} disabled={isEvaluating || !submission.trim()} className="btn-teal"
                      style={{ marginTop: "14px", width: "100%", justifyContent: "center", fontSize: "15px", padding: "14px", opacity: isEvaluating ? 0.7 : 1 }}>
                      {isEvaluating ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{ width: "16px", height: "16px", border: "2px solid #05120f", borderTopColor: "transparent", borderRadius: "50%" }} />
                          Alex Rivera is evaluating...
                        </>
                      ) : (
                        <>Submit for Evaluation <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                  {/* Score hero */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "32px",
                    padding: "32px 36px", borderRadius: "20px",
                    background: "var(--card)", border: `1px solid ${scoreColor(evalResult.totalScore)}30`,
                    marginBottom: "24px", position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 80% 50%, ${scoreColor(evalResult.totalScore)}08 0%, transparent 60%)` }} />
                    <div style={{ position: "relative" }}>
                      <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "56px", color: scoreColor(evalResult.totalScore), letterSpacing: "-0.04em", lineHeight: 1 }}>
                        {evalResult.totalScore}
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--text-3)", marginTop: "4px" }}>out of 100</div>
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "20px", color: "var(--text-1)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
                        {evalResult.totalScore >= 85 ? "Excellent work." : evalResult.totalScore >= 70 ? "Solid effort." : evalResult.totalScore >= 50 ? "Developing." : "Needs significant work."}
                      </div>
                      <p style={{ fontSize: "14px", color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
                        {evalResult.totalScore >= 85 ? "You demonstrated strong BA thinking across all dimensions." : evalResult.totalScore >= 70 ? "A solid submission with some gaps to address." : evalResult.totalScore >= 50 ? "Core understanding is present but depth is missing." : "Review the feedback below and resubmit with a stronger approach."}
                      </p>
                      <div style={{ height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", marginTop: "16px", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${evalResult.totalScore}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          style={{ height: "100%", borderRadius: "99px", background: scoreColor(evalResult.totalScore) }} />
                      </div>
                    </div>
                  </div>

                  {/* Dimension cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    {dimensionMeta.map(dim => {
                      const d = evalResult.dimensions[dim.key as keyof typeof evalResult.dimensions];
                      return (
                        <motion.div key={dim.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                          style={{ padding: "20px 22px", borderRadius: "16px", background: "var(--card)", border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: `${dim.color}12`, color: dim.color, border: `1px solid ${dim.color}22` }}>
                              {dim.label}
                            </span>
                            <span style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "18px", color: scoreColor(d.score, 25), letterSpacing: "-0.02em" }}>
                              {d.score}<span style={{ fontSize: "12px", color: "var(--text-4)", fontWeight: 400 }}>/25</span>
                            </span>
                          </div>
                          <div style={{ height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", marginBottom: "14px", overflow: "hidden" }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.score / 25) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                              style={{ height: "100%", borderRadius: "99px", background: scoreColor(d.score, 25) }} />
                          </div>
                          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.6, marginBottom: "10px" }}>{d.verdict}</p>
                          <p style={{ fontSize: "12px", color: dim.color, lineHeight: 1.55, margin: 0, paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            → {d.tip}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Alex Rivera */}
                  <div style={{ padding: "28px 32px", borderRadius: "18px", background: "var(--card)", border: "1px solid var(--border)", marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", fontFamily: "'Inter','Open Sans',sans-serif", flexShrink: 0 }}>
                        AR
                      </div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>Alex Rivera</div>
                        <div style={{ fontSize: "12px", color: "var(--text-3)" }}>Senior BA Coach · TheBAPortal</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "15px", lineHeight: 1.8, color: "var(--text-2)" }}>
                      {evalResult.feedback.split("\n\n").map((para, i, arr) => (
                        <p key={i} style={{ marginBottom: i < arr.length - 1 ? "18px" : 0 }}>{para}</p>
                      ))}
                    </div>
                    <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)", fontSize: "13px", color: "var(--text-4)", fontStyle: "italic" }}>
                      — Alex Rivera, Senior BA Coach at TheBAPortal
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => { setEvalResult(null); setSubmission(""); }} className="btn-outline" style={{ flex: 1, justifyContent: "center", padding: "13px" }}>
                      <RotateCcw className="w-4 h-4" />Revise & Resubmit
                    </button>
                    {isElicitation ? (
                      <button onClick={() => setActiveTab("validate")} className="btn-teal" style={{ flex: 1, justifyContent: "center", padding: "13px" }}>
                        Proceed to Phase B — Validate <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => router.push("/scenarios")} className="btn-teal" style={{ flex: 1, justifyContent: "center", padding: "13px" }}>
                        Next Challenge <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ════ VALIDATE / PHASE B TAB ════ */}
          {activeTab === "validate" && isElicitation && challenge.flawedDocument && (
            <motion.div key="validate"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                minHeight: 0, maxWidth: "1100px", margin: "0 auto",
                width: "100%", padding: "24px 24px 0",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "20px", flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif", marginBottom: "4px" }}>
                    Phase B — Requirements Validation
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0 }}>
                    The document below was captured by a junior analyst. Find and correct all {errorCount} errors before sign-off.
                  </p>
                </div>
              </div>

              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: validationResult ? "auto" : "hidden",
                paddingBottom: "32px",
              }}>
                <ValidationClient
                  flawedDocument={challenge.flawedDocument}
                  errorCount={errorCount}
                  challengeId={challenge.id}
                  onSubmit={handleValidationSubmit}
                  onTryAgain={() => setValidationResult(null)}
                  onNextChallenge={() => router.push("/scenarios")}
                  isEvaluating={isValidating}
                  result={validationResult ?? undefined}
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}