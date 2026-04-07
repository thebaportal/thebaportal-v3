"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "alex" | "user";
  content: string;
  label?: string; // e.g. "Q1 · Behavioral"
}

interface EvalDimension {
  score: number;
  verdict: string;
  tip: string;
}

interface EvalResult {
  totalScore: number;
  dimensions: {
    answerStructure:   EvalDimension;
    specificity:       EvalDimension;
    baThinking:        EvalDimension;
    followUpHandling:  EvalDimension;
  };
  feedback:     string;
  topFix:       string;
  doThisNext:   string;
  betterAnswer: string;
}

type Phase = "setup" | "thinking" | "active" | "evaluating" | "feedback";

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_LABELS = [
  "Behavioral",
  "BA Technical",
  "Deep Dive",
  "Situational",
  "Role Fit",
  "Pressure",
];

const TOTAL_ALEX_MESSAGES = 12; // 6 questions × 1 follow-up each

function getLabel(alexIdx: number): string {
  const qNum   = Math.floor(alexIdx / 2) + 1;
  const isFU   = alexIdx % 2 === 1;
  const qLabel = QUESTION_LABELS[qNum - 1] ?? "Question";
  return `Q${qNum} · ${isFU ? "Follow-up" : qLabel}`;
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return "#1fbf9f";
  if (s >= 60) return "#eab308";
  return "#ef4444";
}

