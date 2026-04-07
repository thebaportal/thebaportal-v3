"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Building2, Clock, ExternalLink, X, ArrowLeft } from "lucide-react";
import { generateInsight, type JobListing } from "@/lib/jobInsights";

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg:         "#09090b",
  border:     "#1e293b",
  teal:       "#1fbf9f",
  tealSoft:   "rgba(31,191,159,0.10)",
  tealBorder: "rgba(31,191,159,0.25)",
  text1:      "#f8fafc",
  text2:      "#cbd5e1",
  text3:      "#94a3b8",
  text4:      "#475569",
};

const A = {
  bg:         "#FAF8F5",
  bgCard:     "#F0EBE3",
  border:     "#E2D8CC",
  teal:       "#0F766E",
  tealSoft:   "rgba(15,118,110,0.10)",
  tealBorder: "rgba(15,118,110,0.22)",
  text1:      "#0F172A",
  text2:      "#334155",
  text3:      "#64748B",
  text4:      "#94A3B8",
};

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const WORK_TYPE_COLORS: Record<string, string> = { remote: "#059669", hybrid: "#7c3aed", onsite: "#2563eb" };
const LEVEL_LABELS:    Record<string, string>  = { entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function isFresh(dateStr: string): boolean {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000 <= 3;
}

function rawDescriptionText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatLocation(location: string | null): string {
  if (!location) return "";
  return location
    .replace(/,?\s*canada\s*$/i, "")
    .replace(/,?\s*ca\s*$/i, "")
    .trim();
}

const AGGREGATOR_HOSTS = ["adzuna", "indeed", "ziprecruiter", "monster", "careerjet", "jobbank"];

function resolveApplyUrl(job: JobListing): { href: string; label: string; isDirect: boolean } {
  if (job.apply_url_status === "valid" && job.verified_apply_url) {
    return { href: job.verified_apply_url, label: "Apply", isDirect: true };
  }
  if (job.apply_url_status === "invalid" && job.verified_apply_url) {
    return { href: job.verified_apply_url, label: "View on company site", isDirect: false };
  }
  const raw = job.apply_url || job.url || "";
  if (raw.startsWith("http")) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (!AGGREGATOR_HOSTS.some(a => host.includes(a))) {
        return { href: raw, label: "Apply", isDirect: true };
      }
    } catch { /* fall through */ }
  }
  return {
    href: `https://www.google.com/search?q=${encodeURIComponent([job.title, job.company, "Canada"].filter(Boolean).join(" "))}`,
    label: "View on company site",
    isDirect: false,
  };
}

const PREP_TO_TYPES: Record<string, string[]> = {
  "Requirements Challenge":    ["requirements", "elicitation"],
  "Stakeholder Interview Sim": ["facilitation", "elicitation"],
  "Agile BA Challenge":        ["discovery", "requirements"],
  "Process Mapping Challenge": ["solution-analysis", "change-management"],
  "Data Analysis Challenge":   ["data-migration"],
};

