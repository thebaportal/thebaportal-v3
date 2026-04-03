"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Target, Mic, FileText, Briefcase } from "lucide-react";

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

function DimBar({ label, score, feedback, examples }: { label: string; score: number; feedback: string; examples?: string[] }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(score);
  return (
    <div style={{ marginBottom: "14px" }}>
      <button onClick={() => setOpen(p => !p)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
          <span style={{ fontSize: "13px", fontWeight: 800, color }}>{score}</span>
        </div>
        <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px", transition: "width 1s ease" }} />
        </div>
      </button>
      {open && (
        <div style={{ marginTop: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", borderLeft: `3px solid ${color}` }}>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.75, margin: 0 }}>{feedback}</p>
          {examples?.map((ex, i) => (
            <div key={i} style={{ fontSize: "12px", color: CORAL, fontStyle: "italic", marginTop: "4px" }}>&ldquo;{ex}&rdquo;</div>
          ))}
        </div>
      )}
    </div>
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
  const fb = session.feedback_output ?? {};
  const score = session.overall_score ?? 0;
  const color = scoreColor(score);

  const date = new Date(session.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

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

        {/* Top win + top fix */}
        {(fb.topWin || fb.topFix) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
            {fb.topWin && (
              <div style={{ background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.2)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.09em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <CheckCircle className="w-3 h-3" /> TOP WIN
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.75, margin: 0 }}>{fb.topWin}</p>
              </div>
            )}
            {fb.topFix && (
              <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}28`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Target className="w-3 h-3" /> TOP FIX
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.75, margin: 0 }}>{fb.topFix}</p>
              </div>
            )}
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
                  YOUR REUSABLE ANSWER
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
        {fb.dimensions && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>
              DIMENSION SCORES — click any to expand
            </div>
            {fb.dimensions.clarity && <DimBar label="Clarity" score={fb.dimensions.clarity.score} feedback={fb.dimensions.clarity.feedback} />}
            {fb.dimensions.structure && <DimBar label="Structure" score={fb.dimensions.structure.score} feedback={fb.dimensions.structure.feedback} />}
            {fb.dimensions.confidence && <DimBar label="Confidence" score={fb.dimensions.confidence.score} feedback={fb.dimensions.confidence.feedback} />}
            {fb.dimensions.audienceAlignment && <DimBar label="Audience Alignment" score={fb.dimensions.audienceAlignment.score} feedback={fb.dimensions.audienceAlignment.feedback} />}
            {fb.dimensions.executivePresence && <DimBar label="Executive Presence" score={fb.dimensions.executivePresence.score} feedback={fb.dimensions.executivePresence.feedback} />}
            {fb.dimensions.fillerWords && <DimBar label={`Filler Words (${fb.dimensions.fillerWords.count ?? 0} detected)`} score={fb.dimensions.fillerWords.score} feedback={fb.dimensions.fillerWords.feedback} examples={fb.dimensions.fillerWords.examples} />}
            {fb.dimensions.hedgingLanguage && <DimBar label="Hedging Language" score={fb.dimensions.hedgingLanguage.score} feedback={fb.dimensions.hedgingLanguage.feedback} examples={fb.dimensions.hedgingLanguage.examples} />}
            {fb.dimensions.pacing && <DimBar label={`Pacing${fb.dimensions.pacing.wpm ? ` (${fb.dimensions.pacing.wpm} wpm)` : ""}`} score={fb.dimensions.pacing.score} feedback={fb.dimensions.pacing.feedback} />}
          </div>
        )}

        {/* Coaching rewrites */}
        {(fb.strongerOpening || fb.strongerClosing || fb.mostImprovedLine) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>COACHING REWRITES</div>
            {[
              { label: "Stronger Opening", content: fb.strongerOpening, color: "var(--teal)" },
              { label: "Stronger Closing", content: fb.strongerClosing, color: CORAL },
              { label: "Most Improved Line", content: fb.mostImprovedLine, color: "#f59e0b" },
            ].filter(x => x.content).map(({ label, content, color: c }) => (
              <div key={label} style={{ marginBottom: "18px", paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: c, letterSpacing: "0.07em", marginBottom: "8px" }}>{label.toUpperCase()}</div>
                <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.8, margin: 0 }}>{content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stakeholder impact */}
        {fb.stakeholderImpact && (
          <div style={{ background: `${CORAL}07`, border: `1px solid ${CORAL}20`, borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "12px" }}>STAKEHOLDER IMPACT</div>
            <p style={{ fontSize: "15px", color: "var(--text-1)", lineHeight: 1.85, margin: 0 }}>{fb.stakeholderImpact}</p>
          </div>
        )}

        {/* Transcript */}
        {session.transcript && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em" }}>YOUR TRANSCRIPT</div>
              <CopyButton text={session.transcript} />
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.9, margin: 0 }}>{session.transcript}</p>
          </div>
        )}

        {/* Next actions */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "28px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "16px" }}>NEXT STEPS</div>
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
              <Briefcase className="w-4 h-4" /> Review roles
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