function dimPct(score: number, max = 25): number {
  return Math.round((score / max) * 100);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: { subscription_tier: string; full_name: string | null } | null;
  user: { email: string };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionClient({ profile, user }: Props) {
  const router = useRouter();

  const [phase,      setPhase]      = useState<Phase>("setup");
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [alexIdx,    setAlexIdx]    = useState(0);   // next Alex message index (0–11)
  const [input,      setInput]      = useState("");
  const [jd,         setJd]         = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new message ───────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  // ── Focus input when active ────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "active") inputRef.current?.focus();
  }, [phase]);

  // ── Fetch Alex's next message ──────────────────────────────────────────────

  const fetchAlexMessage = useCallback(async (idx: number, currentMessages: Message[]) => {
    setPhase("thinking");
    setError(null);
    try {
      const res = await fetch("/api/interview/message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: currentMessages, alexIdx: idx, jd }),
      });
      if (!res.ok) throw new Error("Failed to fetch question");
      const data = await res.json();
      const alexMsg: Message = { role: "alex", content: data.message, label: getLabel(idx) };
      setMessages(prev => [...prev, alexMsg]);
      setAlexIdx(idx + 1);
      setPhase("active");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("active");
    }
  }, [jd]);

  // ── Evaluate the full interview ────────────────────────────────────────────

  const evaluateInterview = useCallback(async (finalMessages: Message[]) => {
    setPhase("evaluating");
    setError(null);
    try {
      const res = await fetch("/api/interview/evaluate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: finalMessages, jd }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data: EvalResult = await res.json();
      setEvalResult(data);
      setPhase("feedback");
    } catch {
      setError("Evaluation failed. Please try again.");
      setPhase("active");
    }
  }, [jd]);

  // ── Start interview ────────────────────────────────────────────────────────

  function startInterview() {
    fetchAlexMessage(0, []);
  }

  // ── Send user message ──────────────────────────────────────────────────────

  function sendMessage() {
    const text = input.trim();
    if (!text || phase !== "active") return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // alexIdx is the NEXT message index (already incremented after last Alex message)
    // After this user message: if alexIdx === TOTAL_ALEX_MESSAGES → done
    if (alexIdx >= TOTAL_ALEX_MESSAGES) {
      evaluateInterview(newMessages);
    } else {
      fetchAlexMessage(alexIdx, newMessages);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  // alexIdx after receiving: 1 = Q1 done, 2 = FU1 done, ...
  // Progress: how many Alex messages have been sent (0–12)
  const sentCount   = messages.filter(m => m.role === "alex").length;
  const progressPct = Math.round((sentCount / TOTAL_ALEX_MESSAGES) * 100);
  const currentQ    = Math.min(Math.floor((sentCount - 1) / 2) + 1, 6);

  // ── Feedback rendering ─────────────────────────────────────────────────────

  if (phase === "feedback" && evalResult) {
    const dims = [
      { key: "answerStructure",  label: "Answer Structure",      data: evalResult.dimensions.answerStructure },
      { key: "specificity",      label: "Specificity",           data: evalResult.dimensions.specificity },
      { key: "baThinking",       label: "BA Thinking",           data: evalResult.dimensions.baThinking },
      { key: "followUpHandling", label: "Follow-up Handling",    data: evalResult.dimensions.followUpHandling },
    ];

    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
        <AppSidebar activeHref="/interview" profile={profile} user={user} />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 28px 80px" }}>

            {/* Score hero */}
            <div style={{
              textAlign: "center", marginBottom: 48,
              padding: "40px 32px",
              borderRadius: 20,
              background: "var(--card)",
              border: `1px solid ${scoreColor(evalResult.totalScore)}30`,
              boxShadow: `0 0 40px ${scoreColor(evalResult.totalScore)}08`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 16 }}>
                Interview Complete
              </div>
              <div style={{ fontSize: "clamp(64px, 8vw, 88px)", fontWeight: 900, color: scoreColor(evalResult.totalScore), lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 8 }}>
                {evalResult.totalScore}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "monospace" }}>
                out of 100
              </div>
            </div>

            {/* Top Fix */}
            <div style={{
              padding: "20px 24px", borderRadius: 14, marginBottom: 16,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#ef4444", fontFamily: "monospace", marginBottom: 8 }}>
                Top Fix
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>
                {evalResult.topFix}
              </p>
            </div>

            {/* Do This Next */}
            <div style={{
              padding: "20px 24px", borderRadius: 14, marginBottom: 32,
              background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.2)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--teal)", fontFamily: "monospace", marginBottom: 8 }}>
                Do This Next
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0, lineHeight: 1.55 }}>
                {evalResult.doThisNext}
              </p>
            </div>

            {/* Better Answer */}
            <div style={{
              padding: "22px 24px", borderRadius: 14, marginBottom: 40,
              background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#a78bfa", fontFamily: "monospace", marginBottom: 10 }}>
                Better Answer
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-2)", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {evalResult.betterAnswer}
              </p>
            </div>

            {/* Retry CTA */}
            <div style={{ display: "flex", gap: 12, marginBottom: 48 }}>
              <button
                onClick={() => { setPhase("setup"); setMessages([]); setAlexIdx(0); setEvalResult(null); setInput(""); }}
                style={{
                  padding: "12px 24px", borderRadius: 11, fontSize: 13, fontWeight: 700,
                  background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer",
                }}
              >
                Interview again
              </button>
              <button
                onClick={() => router.push("/interview")}
                style={{
                  padding: "12px 20px", borderRadius: 11, fontSize: 13, fontWeight: 600,
                  background: "transparent", color: "var(--text-2)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                Back to Interview Lab
              </button>
            </div>

            {/* Dimension cards */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 20 }}>
                Dimension Breakdown
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {dims.map(({ label, data }) => (
                  <div key={label} style={{
                    padding: "20px 22px", borderRadius: 14,
                    background: "var(--card)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(dimPct(data.score)) }}>
                        {data.score}<span style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 500 }}>/25</span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginBottom: 12, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${dimPct(data.score)}%`, background: scoreColor(dimPct(data.score)), borderRadius: 2, transition: "width 0.6s ease" }} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "0 0 8px", lineHeight: 1.55 }}>{data.verdict}</p>
                    <p style={{ fontSize: 12, color: "var(--teal)", margin: 0, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.6 }}>Tip: </span>{data.tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alex feedback paragraphs */}
            <div style={{
              marginTop: 32, padding: "26px 28px", borderRadius: 16,
              background: "var(--card)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "var(--teal)", flexShrink: 0,
                }}>
                  AR
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Alex Rivera</div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>Senior Hiring Manager</div>
                </div>
              </div>
              {evalResult.feedback.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7, margin: i > 0 ? "12px 0 0" : 0 }}>
                  {para}
                </p>
              ))}
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ── Main interview layout ──────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/interview" profile={profile} user={user} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <header style={{
          flexShrink: 0,
          padding: "0 24px",
          height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(9,9,11,0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Interview Lab</span>
            {phase !== "setup" && (
              <>
                <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
                <span style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "monospace" }}>
                  {phase === "evaluating"
                    ? "Evaluating..."
                    : sentCount > 0
                    ? `Q${currentQ} of 6`
                    : "Starting..."}
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {phase !== "setup" && phase !== "evaluating" && (
            <div style={{ width: 120, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: "var(--teal)",
                width: `${progressPct}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
          )}
        </header>

        {/* ── Setup phase ─────────────────────────────────────────────────── */}
        {phase === "setup" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
            <div style={{ width: "100%", maxWidth: 560 }}>

              {/* Alex intro */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14, marginBottom: 36,
                padding: "20px 22px", borderRadius: 16,
                background: "var(--card)", border: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "var(--teal)",
                }}>
                  AR
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
                    Alex Rivera
                  </div>
                  <div style={{ fontSize: 12, color: "var(--teal)", fontFamily: "monospace", fontWeight: 600 }}>
                    Senior Hiring Manager · 6 questions · 1 follow-up each
                  </div>
                </div>
              </div>

              {/* JD paste */}
              <div style={{ marginBottom: 28 }}>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 700,
                  color: "var(--text-2)", marginBottom: 8,
                }}>
                  Job description{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional — paste to tailor the questions)</span>
                </label>
                <textarea
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={7}
                  style={{
                    width: "100%", padding: "14px 16px",
                    borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                    background: "rgba(255,255,255,0.04)", color: "var(--text-1)",
                    border: "1px solid var(--border)", outline: "none", resize: "vertical",
                    fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,0.4)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <button
                onClick={startInterview}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: "var(--teal)", color: "#041a13",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 0 24px rgba(31,191,159,0.2)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#25d4b0"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--teal)"; }}
              >
                Start Interview
              </button>
            </div>
          </div>
        )}

        {/* ── Interview / Evaluating phase ───────────────────────────────── */}
        {(phase === "thinking" || phase === "active" || phase === "evaluating") && (
          <>
            {/* Chat area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
              <div style={{ maxWidth: 680, margin: "0 auto" }}>

                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex",
                    flexDirection: msg.role === "alex" ? "row" : "row-reverse",
                    gap: 12, marginBottom: 20,
                  }}>
                    {/* Avatar */}
                    {msg.role === "alex" && (
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: "var(--teal)",
                        marginTop: 20,
                      }}>
                        AR
                      </div>
                    )}

                    <div style={{ maxWidth: "78%", minWidth: 0 }}>
                      {/* Label row */}
                      {msg.role === "alex" && msg.label && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: "var(--teal)",
                          fontFamily: "monospace", letterSpacing: "0.06em",
                          textTransform: "uppercase" as const, marginBottom: 6,
                        }}>
                          {msg.label}
                        </div>
                      )}

                      {/* Bubble */}
                      <div style={{
                        padding: "14px 18px", borderRadius: msg.role === "alex" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                        background: msg.role === "alex"
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(31,191,159,0.09)",
                        border: msg.role === "alex"
                          ? "1px solid var(--border)"
                          : "1px solid rgba(31,191,159,0.2)",
                        fontSize: 14, lineHeight: 1.65,
                        color: "var(--text-1)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Alex thinking indicator */}
                {phase === "thinking" && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: "var(--teal)", flexShrink: 0,
                      marginTop: 20,
                    }}>
                      AR
                    </div>
                    <div style={{ maxWidth: "78%" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--teal)", fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                        Alex Rivera
                      </div>
                      <div style={{
                        padding: "14px 18px", borderRadius: "4px 16px 16px 16px",
                        background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                        display: "flex", gap: 5, alignItems: "center",
                      }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: "var(--text-4)",
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Evaluating state */}
                {phase === "evaluating" && (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    color: "var(--text-3)", fontSize: 14,
                  }}>
                    <div style={{ marginBottom: 8 }}>Alex is reviewing your answers...</div>
                    <div style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "monospace" }}>This takes about 15 seconds</div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                    fontSize: 13, color: "#f87171",
                  }}>
                    {error}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input area */}
            {phase !== "evaluating" && (
              <div style={{
                flexShrink: 0,
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                background: "rgba(9,9,11,0.8)", backdropFilter: "blur(16px)",
              }}>
                <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={phase === "thinking" ? "Alex is thinking..." : "Your answer..."}
                    disabled={phase === "thinking"}
                    rows={1}
                    style={{
                      flex: 1, padding: "12px 16px",
                      borderRadius: 12, fontSize: 14, lineHeight: 1.55,
                      background: phase === "thinking" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)", outline: "none",
                      resize: "none", fontFamily: "'Inter', sans-serif",
                      minHeight: 46, maxHeight: 180, overflowY: "auto",
                      transition: "border-color 0.15s, background 0.15s",
                      opacity: phase === "thinking" ? 0.5 : 1,
                    }}
                    onFocus={e => { if (phase !== "thinking") e.currentTarget.style.borderColor = "rgba(31,191,159,0.4)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    onInput={e => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || phase !== "active"}
                    style={{
                      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                      background: input.trim() && phase === "active" ? "var(--teal)" : "rgba(255,255,255,0.06)",
                      border: "none", cursor: input.trim() && phase === "active" ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && phase === "active" ? "#041a13" : "var(--text-4)"} strokeWidth="2.5" strokeLinecap="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
                <div style={{ maxWidth: 680, margin: "8px auto 0", fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>
                  Enter to send · Shift+Enter for new line
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
