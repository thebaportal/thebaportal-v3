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
  initials?: string;
  avatar?: string;
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
  // New fields — optional for legacy record compatibility
  topFix?:      string;
  doThisNext?:  string;
  betterMove?:  string;
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

interface RelatedJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
}

interface ChallengeAttempt {
  id: string;
  difficulty_mode: string;
  status: string;
  current_tab: string;
  conversations: Record<string, Message[]>;
  submission_text: string;
  eval_result: EvalResult | null;
  validation_result: ValidationResult | null;
  question_count: number;
}

interface ChallengeClientProps {
  challenge: Challenge;
  mode: string;
  relatedJobs?: RelatedJob[];
  initialDraft?: ChallengeAttempt | null;
  isFirstAttempt?: boolean;
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

const preStartCues: Record<string, string[]> = {
  "discovery":           ["Ask open-ended questions.", "Clarify assumptions early.", "Summarize what you're hearing."],
  "requirements":        ["Separate needs from solutions.", "Challenge vague language.", "Define scope clearly."],
  "facilitation":        ["Keep the discussion focused.", "Surface disagreements early.", "Drive toward a decision."],
  "uat":                 ["Validate expected vs actual behavior.", "Call out defects clearly.", "Stay structured."],
  "solution-analysis":   ["Weigh trade-offs explicitly.", "Question assumptions.", "Think beyond immediate impact."],
  "elicitation":         ["Draw out what's unsaid.", "Ask why before what.", "Probe for hidden constraints."],
  "change-management":   ["Acknowledge resistance.", "Focus on people impact.", "Tie change to outcomes."],
  "production-incident": ["Stay calm and methodical.", "Separate symptoms from root cause.", "Communicate clearly."],
  "data-migration":      ["Clarify ownership early.", "Surface data risks.", "Confirm rollback plans."],
  "erp-implementation":  ["Map current and future state.", "Identify process gaps.", "Align stakeholders on scope."],
};

/** Trim brief.situation to at most 2 sentences for the pre-start modal */
function trimSituation(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(" ").trim() || text.slice(0, 180).trim();
}

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
export default function ChallengeClient({ challenge, mode: initialMode, relatedJobs = [], initialDraft = null, isFirstAttempt = true }: ChallengeClientProps) {
  const router = useRouter();

  const isElicitation = challenge.type === "elicitation";
  type TabType = "brief" | "interview" | "submit" | "validate";

  const draft = initialDraft;
  const hasDraft = draft !== null && draft.status === "draft" && draft.question_count > 0;

  const [activeTab,   setActiveTab]   = useState<TabType>(
    hasDraft ? (draft.current_tab as TabType) : "brief"
  );
  const [mode,        setMode]        = useState(hasDraft ? draft.difficulty_mode : (initialMode || "normal"));

  const [activeStakeholderId, setActiveStakeholderId] = useState(challenge.stakeholders[0]?.id || "");
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    hasDraft ? (draft.conversations ?? {}) : {}
  );
  const [inputValue,    setInputValue]    = useState("");
  const [isLoading,     setIsLoading]     = useState(false);
  const [questionCount, setQuestionCount] = useState(hasDraft ? draft.question_count : 0);
  const [showHints,             setShowHints]             = useState(false);
  const [showSummary,           setShowSummary]           = useState(false);
  const [showPreStart,          setShowPreStart]          = useState(false);
  const [skipNextTime,          setSkipNextTime]          = useState(false);
  const [retryTopFix,           setRetryTopFix]           = useState<string | null>(null);
  const [previousScore,         setPreviousScore]         = useState<number | null>(null);
  const [retryBannerDismissed,  setRetryBannerDismissed]  = useState(false);
  const [showResetModal,        setShowResetModal]        = useState(false);
  const preStartKey = `prestart_skip_${challenge.id}`;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initializedStakeholders = useRef<Set<string>>(new Set());