function getPracticeUrl(job: JobListing, isLoggedIn: boolean): string {
  if (!isLoggedIn) return "/signup";
  const types = new Set<string>();
  for (const p of (job.prep_links ?? [])) {
    (PREP_TO_TYPES[p.label] ?? []).forEach(t => types.add(t));
  }
  const params = new URLSearchParams({
    practicing: job.title,
    company:    job.company ?? "",
    types:      Array.from(types).join(","),
  });
  return `/scenarios?${params}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  job:                  JobListing;
  mode:                 "modal" | "page";
  onClose?:             () => void;
  isLoggedIn?:          boolean;
  initialCoachingOpen?: boolean;
}

export default function JobDetailContent({
  job,
  mode,
  onClose,
  isLoggedIn = false,
  initialCoachingOpen = true,
}: Props) {
  const router = useRouter();
  const [coachingOpen,   setCoachingOpen]   = useState(initialCoachingOpen);
  const [insightLoading, setInsightLoading] = useState(initialCoachingOpen);

  const apply   = resolveApplyUrl(job);
  const fresh   = isFresh(job.posted_at);
  const insight = generateInsight(job);

  useEffect(() => {
    if (insightLoading) {
      const t = setTimeout(() => setInsightLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [insightLoading]);

  function openCoachingPanel() {
    setCoachingOpen(true);
    setInsightLoading(true);
  }

  function saveJobContextForDashboard(source: "practice" | "interview" | "pitch") {
    try {
      localStorage.setItem("dashboardJobContext", JSON.stringify({
        title:   job.title,
        company: job.company ?? "",
        source,
      }));
    } catch { /* ignore */ }
  }

  function handlePractice() {
    saveJobContextForDashboard("practice");
    onClose?.();
    router.push(getPracticeUrl(job, isLoggedIn));
  }

  function handleInterview() {
    if (!isLoggedIn) { onClose?.(); router.push("/signup"); return; }
    saveJobContextForDashboard("interview");
    try {
      sessionStorage.setItem("interviewJobContext", JSON.stringify({
        jd:      rawDescriptionText(job.description),
        title:   job.title,
        company: job.company ?? "",
      }));
    } catch { /* sessionStorage unavailable */ }
    onClose?.();
    router.push("/interview/session");
  }

  // ── Column grid behaviour changes by mode ─────────────────────────────────
  // modal: fixed-height grid columns with internal overflow scroll
  // page:  natural-height columns, stacked on mobile via CSS class

  const isPage = mode === "page";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: isPage ? undefined : "100%" }}>

      <style>{`
        @keyframes jdc-pulse { 0%,100%{opacity:.3} 50%{opacity:.75} }
        .jdc-grid-page { display: grid; grid-template-columns: 1fr 400px; }
        .jdc-grid-modal { display: grid; }
        @media (max-width: 860px) {
          .jdc-grid-page { grid-template-columns: 1fr !important; }
          .jdc-page-alex { order: -1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: isPage ? "28px 32px 22px" : "20px 28px 18px",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {isPage && (
          <Link href="/opportunities" style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, color: C.text4, textDecoration: "none", marginBottom: 16,
          }}>
            <ArrowLeft size={11} /> Back to jobs
          </Link>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Building2 size={12} style={{ color: C.text4, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>
                {job.company ?? "Unknown"}
              </span>
              {fresh && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: C.teal,
                  background: C.tealSoft, border: `1px solid ${C.tealBorder}`,
                  borderRadius: 20, padding: "1px 7px", flexShrink: 0,
                }}>NEW</span>
              )}
            </div>
            <h1 style={{
              fontSize: isPage ? 26 : 20,
              fontWeight: 800, color: C.text1, lineHeight: 1.25,
              marginBottom: 10, letterSpacing: "-0.02em",
            }}>
              {job.title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {job.location && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text3 }}>
                  <MapPin size={10} style={{ color: C.text4 }} />
                  {formatLocation(job.location)}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                background: "rgba(255,255,255,0.05)",
                color: WORK_TYPE_COLORS[job.work_type] ?? C.text3,
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                {WORK_TYPE_LABELS[job.work_type]}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                background: "rgba(255,255,255,0.05)", color: C.text3,
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                {LEVEL_LABELS[job.level] ?? job.level}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text4 }}>
                <Clock size={10} />{daysAgo(job.posted_at)}
              </span>
            </div>
          </div>

          {/* Actions: "open full page" link (modal only) + close button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {!isPage && (
              <Link
                href={`/jobs/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, color: C.text4, textDecoration: "none",
                  padding: "4px 10px", borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.03)",
                  whiteSpace: "nowrap",
                }}
              >
                Open full page <ExternalLink size={9} />
              </Link>
            )}
            {onClose && (
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.text4, padding: 6, flexShrink: 0, borderRadius: 8, display: "flex" }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div
        className={isPage ? "jdc-grid-page" : "jdc-grid-modal"}
        style={
          isPage
            ? undefined
            : {
                gridTemplateColumns: coachingOpen ? "1fr 380px" : "1fr 170px",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
              }
        }
      >

        {/* LEFT — verbatim job description */}
        <div style={{
          overflowY: isPage ? undefined : "auto",
          padding: "28px 32px 40px",
          borderRight: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
              Job description
            </span>
            <span style={{ fontSize: 10, color: C.text4, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>
              from employer
            </span>
          </div>
          {job.description ? (
            <p style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {rawDescriptionText(job.description)}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: C.text3, margin: 0, lineHeight: 1.7 }}>
              No description provided. View the full posting for details.
            </p>
          )}
        </div>

        {/* RIGHT — Alex Rivera coaching panel (warm light background) */}
        <div
          className={isPage ? "jdc-page-alex" : undefined}
          style={{
            overflowY: isPage ? undefined : "auto",
            display: "flex",
            flexDirection: "column",
            background: A.bg,
            minWidth: 0,
          }}
        >
          {!coachingOpen ? (
            /* ── Mini panel: user arrived via "Apply" ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 16, padding: "28px 16px", height: "100%",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: A.tealSoft, border: `1px solid ${A.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: A.teal }}>AR</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: A.text1, marginBottom: 2 }}>Alex Rivera</div>
                <div style={{ fontSize: 10, color: A.teal, fontWeight: 600 }}>Senior BA Coach</div>
              </div>
              <button
                onClick={openCoachingPanel}
                style={{ width: "100%", padding: "10px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: A.tealSoft, color: A.teal, border: `1px solid ${A.tealBorder}`, textAlign: "center", lineHeight: 1.4 }}
              >
                See what Alex says →
              </button>
              <div style={{ width: "100%", borderTop: `1px solid ${A.border}`, paddingTop: 14 }}>
                <a
                  href={apply.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "10px 8px", borderRadius: 8, background: A.teal, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                >
                  Apply now
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Alex identity bar — sticky */}
              <div style={{
                padding: "20px 22px 16px",
                borderBottom: `1px solid ${A.border}`,
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
                position: "sticky", top: 0, background: A.bg, zIndex: 1,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: A.tealSoft, border: `1px solid ${A.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: A.teal }}>AR</span>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text1 }}>Alex Rivera</div>
                  <div style={{ fontSize: 11, color: A.teal, fontWeight: 600, marginTop: 1 }}>Senior BA Coach</div>
                </div>
              </div>

              {/* Coaching content */}
              <div style={{ padding: "20px 22px 32px", flex: 1 }}>
                <p style={{ fontSize: 12.5, color: A.text3, marginBottom: 24, lineHeight: 1.7, fontStyle: "italic" }}>
                  &ldquo;I&apos;ve reviewed this role. Here&apos;s what I&apos;d tell you before you apply.&rdquo;
                </p>

                {insightLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 4 }}>
                      Reviewing role…
                    </div>
                    {[78, 55, 90, 48, 70].map((w, i) => (
                      <div key={i} style={{ height: 9, borderRadius: 5, background: A.tealSoft, width: `${w}%`, animation: "jdc-pulse 1.2s ease-in-out infinite" }} />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* WHAT I'M SEEING */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 12 }}>
                        What I&apos;m seeing
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {insight.insights.map((ins, i) => (
                          <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: A.bgCard, border: `1px solid ${A.border}` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: A.text1, marginBottom: 5 }}>{ins.heading}</div>
                            <p style={{ fontSize: 12, color: A.text2, lineHeight: 1.65, margin: 0 }}>{ins.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MY ADVICE */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 12 }}>
                        My advice
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {insight.advice.map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, color: A.text2, lineHeight: 1.65 }}>
                            <span style={{ color: A.teal, flexShrink: 0, fontWeight: 700, fontSize: 14, marginTop: -1 }}>→</span>
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* WHAT THEY'LL TEST YOU ON */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 10 }}>
                        What they&apos;ll likely test you on
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                        {insight.interviewFocus.map((f, i) => (
                          <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: A.text2, lineHeight: 1.6 }}>
                            <span style={{ color: A.teal, flexShrink: 0, fontWeight: 700 }}>›</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* QUESTIONS TO PRACTICE */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 6 }}>
                        Questions to practice
                      </div>
                      <p style={{ fontSize: 11.5, color: A.text3, marginBottom: 12, lineHeight: 1.5 }}>
                        Say these out loud — that&apos;s where you find the real gaps.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {insight.questions.map((item, i) => (
                          <div key={i} style={{ borderRadius: 10, border: `1px solid ${A.border}`, overflow: "hidden" }}>
                            <div style={{ padding: "11px 13px", background: A.bgCard }}>
                              <span style={{ color: A.teal, fontWeight: 700, fontSize: 10, marginRight: 6, fontFamily: "monospace" }}>Q{i + 1}</span>
                              <span style={{ fontSize: 12.5, color: A.text1, lineHeight: 1.6, fontWeight: 600 }}>{item.q}</span>
                            </div>
                            <div style={{ padding: "9px 13px", background: A.bg, borderTop: `1px solid ${A.border}` }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: A.teal, marginRight: 5 }}>Coaching note:</span>
                              <span style={{ fontSize: 11.5, color: A.text3, lineHeight: 1.6 }}>{item.note}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prepare for this role — 3 actions */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 10 }}>
                        Prepare for this role
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <button
                          onClick={handlePractice}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: A.tealSoft, color: A.teal, border: `1px solid ${A.tealBorder}`, textAlign: "left" }}
                        >
                          <span>Practice this role</span>
                          <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>Simulation Lab →</span>
                        </button>
                        <button
                          onClick={handleInterview}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: A.bgCard, color: A.text1, border: `1px solid ${A.border}`, textAlign: "left" }}
                        >
                          <span>Interview for this role</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: A.teal, opacity: 0.8 }}>Interview Lab →</span>
                        </button>
                        <button
                          onClick={() => {
                            if (!isLoggedIn) { onClose?.(); router.push("/signup"); return; }
                            saveJobContextForDashboard("pitch");
                            try {
                              sessionStorage.setItem("pitchReadyJobContext", JSON.stringify({
                                title:   job.title,
                                company: job.company ?? "",
                              }));
                            } catch { /* ignore */ }
                            onClose?.();
                            router.push("/pitchready");
                          }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: A.bgCard, color: A.text2, border: `1px solid ${A.border}`, textAlign: "left" }}
                        >
                          <span>Tailor your pitch</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: A.teal, opacity: 0.8 }}>PitchReady →</span>
                        </button>
                      </div>
                    </div>


                    {/* Apply */}
                    <div style={{ borderTop: `1px solid ${A.border}`, paddingTop: 16, marginBottom: 16 }}>
                      <a
                        href={apply.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 10, background: A.teal, color: "#fff", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}
                      >
                        Apply on company site <ExternalLink size={13} />
                      </a>
                      {!apply.isDirect && (
                        <p style={{ fontSize: 11, color: A.text4, textAlign: "center", marginTop: 5 }}>
                          Opens employer careers page
                        </p>
                      )}
                    </div>

                    {/* Disclaimer */}
                    <p style={{ fontSize: 11, color: A.text4, lineHeight: 1.6, margin: 0 }}>
                      Alex Rivera is an independent career coach, not affiliated with this employer. Coaching notes are based on patterns from 140+ BA roles across Canada.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
