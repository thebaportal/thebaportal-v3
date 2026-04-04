"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Target, Mic, FileText, Briefcase, ChevronDown, ChevronUp } from "lucide-react";

const CORAL = "#e05547";

function scoreColor(s: number) {
  return s >= 75 ? "#1fbf9f" : s >= 55 ? "#f59e0b" : CORAL;
}

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} style={{
      padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
      background: copied ? "rgba(31,191,159,0.12)" : `${CORAL}12`,
      border: `1px solid ${copied ? "rgba(31,191,159,0.3)" : `${CORAL}35`}`,
      color: copied ? "var(--teal)" : CORAL,
      cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
    }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SessionDetailClient({ session }: { session: any }) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fb: Record<string, any> = session.feedback_output ?? {};
  const score = session.overall_score ?? 0;
  const color = scoreColor(score);

  const date = new Date(session.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  // Dimension data — supports both old and new schema
  const dimMap: [string, string][] = [
    ["clarity", "Clarity"],
    ["structure", "Structure"],
    ["stakeholderAwareness", "Stakeholder Awareness"],
    ["relevance", "Relevance"],
    ["confidence", "Confidence"],
    ["conciseness", "Conciseness"],
    // legacy fields from old sessions
    ["audienceAlignment", "Audience Alignment"],
    ["executivePresence", "Executive Presence"],
  ];

  const dims = dimMap
    .filter(([key]) => fb.dimensions?.[key] != null)
    .map(([key, label]) => ({
      label,
      score: fb.dimensions[key].score ?? 0,
    }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(9,9,11,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px", height: "56px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <button onClick={() => router.push("/pitchready")} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-3)", fontSize: "13px", fontWeight: 500,
        }}>
          <ArrowLeft className="w-4 h-4" /> PitchReady
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: CORAL }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.07em" }}>COACHING REPORT</span>
        </div>
      </header>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 32px 80px" }}>

        {/* Title + score */}
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "36px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: CORAL, letterSpacing: "0.08em", marginBottom: "8px" }}>
              SESSION FEEDBACK
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-1)", margin: "0 0 8px", lineHeight: 1.2 }}>
              {session.scenario_title}
            </h1>
            <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
              {date}
              {session.duration ? ` · ${fmtTime(session.duration)}` : ""}
              {session.word_count ? ` · ${session.word_count} words` : ""}
              {session.selected_focus_area ? ` · Focus: ${session.selected_focus_area}` : ""}
            </div>
          </div>
          <div style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0 }}>
            <ScoreRing score={score} size={100} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "32px", fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "2px" }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Verdict */}
        {fb.verdict && (
          <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.45, marginBottom: "28px", maxWidth: "680px" }}>
            {fb.verdict}
          </p>
        )}

        {/* Top win + top fix */}
        {(fb.topWin || fb.topFix) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {fb.topFix && (
              <div style={{ background: `${CORAL}0c`, border: `2px solid ${CORAL}50`, borderRadius: "14px", padding: "22px", boxShadow: `0 4px 20px rgba(224,85,71,0.08)` }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: CORAL, letterSpacing: "0.1em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Target className="w-3 h-3" /> THE ONE THING TO FIX
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.65, margin: 0 }}>{fb.topFix}</p>
              </div>
            )}
            {fb.topWin && (
              <div style={{ background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.15)", borderRadius: "12px", padding: "18px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(31,191,159,0.7)", letterSpacing: "0.09em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <CheckCircle className="w-3 h-3" /> WHAT WORKED
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{fb.topWin}</p>
              </div>
            )}
          </div>
        )}

        {/* Do This Next */}
        {fb.doThisNext && (
          <div style={{
            background: `${CORAL}0a`, border: `2px solid ${CORAL}40`,
            borderRadius: "14px", padding: "22px", marginBottom: "24px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "10px" }}>DO THIS NEXT</div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1.65, margin: 0 }}>{fb.doThisNext}</p>
          </div>
        )}

        {/* Reusable Answer */}
        {fb.coachRewrite && (
          <div style={{
            background: `linear-gradient(135deg, ${CORAL}08, rgba(249,115,22,0.04))`,
            border: `1px solid ${CORAL}30`,
            borderRadius: "14px", padding: "24px", marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "2px" }}>
                  HOW ALEX WOULD SAY IT
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
                  A stronger version of your response. Save it. Use it next time.
                </div>
              </div>
              <CopyButton text={fb.coachRewrite} />
            </div>
            <p style={{ fontSize: "15px", color: "var(--text-1)", lineHeight: 1.85, margin: 0, borderLeft: `3px solid ${CORAL}`, paddingLeft: "16px" }}>
              {fb.coachRewrite}
            </p>
          </div>
        )}

        {/* Dimension scores */}
        {dims.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>
              DIMENSION SCORES
            </div>
            {dims.map(({ label, score: s }) => {
              const c = scoreColor(s);
              return (
                <div key={label} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: c }}>{s}</span>
                  </div>
                  <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s}%`, background: c, borderRadius: "3px", transition: "width 1s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conditional rewrites */}
        {(fb.improvedOpening || fb.improvedClosing) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>SUGGESTED REWRITES</div>
            {fb.improvedOpening && (
              <div style={{ marginBottom: "18px", paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.07em", marginBottom: "8px" }}>STRONGER OPENING</div>
                <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.8, margin: 0 }}>{fb.improvedOpening}</p>
              </div>
            )}
            {fb.improvedClosing && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.07em", marginBottom: "8px" }}>STRONGER CLOSING</div>
                <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.8, margin: 0 }}>{fb.improvedClosing}</p>
              </div>
            )}
          </div>
        )}

        {/* Transcript — collapsed by default */}
        {session.transcript && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", marginBottom: "32px", overflow: "hidden" }}>
            <button
              onClick={() => setTranscriptOpen(o => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "none", border: "none", cursor: "pointer" }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em" }}>YOUR TRANSCRIPT</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-3)", fontWeight: 600 }}>{transcriptOpen ? "Hide" : "See what you said"}</span>
                {transcriptOpen ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
              </div>
            </button>
            {transcriptOpen && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "0 24px 24px" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", marginBottom: "12px" }}>
                  <CopyButton text={session.transcript} />
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.9, margin: 0 }}>{session.transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* Next actions */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "28px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>NOW USE THIS</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/pitchready" style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "11px 20px", borderRadius: "10px",
              background: CORAL, color: "#fff",
              fontSize: "13px", fontWeight: 700, textDecoration: "none",
            }}>
              <Mic className="w-4 h-4" /> Practice again
            </a>
            <a href="/opportunities" style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "11px 20px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "none",
              color: "var(--text-2)", fontSize: "13px", fontWeight: 600, textDecoration: "none",
            }}>
              <Briefcase className="w-4 h-4" /> Review a role
            </a>
            <a href="/career" style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "11px 20px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "none",
              color: "var(--text-2)", fontSize: "13px", fontWeight: 600, textDecoration: "none",
            }}>
              <FileText className="w-4 h-4" /> Career tools
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
