"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAnalytics } from "@/lib/posthog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PreviewBullet {
  original:   string;
  rewritten:  string;
  whyItFails: string;
}

interface TransformFull {
  missingSignals:    string[];
  additionalBullets: string[];
  positioningSummary: string;
}

interface TransformResult {
  preview: PreviewBullet[];
  full?:   TransformFull;
  locked:  boolean;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg:         "#09090b",
  surface:    "#111117",
  surface2:   "#16161d",
  border:     "#1e293b",
  teal:       "#1fbf9f",
  tealSoft:   "rgba(31,191,159,0.08)",
  tealBorder: "rgba(31,191,159,0.22)",
  red:        "#ef4444",
  redSoft:    "rgba(239,68,68,0.08)",
  amber:      "#f59e0b",
  amberSoft:  "rgba(245,158,11,0.08)",
  amberBorder:"rgba(245,158,11,0.22)",
  text1:      "#f8fafc",
  text2:      "#e2e8f0",
  text3:      "#94a3b8",
  text4:      "#475569",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  jobId:      string;
  jobTitle:   string;
  isLoggedIn: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResumeTransform({ jobId, jobTitle, isLoggedIn }: Props) {
  const [isOpen,     setIsOpen]     = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<TransformResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const sectionRef = useRef<HTMLDivElement>(null);
  const { track } = useAnalytics();

  function open() {
    setIsOpen(true);
    track("resume_section_opened", { job_id: jobId, job_title: jobTitle });
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function handleSubmit() {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    track("resume_submitted", { job_id: jobId, job_title: jobTitle, resume_length: resumeText.trim().length });

    try {
      const res = await fetch("/api/resume/transform", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ job_id: jobId, raw_text: resumeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data as TransformResult);
      if (data.locked) {
        track("paywall_shown", { job_id: jobId, job_title: jobTitle, location: "resume_transform" });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed — please try again");
    } finally {
      setLoading(false);
    }
  }

  // ── Collapsed trigger ──────────────────────────────────────────────────────

  if (!isOpen) {
    return (
      <div style={{ margin: "0 0 52px" }}>
        <button
          onClick={open}
          style={{
            width:           "100%",
            background:      "transparent",
            border:          `1.5px dashed ${C.tealBorder}`,
            borderRadius:    14,
            padding:         "22px 28px",
            cursor:          "pointer",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            gap:             16,
            textAlign:       "left",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.teal, marginBottom: 4 }}>
              Tailor my resume for this role
            </div>
            <div style={{ fontSize: 13, color: C.text4, lineHeight: 1.5 }}>
              Paste your resume. Alex will rewrite your weakest bullets for this specific job.
            </div>
          </div>
          <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </button>
      </div>
    );
  }

  // ── Expanded ───────────────────────────────────────────────────────────────

  return (
    <div ref={sectionRef} style={{ margin: "0 0 52px", scrollMarginTop: 88 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.tealBorder}`, borderRadius: 14, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.tealSoft, border: `1.5px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.teal }}>
              A
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, lineHeight: 1.2 }}>Alex Rivera</div>
              <div style={{ fontSize: 11, color: C.teal, fontWeight: 600, marginTop: 1 }}>Resume Rewrite</div>
            </div>
          </div>
          <button
            onClick={() => { setIsOpen(false); setResult(null); setError(null); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.text4, padding: 4, display: "flex" }}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: "24px" }}>

          {/* Textarea (hidden once result is shown) */}
          {!result && (
            <>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px", lineHeight: 1.65 }}>
                Paste your resume below. Alex will compare your bullets against what{" "}
                <strong style={{ color: C.text2, fontWeight: 600 }}>{jobTitle}</strong> actually tests — and rewrite the weakest ones.
              </p>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your resume here — work experience, bullet points, summary..."
                disabled={loading}
                style={{
                  width:           "100%",
                  minHeight:       220,
                  background:      C.surface2,
                  border:          `1px solid ${C.border}`,
                  borderRadius:    10,
                  color:           C.text2,
                  fontSize:        13,
                  lineHeight:      1.7,
                  padding:         "14px 16px",
                  resize:          "vertical",
                  fontFamily:      "inherit",
                  outline:         "none",
                  boxSizing:       "border-box",
                  opacity:         loading ? 0.5 : 1,
                }}
              />

              {error && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: C.redSoft, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !resumeText.trim()}
                style={{
                  marginTop:    14,
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  fontSize:     14,
                  fontWeight:   700,
                  color:        loading || !resumeText.trim() ? C.text4 : "#000",
                  background:   loading || !resumeText.trim() ? C.surface2 : C.teal,
                  border:       `1px solid ${loading || !resumeText.trim() ? C.border : C.teal}`,
                  borderRadius: 9,
                  padding:      "11px 22px",
                  cursor:       loading || !resumeText.trim() ? "not-allowed" : "pointer",
                  transition:   "opacity 0.15s",
                }}
              >
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Rewriting...
                  </>
                ) : (
                  <>
                    Transform my resume
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
              <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
            </>
          )}

          {/* Results */}
          {result && (
            <div>

              {/* Preview bullets */}
              <div style={{ marginBottom: result.locked ? 0 : 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14 }}>
                  Rewritten Bullets
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {result.preview.map((bullet, i) => (
                    <div key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                      {/* Before */}
                      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.red, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
                          Before
                        </div>
                        <p style={{ fontSize: 13, color: C.text4, margin: 0, lineHeight: 1.65, fontStyle: "italic" }}>
                          {bullet.original}
                        </p>
                      </div>
                      {/* After */}
                      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(31,191,159,0.03)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
                          After
                        </div>
                        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.65 }}>
                          {bullet.rewritten}
                        </p>
                      </div>
                      {/* Why it fails */}
                      <div style={{ padding: "10px 18px", background: C.redSoft }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.red, marginRight: 6 }}>Why it fails:</span>
                        <span style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>{bullet.whyItFails}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full output — pro */}
              {!result.locked && result.full && (
                <div style={{ marginTop: 28 }}>

                  {/* Missing signals */}
                  {result.full.missingSignals.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
                        What your resume fails to prove
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {result.full.missingSignals.map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.amberSoft, border: `1px solid ${C.amberBorder}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="3">
                                <path d="M12 9v4M12 17h.01"/>
                              </svg>
                            </div>
                            <p style={{ fontSize: 13, color: C.text3, margin: 0, lineHeight: 1.65 }}>{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional bullets */}
                  {result.full.additionalBullets.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
                        Additional Rewritten Bullets
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {result.full.additionalBullets.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", background: "rgba(31,191,159,0.03)", border: `1px solid ${C.tealBorder}`, borderRadius: 10 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, flexShrink: 0, marginTop: 7 }} />
                            <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.65 }}>{b}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positioning summary */}
                  {result.full.positioningSummary && (
                    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                        How to position yourself
                      </div>
                      <p style={{ fontSize: 13.5, color: C.text3, margin: 0, lineHeight: 1.75 }}>
                        {result.full.positioningSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Locked — free users */}
              {result.locked && (
                <div style={{ position: "relative", marginTop: 20 }}>
                  {/* Blurred skeleton */}
                  <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                        What your resume fails to prove
                      </div>
                      {[80, 65, 72].map((w, i) => (
                        <div key={i} style={{ height: 13, borderRadius: 6, background: C.border, marginBottom: 8, width: `${w}%` }} />
                      ))}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                        Additional Rewritten Bullets
                      </div>
                      {[90, 78].map((w, i) => (
                        <div key={i} style={{ height: 13, borderRadius: 6, background: C.border, marginBottom: 8, width: `${w}%` }} />
                      ))}
                    </div>
                    <div>
                      <div style={{ height: 13, borderRadius: 6, background: C.border, marginBottom: 8, width: "95%" }} />
                      <div style={{ height: 13, borderRadius: 6, background: C.border, width: "60%" }} />
                    </div>
                  </div>

                  {/* Overlay */}
                  <div style={{
                    position:   "absolute",
                    inset:      0,
                    background: "linear-gradient(to bottom, transparent 0%, rgba(9,9,11,0.85) 40%, rgba(9,9,11,0.98) 100%)",
                    display:    "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingBottom: 8,
                    borderRadius: 10,
                  }}>
                    <div style={{ textAlign: "center", padding: "0 12px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: "0 0 6px" }}>
                        You saw what's broken. Now fix it.
                      </p>
                      <p style={{ fontSize: 12.5, color: C.text3, margin: "0 0 16px", lineHeight: 1.6 }}>
                        The full rewrite — missing signals, additional bullets, and positioning — is Pro only.
                      </p>
                      <Link
                        href={isLoggedIn ? "/pricing" : "/signup"}
                        onClick={() => track("upgrade_clicked", { job_id: jobId, job_title: jobTitle, is_logged_in: isLoggedIn })}
                        style={{
                          display:      "inline-flex",
                          alignItems:   "center",
                          gap:          7,
                          fontSize:     13,
                          fontWeight:   700,
                          color:        "#000",
                          background:   C.teal,
                          padding:      "10px 22px",
                          borderRadius: 9,
                          textDecoration: "none",
                        }}
                      >
                        {isLoggedIn ? "Upgrade to Pro" : "Get started free"}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                      {!isLoggedIn && (
                        <p style={{ fontSize: 11, color: C.text4, margin: "8px 0 0" }}>
                          Free account. No credit card.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Try again */}
              <button
                onClick={() => { setResult(null); setResumeText(""); setError(null); }}
                style={{ marginTop: 20, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.text4, padding: 0, textDecoration: "underline" }}
              >
                Try a different resume
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
