"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, ChevronRight, FileSearch, Lightbulb, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface ValidationFinding {
  id: string;
  errorLocation: string;
  whatIsWrong: string;
  correction: string;
  whyItMatters: string;
}

interface ValidationClientProps {
  flawedDocument: string;
  errorCount: number;
  challengeId: string;
  onSubmit: (findings: ValidationFinding[]) => void;
  onTryAgain?: () => void;
  onNextChallenge?: () => void;
  onResetFindings?: () => void;
  isEvaluating: boolean;
  result?: ValidationResult;
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

function scoreColor(score: number) {
  if (score >= 80) return "#1fbf9f";
  if (score >= 60) return "#eab308";
  return "#ef4444";
}

// ─── Component ────────────────────────────────────────────────
export default function ValidationClient({
  flawedDocument,
  errorCount,
  onSubmit,
  onTryAgain,
  onNextChallenge,
  isEvaluating,
  result,
}: ValidationClientProps) {
  const [findings, setFindings] = useState<ValidationFinding[]>(
    Array.from({ length: errorCount }, (_, i) => ({
      id: `finding-${i + 1}`,
      errorLocation: "",
      whatIsWrong: "",
      correction: "",
      whyItMatters: "",
    }))
  );
  const [showHint, setShowHint] = useState(false);
  const [activeError, setActiveError] = useState(0);

  const updateFinding = (index: number, field: keyof ValidationFinding, value: string) => {
    setFindings((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  const completedCount = findings.filter(
    (f) => f.errorLocation.trim() && f.whatIsWrong.trim() && f.correction.trim()
  ).length;

  const isReadyToSubmit = completedCount >= 1;

  // ── RESULTS VIEW — two column ──
  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}
      >
        {/* LEFT — score + dimensions + error breakdown */}
        <div style={{ flex: "0 0 52%", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Score hero */}
          <div style={{
            display: "flex", alignItems: "center", gap: "24px",
            padding: "24px 28px", borderRadius: "16px",
            background: "var(--card)",
            border: `1px solid ${scoreColor(result.score)}30`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse at 80% 50%, ${scoreColor(result.score)}08 0%, transparent 60%)`,
            }} />
            <div style={{ position: "relative", textAlign: "center", minWidth: "80px" }}>
              <div style={{
                fontFamily: "'Inter','Open Sans',sans-serif",
                fontWeight: 800, fontSize: "52px",
                color: scoreColor(result.score),
                letterSpacing: "-0.04em", lineHeight: 1,
              }}>
                {result.score}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>out of 100</div>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <div style={{
                fontFamily: "'Inter','Open Sans',sans-serif",
                fontWeight: 700, fontSize: "16px",
                color: "var(--text-1)", marginBottom: "5px",
              }}>
                {result.errorsFound} of {result.totalErrors} errors identified
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
                {result.score >= 80
                  ? "Strong validation work."
                  : result.score >= 60
                  ? "Some errors slipped through."
                  : "Several errors were missed."}
              </p>
              <div style={{
                height: "4px", borderRadius: "99px",
                background: "rgba(255,255,255,0.07)",
                marginTop: "14px", overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.score}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  style={{ height: "100%", borderRadius: "99px", background: scoreColor(result.score) }}
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {result.dimensions?.map((d) => (
              <div key={d.name} style={{
                padding: "14px 18px", borderRadius: "12px",
                background: "var(--card)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: "16px",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px",
                  }}>
                    {d.name}
                  </div>
                  <div style={{
                    height: "3px", borderRadius: "99px",
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.score / d.max) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      style={{ height: "100%", borderRadius: "99px", background: scoreColor((d.score / d.max) * 100) }}
                    />
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "7px 0 0", lineHeight: 1.5 }}>{d.comment}</p>
                </div>
                <div style={{
                  fontFamily: "'Inter','Open Sans',sans-serif",
                  fontWeight: 800, fontSize: "20px",
                  color: scoreColor((d.score / d.max) * 100),
                  flexShrink: 0, minWidth: "48px", textAlign: "right",
                }}>
                  {d.score}<span style={{ fontSize: "11px", color: "var(--text-4)", fontWeight: 400 }}>/{d.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Error breakdown */}
          <div>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px",
              fontFamily: "'Inter','Open Sans',sans-serif",
            }}>
              Error Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {result.plantedErrors?.map((e) => (
                <div key={e.id} style={{
                  padding: "12px 16px", borderRadius: "10px",
                  background: e.found ? "rgba(31,191,159,0.05)" : "rgba(239,68,68,0.05)",
                  border: `1px solid ${e.found ? "rgba(31,191,159,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: e.found ? 0 : "6px" }}>
                    {e.found
                      ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--teal)" }} />
                      : <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                    }
                    <span style={{
                      fontSize: "12px", fontWeight: 700,
                      color: e.found ? "var(--teal)" : "#ef4444",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {e.location} — {e.found ? "✓ Found" : "✗ Missed"}
                    </span>
                  </div>
                  {!e.found && (
                    <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--text-3)" }}>Correct answer:</strong> {e.correctAnswer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            {onTryAgain && (
              <button onClick={() => {
                setFindings(Array.from({ length: errorCount }, (_, i) => ({
                  id: `finding-${i + 1}`,
                  errorLocation: "",
                  whatIsWrong: "",
                  correction: "",
                  whyItMatters: "",
                })));
                setActiveError(0);
                if (onTryAgain) onTryAgain();
              }} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "11px 20px", borderRadius: "10px",
                border: "1px solid var(--border)", background: "none",
                color: "var(--text-2)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                flex: "0 0 auto",
              }}>
                <RotateCcw className="w-3.5 h-3.5" /> Try Again
              </button>
            )}
            {onNextChallenge && (
              <button onClick={onNextChallenge} className="btn-teal"
                style={{ flex: 1, justifyContent: "center", padding: "11px 20px", fontSize: "13px" }}>
                Next Challenge <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Alex Rivera sticky feedback */}
        <div style={{ flex: 1, position: "sticky", top: "24px" }}>
          <div style={{
            padding: "24px 26px", borderRadius: "16px",
            background: "var(--card)", border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 700,
                background: "rgba(167,139,250,0.12)", color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.2)",
                fontFamily: "'Inter','Open Sans',sans-serif", flexShrink: 0,
              }}>
                AR
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif" }}>
                  Alex Rivera
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-3)" }}>Senior BA Coach · TheBAPortal</div>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-2)", margin: 0, lineHeight: 1.8 }}>
              {result.feedback}
            </p>
            <div style={{
              marginTop: "18px", paddingTop: "14px",
              borderTop: "1px solid var(--border)",
              fontSize: "12px", color: "var(--text-4)", fontStyle: "italic",
            }}>
              — Alex Rivera, Senior BA Coach at TheBAPortal
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── INPUT VIEW — two columns ──
  return (
    <div style={{ display: "flex", gap: "24px", height: "100%", minHeight: 0 }}>

      {/* Left: Flawed Document */}
      <div style={{ flex: "0 0 52%", display: "flex", flexDirection: "column", gap: "0", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexShrink: 0 }}>
          <FileSearch className="w-4 h-4" style={{ color: "var(--teal)" }} />
          <span style={{
            fontSize: "12px", fontWeight: 700, color: "var(--text-2)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            fontFamily: "'Inter','Open Sans',sans-serif",
          }}>
            Captured Requirements Document — Pending Your Validation
          </span>
        </div>

        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          padding: "12px 16px", borderRadius: "10px",
          background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)",
          marginBottom: "14px", flexShrink: 0,
        }}>
          <AlertTriangle className="w-4 h-4" style={{ color: "#eab308", marginTop: "1px", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
            This document contains{" "}
            <strong style={{ color: "#eab308" }}>{errorCount} deliberate errors</strong>{" "}
            — wrong numbers, missing requirements, misrepresented constraints, or inaccurate approvals.
            Find and correct each one before sign-off.
          </p>
        </div>

        <div style={{
          flex: 1, overflowY: "auto",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "20px 24px", minHeight: 0,
        }}>
          <pre style={{
            fontSize: "12.5px", lineHeight: 1.75, color: "var(--text-2)",
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
          }}>
            {flawedDocument}
          </pre>
        </div>

        <div style={{ marginTop: "12px", flexShrink: 0 }}>
          <button
            onClick={() => setShowHint((s) => !s)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-3)", fontSize: "12px", padding: "0",
            }}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showHint ? "Hide hint" : "Show hint"}
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  marginTop: "10px", padding: "12px 16px", borderRadius: "10px",
                  background: "rgba(31,191,159,0.05)", border: "1px solid rgba(31,191,159,0.15)",
                }}>
                  <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>
                    Compare each requirement against what stakeholders actually told you in your interviews.
                    Errors include: a wrong number in performance requirements, a constraint misrepresented
                    about migration approach, a missing functional requirement for customers, an inaccuracy
                    about budget approval status, and a compliance requirement with both a wrong timeline
                    and weakened mandatory language.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Findings Form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minHeight: 0, overflowY: "auto" }}>

        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{
              fontSize: "12px", fontWeight: 700, color: "var(--text-2)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              fontFamily: "'Inter','Open Sans',sans-serif",
            }}>
              Your Validation Findings
            </span>
            <span style={{
              fontSize: "12px",
              color: completedCount === errorCount ? "var(--teal)" : "var(--text-3)",
              fontWeight: 600,
            }}>
              {completedCount} / {errorCount} documented
            </span>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {findings.map((f, i) => {
              const isDone = f.errorLocation.trim() && f.whatIsWrong.trim() && f.correction.trim();
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveError(i)}
                  style={{
                    padding: "5px 14px", borderRadius: "8px",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    border: activeError === i ? "1px solid var(--teal)" : "1px solid var(--border)",
                    background: activeError === i ? "rgba(31,191,159,0.1)" : isDone ? "rgba(31,191,159,0.04)" : "var(--surface)",
                    color: activeError === i ? "var(--teal)" : isDone ? "var(--teal)" : "var(--text-3)",
                    transition: "all 0.15s ease",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}
                >
                  {isDone && <CheckCircle className="w-3 h-3" />}
                  Error {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeError}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}
          >
            <div>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px",
                fontFamily: "'Inter','Open Sans',sans-serif",
              }}>
                Where is the error? (section / requirement ID)
              </label>
              <input
                value={findings[activeError].errorLocation}
                onChange={(e) => updateFinding(activeError, "errorLocation", e.target.value)}
                placeholder="e.g. NFR-02 (Performance)"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--text-1)", fontSize: "13px",
                  fontFamily: "'Open Sans',sans-serif", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px",
                fontFamily: "'Inter','Open Sans',sans-serif",
              }}>
                What is wrong with this requirement?
              </label>
              <textarea
                value={findings[activeError].whatIsWrong}
                onChange={(e) => updateFinding(activeError, "whatIsWrong", e.target.value)}
                placeholder="Describe the error — wrong number, missing information, misrepresented constraint, incorrect approval status, etc."
                rows={3}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--text-1)", fontSize: "13px",
                  fontFamily: "'Open Sans',sans-serif", outline: "none",
                  resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px",
                fontFamily: "'Inter','Open Sans',sans-serif",
              }}>
                Corrected requirement statement
              </label>
              <textarea
                value={findings[activeError].correction}
                onChange={(e) => updateFinding(activeError, "correction", e.target.value)}
                placeholder="Write the correct version of this requirement as it should be documented. Cite the stakeholder source."
                rows={3}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--text-1)", fontSize: "13px",
                  fontFamily: "'Open Sans',sans-serif", outline: "none",
                  resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px",
                fontFamily: "'Inter','Open Sans',sans-serif",
              }}>
                Why does this error matter? (business impact)
              </label>
              <textarea
                value={findings[activeError].whyItMatters}
                onChange={(e) => updateFinding(activeError, "whyItMatters", e.target.value)}
                placeholder="What is the project risk or business consequence if this error is left uncorrected?"
                rows={2}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--text-1)", fontSize: "13px",
                  fontFamily: "'Open Sans',sans-serif", outline: "none",
                  resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {activeError > 0 && (
                  <button onClick={() => setActiveError((i) => i - 1)} style={{
                    padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    color: "var(--text-2)", background: "var(--surface)",
                    border: "1px solid var(--border)", cursor: "pointer",
                  }}>
                    ← Previous
                  </button>
                )}
                {activeError < errorCount - 1 && (
                  <button onClick={() => setActiveError((i) => i + 1)} style={{
                    padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                    color: "var(--text-2)", background: "var(--surface)",
                    border: "1px solid var(--border)", cursor: "pointer",
                  }}>
                    Next →
                  </button>
                )}
              </div>

              {activeError === errorCount - 1 && (
                <button
                  onClick={() => onSubmit(findings)}
                  disabled={!isReadyToSubmit || isEvaluating}
                  className={isReadyToSubmit && !isEvaluating ? "btn-teal" : ""}
                  style={{
                    padding: "9px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                    cursor: isReadyToSubmit && !isEvaluating ? "pointer" : "not-allowed",
                    opacity: isReadyToSubmit && !isEvaluating ? 1 : 0.5,
                    display: "flex", alignItems: "center", gap: "6px",
                    border: isReadyToSubmit && !isEvaluating ? undefined : "1px solid var(--border)",
                    background: isReadyToSubmit && !isEvaluating ? undefined : "var(--surface)",
                    color: isReadyToSubmit && !isEvaluating ? undefined : "var(--text-3)",
                  }}
                >
                  {isEvaluating ? (
                    <>
                      <span style={{
                        width: "14px", height: "14px", borderRadius: "50%",
                        border: "2px solid currentColor", borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite", display: "inline-block",
                      }} />
                      Alex Rivera is reviewing...
                    </>
                  ) : (
                    <>Submit Validation <ChevronRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}