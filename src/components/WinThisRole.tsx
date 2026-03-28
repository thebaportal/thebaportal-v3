import Link from "next/link";
import type { JobListing, WinInsights } from "@/lib/jobInsights";

const C = {
  bg:         "#09090b",
  surface:    "#111117",
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

interface Props {
  job:        JobListing;
  insights:   WinInsights;
  isLoggedIn: boolean;
}

export default function WinThisRole({ job, insights, isLoggedIn }: Props) {
  const { gapRows, failReasons, winSteps } = insights;

  const levelLabel =
    job.level === "entry"  ? "Entry Level" :
    job.level === "junior" ? "Junior"       :
    job.level === "senior" ? "Senior"       :
    "Mid Level";

  const typeLabel =
    job.work_type === "remote" ? "Remote" :
    job.work_type === "hybrid" ? "Hybrid" :
    "On-site";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .wtr-gap-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .wtr-gap-right { border-left: 1px solid ${C.border}; }
        .wtr-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) {
          .wtr-gap-grid  { grid-template-columns: 1fr; }
          .wtr-gap-right { border-left: none; border-top: 1px solid ${C.border}; }
          .wtr-steps     { grid-template-columns: 1fr; }
        }
      `}} />

      <div style={{ padding: "40px 24px 80px", maxWidth: 880, margin: "0 auto" }}>

        {/* Back link */}
        <Link
          href="/opportunities"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text3, textDecoration: "none", marginBottom: 32 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Jobs
        </Link>

        {/* ── 1. Job context ── */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text1, margin: "0 0 12px", lineHeight: 1.2, letterSpacing: "-0.025em" }}>
            {job.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
            {job.company && (
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text2 }}>{job.company}</span>
            )}
            {job.company && job.location && (
              <span style={{ color: C.text4 }}>·</span>
            )}
            {job.location && (
              <span style={{ fontSize: 14, color: C.text3 }}>{job.location}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: C.tealSoft, color: C.teal, border: `1px solid ${C.tealBorder}` }}>
              {typeLabel}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "rgba(148,163,184,0.08)", color: C.text3, border: `1px solid ${C.border}` }}>
              {levelLabel}
            </span>
          </div>
        </div>

        {/* ── 2. Alex Rivera card ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.tealBorder}`, borderRadius: 16, padding: "28px 32px", marginBottom: 48, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(31,191,159,0.05) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", position: "relative" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: C.tealSoft, border: `2px solid ${C.tealBorder}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.teal }}>
              A
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Alex Rivera, Career Coach
              </div>
              <p style={{ fontSize: 19, fontWeight: 700, color: C.text1, margin: "0 0 12px", lineHeight: 1.45, letterSpacing: "-0.01em" }}>
                &ldquo;I&rsquo;ve reviewed this role. Here&rsquo;s what 90% of candidates get wrong.&rdquo;
              </p>
              <p style={{ fontSize: 14, color: C.text3, margin: 0, lineHeight: 1.75 }}>
                Most candidates apply, do surface prep, and wonder why they don&rsquo;t hear back. This page gives you the honest breakdown of what this specific role actually tests — and exactly what you need to do before you apply.
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. The Gap ── */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            The Gap
          </h2>
          <p style={{ fontSize: 14, color: C.text3, margin: "0 0 24px", lineHeight: 1.65 }}>
            What this role says — and what it actually tests in the room.
          </p>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div className="wtr-gap-grid" style={{ background: "#16161d", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ padding: "11px 20px", fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                What the job says
              </div>
              <div className="wtr-gap-right" style={{ padding: "11px 20px", fontSize: 11, fontWeight: 700, color: C.text4, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                What it actually tests
              </div>
            </div>

            {/* Rows */}
            {gapRows.map((row, i) => (
              <div
                key={i}
                className="wtr-gap-grid"
                style={{
                  borderBottom: i < gapRows.length - 1 ? `1px solid ${C.border}` : "none",
                  background: i % 2 === 1 ? "rgba(255,255,255,0.016)" : "transparent",
                }}
              >
                <div style={{ padding: "18px 20px", fontSize: 13, color: C.text2, lineHeight: 1.65, fontStyle: row.says.startsWith('"') ? "italic" : "normal" }}>
                  {row.says}
                </div>
                <div className="wtr-gap-right" style={{ padding: "18px 20px", fontSize: 13, color: C.text3, lineHeight: 1.65 }}>
                  {row.tests}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Why Most Candidates Fail Here ── */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Why Most Candidates Fail Here
          </h2>
          <p style={{ fontSize: 14, color: C.text3, margin: "0 0 24px", lineHeight: 1.65 }}>
            Three specific reasons — based on what this role actually demands.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {failReasons.map((reason, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 16, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.redSoft, border: "1px solid rgba(239,68,68,0.22)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, color: C.text2, margin: 0, lineHeight: 1.75 }}>{reason}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. How to Win This Role ── */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            How to Win This Role
          </h2>
          <p style={{ fontSize: 14, color: C.text3, margin: "0 0 24px", lineHeight: 1.65 }}>
            Four steps. Do all four before you apply.
          </p>

          <div className="wtr-steps">
            {winSteps.map((step) => (
              <div
                key={step.number}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.teal, fontFamily: "monospace", marginBottom: 14 }}>
                  {step.number}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text1, margin: "0 0 10px", letterSpacing: "-0.01em", lineHeight: 1.35 }}>
                  {step.heading}
                </h3>
                <p style={{ fontSize: 13, color: C.text3, margin: "0 0 18px", lineHeight: 1.75 }}>
                  {step.body}
                </p>
                <Link
                  href={step.ctaHref}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: C.teal, textDecoration: "none" }}
                >
                  {step.cta}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. The Uncomfortable Truth ── */}
        <section>
          <div style={{ background: "#0d1117", border: `1px solid ${C.border}`, borderRadius: 16, padding: "44px 36px", textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text1, margin: "0 0 16px", letterSpacing: "-0.025em" }}>
              The Uncomfortable Truth
            </h2>
            <p style={{ fontSize: 15, color: C.text3, margin: "0 auto 28px", maxWidth: 500, lineHeight: 1.75 }}>
              Most candidates read this and do nothing. They bookmark it, mean to come back, and apply without any of it. The ones who get hired are the ones who act on it today.
            </p>
            <Link
              href={isLoggedIn ? "/scenarios" : "/signup"}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#000", background: C.teal, padding: "13px 28px", borderRadius: 10, textDecoration: "none" }}
            >
              Start now. Prove me wrong.
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            {!isLoggedIn && (
              <p style={{ fontSize: 12, color: C.text4, marginTop: 12, margin: "12px 0 0" }}>
                Free account. No credit card.
              </p>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