  // Draft persistence
  const [attemptId,     setAttemptId]     = useState<string | null>(hasDraft ? draft.id : null);
  const [draftRestored, setDraftRestored] = useState(hasDraft);
  // Use a ref so save callbacks always read latest state without stale closures
  const liveRef = useRef({
    attemptId: hasDraft ? draft.id : null as string | null,
    conversations: hasDraft ? (draft.conversations ?? {}) : {} as Record<string, Message[]>,
    submission: hasDraft ? draft.submission_text : "",
    mode: hasDraft ? draft.difficulty_mode : (initialMode || "normal"),
    activeTab: hasDraft ? (draft.current_tab as TabType) : "brief" as TabType,
    questionCount: hasDraft ? draft.question_count : 0,
    evalResult: hasDraft ? draft.eval_result : null as EvalResult | null,
    validationResult: hasDraft ? draft.validation_result : null as ValidationResult | null,
  });

  // Phase A — requirements submission
  const [submission,   setSubmission]   = useState(hasDraft ? draft.submission_text : "");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult,   setEvalResult]   = useState<EvalResult | null>(hasDraft ? draft.eval_result : null);
  const [evalError,    setEvalError]    = useState("");

  // Phase B — validation
  const [isValidating,     setIsValidating]     = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(hasDraft ? draft.validation_result : null);
  const [phaseASubmitted,  setPhaseASubmitted]  = useState(hasDraft && !!draft.eval_result && isElicitation);

  const activeStakeholder = challenge.stakeholders.find(s => s.id === activeStakeholderId);
  const currentMessages   = conversations[activeStakeholderId] || [];
  const diff = difficultyConfig[mode as keyof typeof difficultyConfig] || difficultyConfig.normal;
  const hints = challenge.brief.hints ?? defaultHints;
  const errorCount = challenge.plantedErrors?.length ?? 5;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isLoading]);

  // Keep liveRef in sync so save callbacks are never stale
  useEffect(() => {
    liveRef.current = { attemptId, conversations, submission, mode, activeTab, questionCount, evalResult, validationResult };
  });

  async function saveDraft(overrideStatus?: string) {
    const s = liveRef.current;
    // Don't create a new record if there's nothing meaningful yet
    if (!s.attemptId && s.questionCount === 0 && !s.submission.trim() && !s.evalResult) return;
    try {
      const res = await fetch("/api/challenge/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.attemptId,
          challengeId: challenge.id,
          mode: s.mode,
          status: overrideStatus ?? "draft",
          currentTab: s.activeTab,
          conversations: s.conversations,
          submission: s.submission,
          evalResult: s.evalResult,
          validationResult: s.validationResult,
          questionCount: s.questionCount,
        }),
      });
      const data = await res.json();
      if (data.id && !s.attemptId) {
        setAttemptId(data.id);
        liveRef.current.attemptId = data.id;
      }
    } catch {
      // silent — autosave failures should not interrupt the user
    }
  }

  // Debounced save for submission text changes
  const submissionSaveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!submission.trim()) return;
    if (submissionSaveTimer.current) clearTimeout(submissionSaveTimer.current);
    submissionSaveTimer.current = setTimeout(() => saveDraft(), 2000);
    return () => { if (submissionSaveTimer.current) clearTimeout(submissionSaveTimer.current); };
  }, [submission]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-mark stakeholders that already have messages (from draft) so greeting isn't re-inserted
  useEffect(() => {
    Object.keys(conversations).forEach(sid => {
      if ((conversations[sid] || []).length > 0) {
        initializedStakeholders.current.add(sid);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-insert stakeholder greeting when entering interview tab for the first time
  useEffect(() => {
    if (activeTab !== "interview") return;
    if (initializedStakeholders.current.has(activeStakeholderId)) return;
    if (!activeStakeholder) return;
    initializedStakeholders.current.add(activeStakeholderId);
    const firstName = activeStakeholder.name.split(" ")[0];
    setConversations(prev => ({
      ...prev,
      [activeStakeholderId]: [{
        role: "assistant",
        content: `Hi, I'm ${firstName}. What would you like to understand about this situation?`,
        stakeholderId: activeStakeholderId,
      }],
    }));
  }, [activeTab, activeStakeholderId, activeStakeholder]);

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

    if (!hasWork) {
      // Nothing to clear — just reset draft state directly
      setDraftRestored(false);
      return;
    }

    setShowResetModal(true);
  }

  function confirmReset() {
    setShowResetModal(false);
    initializedStakeholders.current = new Set();
    setAttemptId(null);
    setDraftRestored(false);
    setConversations({});
    setQuestionCount(0);
    setInputValue("");
    setSubmission("");
    setEvalResult(null);
    setEvalError("");
    setValidationResult(null);
    setPhaseASubmitted(false);
    setActiveTab("brief");
    liveRef.current = { attemptId: null, conversations: {}, submission: "", mode, activeTab: "brief", questionCount: 0, evalResult: null, validationResult: null };
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
      const finalMsgs = [...updated, aiMsg];
      setConversations(prev => ({ ...prev, [activeStakeholderId]: finalMsgs }));
      // Save after AI responds (liveRef will have stale conversations at this point, patch it)
      liveRef.current.conversations = { ...liveRef.current.conversations, [activeStakeholderId]: finalMsgs };
      saveDraft();
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
      liveRef.current.evalResult = data;
      if (isElicitation) setPhaseASubmitted(true);
      saveDraft("evaluated");
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

  function goToTab(tab: TabType) {
    setActiveTab(tab);
    liveRef.current.activeTab = tab;
    saveDraft();
  }

  function resetInterview() {
    initializedStakeholders.current = new Set();
    setConversations({});
    setQuestionCount(0);
    setInputValue("");
    liveRef.current.conversations = {};
    liveRef.current.questionCount = 0;
    saveDraft();
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
          {attemptId && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--teal)", opacity: 0.7 }} />
              <span style={{ fontSize: "11px", color: "var(--text-4)" }}>Saving</span>
            </div>
          )}
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
              onClick={() => !isLocked && goToTab(tab.key)}
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
              {/* Draft restored card */}
              {draftRestored && (
                <div style={{
                  marginBottom: "24px", padding: "20px 24px", borderRadius: "16px",
                  background: "var(--card)",
                  border: "1px solid rgba(31,191,159,0.25)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
                }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", marginBottom: "4px", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                      Pick up where you left off
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                      Your previous attempt is ready.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => { setDraftRestored(false); goToTab("interview"); }} style={{
                      fontSize: "13px", fontWeight: 700,
                      padding: "9px 18px", borderRadius: "9px",
                      background: "var(--teal)", color: "#041a13",
                      border: "none", cursor: "pointer",
                      fontFamily: "'Inter','Open Sans',sans-serif",
                    }}>
                      Continue
                    </button>
                    <button onClick={resetAll} style={{
                      fontSize: "13px", fontWeight: 600,
                      padding: "9px 16px", borderRadius: "9px",
                      background: "transparent", color: "var(--text-2)",
                      border: "1px solid var(--border)", cursor: "pointer",
                      fontFamily: "'Inter','Open Sans',sans-serif",
                    }}>
                      Start fresh
                    </button>
                  </div>
                </div>
              )}

              {/* Framing banner */}
              <div style={{ marginBottom: "28px", padding: "16px 22px", borderRadius: "12px", background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.14)" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", marginBottom: "4px" }}>
                  You are the Business Analyst responsible for this decision.
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  Your output will be evaluated like a real deliverable.
                </div>
              </div>

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
                    <button onClick={() => {
                      try {
                        if (localStorage.getItem(preStartKey) === "1") { goToTab("interview"); return; }
                      } catch {}
                      setSkipNextTime(false);
                      setShowPreStart(true);
                    }} className="btn-teal"
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
                width: "100%", padding: "0 clamp(16px, 4vw, 48px)",
              }}
            >
              {/* Retry focus banner */}
              {retryTopFix && !retryBannerDismissed && (
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                  padding: "10px 14px", marginBottom: 2, marginTop: 8, borderRadius: 10, flexShrink: 0,
                  background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: "monospace", whiteSpace: "nowrap", paddingTop: 1 }}>
                      Focus:
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{retryTopFix}</span>
                    {evalResult && (
                      <button
                        onClick={() => {
                          resetInterview();
                          setSubmission("");
                          setEvalResult(null);
                          setAttemptId(null);
                          liveRef.current.attemptId = null;
                        }}
                        style={{
                          flexShrink: 0, whiteSpace: "nowrap", fontSize: 12, fontWeight: 600,
                          color: "#fb923c", background: "rgba(251,146,60,0.1)",
                          border: "1px solid rgba(251,146,60,0.22)", borderRadius: 7,
                          padding: "3px 10px", cursor: "pointer", marginLeft: 4,
                        }}
                      >
                        Start fresh
                      </button>
                    )}
                  </div>
                  <button onClick={() => setRetryBannerDismissed(true)} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, lineHeight: 1 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Stakeholder tabs */}
              <div style={{ display: "flex", gap: "8px", padding: "10px 0 8px", flexShrink: 0, alignItems: "center" }}>
                {challenge.stakeholders.map(s => {
                  const isActive = s.id === activeStakeholderId;
                  const msgCount = (conversations[s.id] || []).filter(m => m.role === "user").length;
                  return (
                    <button key={s.id} onClick={() => setActiveStakeholderId(s.id)} style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      padding: "6px 12px", borderRadius: "8px",
                      border: `1px solid ${isActive ? "rgba(31,191,159,0.4)" : "var(--border)"}`,
                      background: isActive ? "rgba(31,191,159,0.08)" : "var(--card)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}>
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, flexShrink: 0,
                        background: isActive ? "var(--teal)" : "rgba(255,255,255,0.08)",
                        color: isActive ? "#05120f" : "var(--text-2)",
                        fontFamily: "'Inter','Open Sans',sans-serif",
                      }}>
                        {s.initials ?? s.avatar ?? s.name.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "var(--teal)" : "var(--text-2)", fontFamily: "'Inter','Open Sans',sans-serif", whiteSpace: "nowrap" }}>
                        {s.name}{msgCount > 0 ? ` (${msgCount})` : ""}
                      </span>
                    </button>
                  );
                })}
                <div style={{ marginLeft: "auto" }}>
                  <button onClick={resetInterview} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "5px 10px", borderRadius: "7px",
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--text-4)", fontSize: "12px", cursor: "pointer",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-4)")}
                  >
                    <RotateCcw className="w-3 h-3" />Reset
                  </button>
                </div>
              </div>

              {/* Chat */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "28px", padding: "20px 16px", border: "1px solid var(--border)", borderRadius: "14px", background: "var(--card)" }}>
                {currentMessages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  // Find the right stakeholder for this message
                  const msgStakeholder = msg.stakeholderId
                    ? challenge.stakeholders.find(s => s.id === msg.stakeholderId)
                    : activeStakeholder;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: "10px", alignItems: "flex-end" }}>
                      {!isUser && (
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "10px", fontWeight: 700, flexShrink: 0,
                          background: "#0f3028", color: "var(--teal)",
                          border: "1px solid rgba(31,191,159,0.4)",
                          fontFamily: "'Inter','Open Sans',sans-serif",
                        }}>
                          {msgStakeholder?.initials ?? msgStakeholder?.name?.slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div style={{
                        maxWidth: isUser ? "65%" : "75%",
                        padding: "14px 18px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isUser ? "#0a2919" : "#1a1d2e",
                        border: `1px solid ${isUser ? "rgba(31,191,159,0.5)" : "rgba(255,255,255,0.1)"}`,
                        fontSize: "15px", lineHeight: 1.65,
                        color: isUser ? "#b8f0d8" : "#dde1f0",
                        fontFamily: "'Open Sans', sans-serif",
                      }}>
                        {msg.content}
                      </div>
                      {isUser && (
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, background: "#0a2919",
                          border: "1px solid rgba(31,191,159,0.3)",
                        }}>
                          <User className="w-3 h-3" style={{ color: "var(--teal)" }} />
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
                      {activeStakeholder?.initials ?? activeStakeholder?.avatar ?? activeStakeholder?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{
                      padding: "14px 18px", borderRadius: "16px 16px 16px 4px",
                      background: "#1c1f2e", border: "1px solid rgba(255,255,255,0.12)",
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

              {/* Input + Hints */}
              <div style={{ flexShrink: 0, padding: "10px 0 16px" }}>
                <AnimatePresence>
                  {showHints && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      style={{
                        overflow: "hidden", background: "rgba(251,146,60,0.05)",
                        border: "1px solid rgba(251,146,60,0.2)",
                        borderRadius: "10px", padding: "12px 14px", marginBottom: "8px",
                      }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                        Strong BAs ask about:
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {hints.map((hint, i) => (
                          <li key={i} onClick={() => { setInputValue(hint); setShowHints(false); }} style={{
                            fontSize: "13px", color: "var(--text-2)",
                            paddingBottom: i < hints.length - 1 ? "8px" : 0,
                            marginBottom: i < hints.length - 1 ? "8px" : 0,
                            borderBottom: i < hints.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                            cursor: "pointer", lineHeight: 1.5,
                          }}>
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                  Your question
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask your next question..."
                    rows={2}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: "12px",
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: "var(--text-1)", fontSize: "15px",
                      fontFamily: "'Open Sans', sans-serif",
                      resize: "none", outline: "none", lineHeight: 1.6,
                      transition: "border-color 0.15s", maxHeight: "120px", overflowY: "auto",
                    }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,191,159,0.3)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                    <button onClick={sendMessage} disabled={isLoading || !inputValue.trim()} style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: inputValue.trim() ? "var(--teal)" : "rgba(255,255,255,0.06)",
                      border: "none", cursor: inputValue.trim() ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}>
                      <Send className="w-4 h-4" style={{ color: inputValue.trim() ? "#05120f" : "var(--text-4)" }} />
                    </button>
                    <button onClick={() => setShowHints(h => !h)} title="See hints" style={{
                      width: "44px", height: "32px", borderRadius: "10px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: showHints ? "rgba(251,146,60,0.12)" : "none",
                      border: `1px solid ${showHints ? "rgba(251,146,60,0.3)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <Lightbulb className="w-3.5 h-3.5" style={{ color: showHints ? "#fb923c" : "var(--text-4)" }} />
                    </button>
                  </div>
                </div>
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
                padding: "10px 0 16px", borderTop: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  {/* Per-stakeholder progress dots */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {challenge.stakeholders.map(s => {
                      const userMsgCount = (conversations[s.id] || []).filter(m => m.role === "user").length;
                      const done = userMsgCount > 0;
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: done ? "var(--teal)" : "rgba(255,255,255,0.15)",
                            boxShadow: done ? "0 0 4px rgba(31,191,159,0.5)" : "none",
                            transition: "all 0.2s",
                          }} />
                          <span style={{ fontSize: "12px", color: done ? "var(--text-2)" : "var(--text-4)", fontWeight: done ? 500 : 400 }}>
                            {s.name.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {questionCount > 0 && (
                    <button onClick={() => setShowSummary(s => !s)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      fontSize: "12px", fontWeight: 600,
                      color: showSummary ? "var(--teal)" : "var(--text-4)",
                      textDecoration: "underline", textDecorationColor: "transparent",
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--teal)"; (e.currentTarget as HTMLButtonElement).style.textDecorationColor = "var(--teal)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = showSummary ? "var(--teal)" : "var(--text-4)"; (e.currentTarget as HTMLButtonElement).style.textDecorationColor = showSummary ? "var(--teal)" : "transparent"; }}
                    >
                      {showSummary ? "Hide summary" : "View summary"}
                    </button>
                  )}
                </div>
                {(() => {
                  const interviewedCount = Object.keys(conversations).filter(sid => (conversations[sid] || []).length > 0).length;
                  const allInterviewed = interviewedCount >= challenge.stakeholders.length;
                  return (
                    <button
                      onClick={() => goToTab("submit")}
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
              {/* Retry focus banner */}
              {retryTopFix && !retryBannerDismissed && (
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                  padding: "10px 14px", marginBottom: 24, borderRadius: 10,
                  background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: "monospace", whiteSpace: "nowrap", paddingTop: 1 }}>
                      Focus:
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{retryTopFix}</span>
                  </div>
                  <button onClick={() => setRetryBannerDismissed(true)} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, lineHeight: 1 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

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
                    <div style={{ marginBottom: "14px", padding: "12px 16px", borderRadius: "10px", background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.12)" }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-1)", marginBottom: "2px" }}>This is your final recommendation. Be precise.</div>
                      <div style={{ fontSize: "12.5px", color: "var(--text-3)" }}>Reference your stakeholder conversations. Name specific insights and decisions.</div>
                    </div>
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
                      {submission.length > 0 && submission.length < 200 ? (
                        <span style={{ fontSize: "12px", color: "#fb923c" }}>Write more — aim for 300+ characters</span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-4)", fontStyle: "italic" }}>Weak structure = weak evaluation</span>
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

                  {/* ── 1. Score hero ─────────────────────────────────── */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "32px",
                    padding: "28px 32px", borderRadius: "18px",
                    background: "var(--card)", border: `1px solid ${scoreColor(evalResult.totalScore)}30`,
                    marginBottom: "20px", position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 80% 50%, ${scoreColor(evalResult.totalScore)}08 0%, transparent 60%)` }} />
                    <div style={{ position: "relative", textAlign: "center", minWidth: 80 }}>
                      <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "52px", color: scoreColor(evalResult.totalScore), letterSpacing: "-0.04em", lineHeight: 1 }}>
                        {evalResult.totalScore}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>/ 100</div>
                      {previousScore !== null && (
                        <div style={{ marginTop: 8, fontSize: 12, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                          <span style={{ color: "var(--text-4)" }}>{previousScore}</span>
                          <span style={{ color: "var(--text-4)" }}>→</span>
                          <span style={{ color: scoreColor(evalResult.totalScore), fontWeight: 700 }}>{evalResult.totalScore}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "18px", color: "var(--text-1)", marginBottom: "6px", letterSpacing: "-0.02em" }}>
                        {evalResult.totalScore >= 85 ? "Excellent work." : evalResult.totalScore >= 70 ? "Solid effort." : evalResult.totalScore >= 50 ? "Developing." : "Needs significant work."}
                      </div>
                      <div style={{ height: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${evalResult.totalScore}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          style={{ height: "100%", borderRadius: "99px", background: scoreColor(evalResult.totalScore) }} />
                      </div>
                    </div>
                  </div>

                  {/* ── 2. Top Fix ────────────────────────────────────── */}
                  {evalResult.topFix && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      style={{
                        padding: "24px 28px", borderRadius: "18px", marginBottom: "14px",
                        background: "rgba(251,146,60,0.06)",
                        border: "1px solid rgba(251,146,60,0.28)",
                        position: "relative", overflow: "hidden",
                      }}>
                      <div style={{ position: "absolute", top: 0, left: 0, width: 4, bottom: 0, background: "#fb923c", borderRadius: "18px 0 0 18px" }} />
                      <div style={{ paddingLeft: 4 }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#fb923c", fontFamily: "monospace", marginBottom: 10 }}>
                          Top Fix
                        </div>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.5, margin: 0, fontFamily: "'Inter','Open Sans',sans-serif" }}>
                          {evalResult.topFix}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── 3. Do This Next ───────────────────────────────── */}
                  {evalResult.doThisNext && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      style={{
                        padding: "20px 24px", borderRadius: "14px", marginBottom: "14px",
                        background: "rgba(31,191,159,0.06)",
                        border: "1px solid rgba(31,191,159,0.22)",
                      }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#1fbf9f", fontFamily: "monospace", marginBottom: 8 }}>
                        Do This Next
                      </div>
                      <p style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1.55, margin: 0 }}>
                        {evalResult.doThisNext}
                      </p>
                    </motion.div>
                  )}

                  {/* ── 4. Better Move ────────────────────────────────── */}
                  {evalResult.betterMove && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      style={{
                        padding: "20px 24px", borderRadius: "14px", marginBottom: "24px",
                        background: "rgba(167,139,250,0.05)",
                        border: "1px solid rgba(167,139,250,0.2)",
                      }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#a78bfa", fontFamily: "monospace", marginBottom: 10 }}>
                        Better Move
                      </div>
                      <p style={{ fontSize: "13.5px", color: "var(--text-2)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                        {evalResult.betterMove}
                      </p>
                    </motion.div>
                  )}

                  {/* ── 5. Primary CTA ────────────────────────────────── */}
                  <div style={{ marginBottom: "36px" }}>
                    <button onClick={() => {
                      if (evalResult.topFix) setRetryTopFix(evalResult.topFix);
                      setPreviousScore(evalResult.totalScore);
                      setRetryBannerDismissed(false);
                      goToTab("interview");
                    }} className="btn-teal"
                      style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "15px" }}>
                      <RotateCcw className="w-4 h-4" />
                      Try again with this improvement
                    </button>
                    {isElicitation && (
                      <button onClick={() => goToTab("validate")} className="btn-outline"
                        style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", marginTop: "10px" }}>
                        Proceed to Phase B — Validate <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* ── Divider ───────────────────────────────────────── */}
                  <div style={{ height: "1px", background: "var(--border)", marginBottom: "28px" }} />

                  {/* ── 6. Dimension breakdown (demoted) ─────────────── */}
                  <div style={{ marginBottom: "28px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-4)", fontFamily: "monospace", marginBottom: "14px" }}>
                      Dimension Breakdown
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {dimensionMeta.map(dim => {
                        const d = evalResult.dimensions[dim.key as keyof typeof evalResult.dimensions];
                        return (
                          <div key={dim.key} style={{ padding: "16px 18px", borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: dim.color }}>{dim.label}</span>
                              <span style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "14px", color: scoreColor(d.score, 25) }}>
                                {d.score}<span style={{ fontSize: "11px", color: "var(--text-4)", fontWeight: 400 }}>/25</span>
                              </span>
                            </div>
                            <div style={{ height: "2px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", marginBottom: "10px", overflow: "hidden" }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(d.score / 25) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                                style={{ height: "100%", borderRadius: "99px", background: scoreColor(d.score, 25) }} />
                            </div>
                            <p style={{ fontSize: "12px", color: "var(--text-3)", lineHeight: 1.55, margin: "0 0 8px" }}>{d.verdict}</p>
                            <p style={{ fontSize: "11.5px", color: dim.color, lineHeight: 1.5, margin: 0, paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", opacity: 0.85 }}>
                              {d.tip}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 7. Alex Rivera full feedback (demoted) ────────── */}
                  <div style={{ padding: "22px 26px", borderRadius: "14px", background: "var(--card)", border: "1px solid var(--border)", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", fontFamily: "'Inter','Open Sans',sans-serif", flexShrink: 0 }}>
                        AR
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>Alex Rivera</div>
                        <div style={{ fontSize: "11px", color: "var(--text-4)" }}>Senior BA Coach · TheBAPortal</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "14px", lineHeight: 1.75, color: "var(--text-3)" }}>
                      {evalResult.feedback.split("\n\n").map((para, i, arr) => (
                        <p key={i} style={{ marginBottom: i < arr.length - 1 ? "14px" : 0 }}>{para}</p>
                      ))}
                    </div>
                  </div>

                  {/* ── 8. Related jobs ───────────────────────────────── */}
                  {relatedJobs.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: "12px" }}>
                        Roles that expect this level
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {relatedJobs.map(job => (
                          <div key={job.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
                            </div>
                            <a href={`/jobs/${job.id}`} style={{ flexShrink: 0, fontSize: "12px", fontWeight: 600, color: "var(--teal)", textDecoration: "none", whiteSpace: "nowrap", padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(31,191,159,0.25)", background: "rgba(31,191,159,0.05)" }}>
                              See how to win this role
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 9. Secondary action ───────────────────────────── */}
                  <button onClick={() => router.push("/scenarios")} className="btn-outline"
                    style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}>
                    Browse other simulations <ArrowRight className="w-4 h-4" />
                  </button>

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

      {/* ── Reset confirmation modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            key="reset-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowResetModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.96, y: 6  }}
              transition={{ duration: 0.18 }}
              style={{
                background: "#0d0d12", border: "1px solid var(--border)",
                borderRadius: 18, padding: "32px 32px 28px",
                maxWidth: 420, width: "100%",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em", margin: "0 0 10px", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                Start a new attempt?
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.65, margin: "0 0 20px" }}>
                We&apos;ll clear your current work so you can apply what you&apos;ve learned.
              </p>
              {retryTopFix && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 20,
                  background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 6 }}>
                    Focus for this attempt
                  </div>
                  <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
                    {retryTopFix}
                  </p>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={confirmReset}
                  style={{
                    flex: 1, padding: "12px 20px", borderRadius: 11, fontSize: 14, fontWeight: 700,
                    background: "#1fbf9f", color: "#041a13", border: "none", cursor: "pointer",
                    fontFamily: "'Inter','Open Sans',sans-serif",
                  }}
                >
                  Start fresh
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  style={{
                    flex: 1, padding: "12px 20px", borderRadius: 11, fontSize: 14, fontWeight: 600,
                    background: "transparent", color: "var(--text-2)",
                    border: "1px solid var(--border)", cursor: "pointer",
                    fontFamily: "'Inter','Open Sans',sans-serif",
                  }}
                >
                  Keep my work
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pre-start modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreStart && (() => {
          const cues = preStartCues[challenge.type] ?? preStartCues["discovery"];
          const context = trimSituation(challenge.brief.situation);
          return (
            <motion.div
              key="prestart-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "fixed", inset: 0, zIndex: 500,
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "24px",
              }}
              onClick={e => { if (e.target === e.currentTarget) setShowPreStart(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{    opacity: 0, scale: 0.96, y: 8  }}
                transition={{ duration: 0.2 }}
                style={{
                  background: "#0d0d12",
                  border: "1px solid rgba(31,191,159,0.22)",
                  borderRadius: 20,
                  padding: "36px 36px 32px",
                  maxWidth: 480, width: "100%",
                  position: "relative",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
                }}
              >
                {/* Close */}
                <button
                  onClick={() => setShowPreStart(false)}
                  style={{
                    position: "absolute", top: 16, right: 16,
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", padding: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>

                {/* Eyebrow */}
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase" as const, color: "#1fbf9f",
                  fontFamily: "monospace", marginBottom: 10,
                }}>
                  {challenge.type.replace(/-/g, " ")}
                </div>

                {/* Dynamic title */}
                <h2 style={{
                  fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em",
                  color: "var(--text-1)", margin: "0 0 6px", lineHeight: 1.15,
                  fontFamily: "'Inter','Open Sans',sans-serif",
                }}>
                  {isFirstAttempt ? "Your first simulation" : "Ready to try again?"}
                </h2>

                {/* Scenario name */}
                <div style={{
                  fontSize: 13, fontWeight: 600, color: "var(--text-3)",
                  marginBottom: 20,
                }}>
                  {challenge.title}
                </div>

                {/* Context */}
                <p style={{
                  fontSize: 14, lineHeight: 1.7, color: "var(--text-2)",
                  margin: "0 0 24px",
                  paddingBottom: 24,
                  borderBottom: "1px solid var(--border)",
                }}>
                  {context}
                </p>

                {/* Coaching cues */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase" as const, color: "var(--text-3)",
                    fontFamily: "monospace", marginBottom: 12,
                  }}>
                    What good looks like
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {cues.map((cue, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{
                          flexShrink: 0, marginTop: 2,
                          width: 18, height: 18, borderRadius: "50%",
                          background: "rgba(31,191,159,0.1)", border: "1px solid rgba(31,191,159,0.22)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#1fbf9f",
                          fontFamily: "'Inter','Open Sans',sans-serif",
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Time hint */}
                <div style={{
                  fontSize: 12, color: "var(--text-3)", marginBottom: 24,
                  display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  This will take about 3–5 minutes
                </div>

                {/* CTAs */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      if (skipNextTime) { try { localStorage.setItem(preStartKey, "1"); } catch {} }
                      setShowPreStart(false);
                      goToTab("interview");
                    }}
                    style={{
                      flex: 1, padding: "13px 20px", borderRadius: 12,
                      fontSize: 14, fontWeight: 700,
                      background: "#1fbf9f", color: "#041a13",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontFamily: "'Inter','Open Sans',sans-serif",
                      boxShadow: "0 0 20px rgba(31,191,159,0.2)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#25d4b0"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1fbf9f"; }}
                  >
                    Start simulation
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setShowPreStart(false)}
                    style={{
                      padding: "13px 18px", borderRadius: 12,
                      fontSize: 14, fontWeight: 600,
                      background: "transparent", color: "var(--text-2)",
                      border: "1px solid var(--border)", cursor: "pointer",
                      fontFamily: "'Inter','Open Sans',sans-serif",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Don't show again */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginTop: 16, cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={skipNextTime}
                    onChange={e => setSkipNextTime(e.target.checked)}
                    style={{ accentColor: "#1fbf9f", width: 14, height: 14, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                    Don&apos;t show this again for scenario
                  </span>
                </label>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}