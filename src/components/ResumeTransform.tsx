"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAnalytics } from "@/lib/posthog";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PreviewBullet {
  original:   string;
  rewritten:  string;
  whyItFails: string;
}

interface TransformResult {
  preview: PreviewBullet[];
  full?:   string[];
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
  text1:      "#f8fafc",
  text2:      "#e2e8f0",
  text3:      "#94a3b8",
  text4:      "#475569",
};

// ── Props ─────────────────────────────────────────────────────────────────────

type SavedTransform = { preview: PreviewBullet[]; full: string[] };

interface Props {
  jobId:          string;
  jobTitle:       string;
  isLoggedIn:     boolean;
  isPro:          boolean;
  savedTransform?: SavedTransform | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResumeTransform({ jobId, jobTitle, isLoggedIn, isPro, savedTransform }: Props) {
  const [isOpen,     setIsOpen]     = useState(!!savedTransform);
  const [resumeText, setResumeText] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<TransformResult | null>(
    savedTransform ? {
      preview: savedTransform.preview,
      full:    isPro ? savedTransform.full : undefined,
      locked:  !isPro,
    } : null
  );
  const [error,      setError]      = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const outputRef  = useRef<HTMLDivElement>(null);
  const { track }  = useAnalytics();
  const searchParams = useSearchParams();
  const isReturn     = searchParams.get("return") === "true";
  const isCancelled  = searchParams.get("cancelled") === "true";

  // Auto-scroll to output on Stripe return
  useEffect(() => {
    if (isReturn && savedTransform) {
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [isReturn, savedTransform]);

  function copyBullets(r: TransformResult) {
    const bullets = r.locked
      ? r.preview.map(b => b.rewritten)
      : [...r.preview.map(b => b.rewritten), ...(r.full ?? [])];
    navigator.clipboard.writeText(bullets.map(b => `• ${b}`).join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function open() {
    setIsOpen(true);
    track("resume_section_opened", { job_id: jobId, job_title: jobTitle });
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
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
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
                    Aligning your experience to this role…
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
            <div ref={outputRef} style={{ scrollMarginTop: 88 }}>

              {/* Preview bullets */}
              <div style={{ marginBottom: result.locked ? 0 : 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    Rewritten Bullets
                  </div>
                  <button
                    onClick={() => copyBullets(result)}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: copied ? C.teal : C.text3, transition: "color 0.15s" }}
                  >
                    {copied ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy bullets
                      </>
                    )}
                  </button>
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
              {!result.locked && result.full && result.full.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  {isReturn && (
                    <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(31,191,159,0.06)", border: `1px solid ${C.tealBorder}`, borderRadius: 8, fontSize: 12.5, color: C.teal, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      Full version unlocked
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
                    Full rewrite — job-aligned bullets
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.full.map((bullet, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 16px", background: "rgba(31,191,159,0.03)", border: `1px solid ${C.tealBorder}`, borderRadius: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, flexShrink: 0, marginTop: 8 }} />
                        <p style={{ fontSize: 13.5, color: C.text2, margin: 0, lineHeight: 1.7 }}>{bullet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked — free users */}
              {result.locked && (
                <div style={{ position: "relative", marginTop: 20 }}>

                  {/* Tension — what they are missing */}
                  <div style={{ marginBottom: 16, padding: "14px 18px", background: C.redSoft, border: `1px solid rgba(239,68,68,0.15)`, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 8 }}>Right now, your resume likely:</div>
                    {["sounds generic and could apply to any role", "does not show what this role actually tests", "will not stand out from other applicants"].map((line, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < 2 ? 5 : 0 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.red, flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontSize: 12.5, color: C.text3, lineHeight: 1.55 }}>{line}</span>
                      </div>
                    ))}
                  </div>
                  {/* Cancelled banner */}
                  {isCancelled && (
                    <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(148,163,184,0.06)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12.5, color: C.text3, textAlign: "center" }}>
                      Your full version is still locked. You can upgrade any time.
                    </div>
                  )}

                  {/* Blurred skeleton */}
                  <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                        Full rewrite — job-aligned bullets
                      </div>
                      {[88, 72, 95, 65, 80].map((w, i) => (
                        <div key={i} style={{ height: 13, borderRadius: 6, background: C.border, marginBottom: 8, width: `${w}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* Overlay */}
                  <div style={{
                    position:      "absolute",
                    inset:         0,
                    background:    "linear-gradient(to bottom, transparent 0%, rgba(9,9,11,0.85) 40%, rgba(9,9,11,0.98) 100%)",
                    display:       "flex",
                    flexDirection: "column",
                    alignItems:    "center",
                    justifyContent:"flex-end",
                    paddingBottom: 8,
                    borderRadius:  10,
                  }}>
                    <div style={{ textAlign: "center", padding: "0 12px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: "0 0 6px" }}>
                        This is what your resume should sound like for this role.
                      </p>
                      <p style={{ fontSize: 12.5, color: C.text3, margin: "0 0 4px", lineHeight: 1.6 }}>
                        Most candidates apply with generic experience. This is tailored to what this role actually tests.
                      </p>
                      <p style={{ fontSize: 12, color: C.text4, margin: "0 0 16px", lineHeight: 1.5, fontStyle: "italic" }}>
                        One strong application can change your outcome.
                      </p>
                      <Link
                        href={isLoggedIn ? `/pricing?return_job=${jobId}` : `/signup?return_job=${jobId}`}
                        onClick={() => track("upgrade_clicked", { job_id: jobId, job_title: jobTitle, is_logged_in: isLoggedIn })}
                        style={{
                          display:        "inline-flex",
                          alignItems:     "center",
                          gap:            7,
                          fontSize:       13,
                          fontWeight:     700,
                          color:          "#000",
                          background:     C.teal,
                          padding:        "10px 22px",
                          borderRadius:   9,
                          textDecoration: "none",
                        }}
                      >
                        Get the full version
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                      <div style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 11, color: C.text4 }}>Built for Business Analysts targeting real roles.</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Link
                          href={isLoggedIn ? `#` : `/signup?return_job=${jobId}`}
                          style={{ fontSize: 11, color: C.text4, textDecoration: "underline", textDecorationColor: "rgba(71,85,105,0.5)" }}
                          onClick={e => { if (isLoggedIn) { e.preventDefault(); } }}
                        >
                          Or apply without fixing it
                        </Link>
                      </div>
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
