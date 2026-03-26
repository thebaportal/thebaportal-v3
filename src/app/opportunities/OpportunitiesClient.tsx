"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Building2, Clock, ExternalLink, Search, Briefcase, RefreshCw, AlertTriangle, X, ChevronRight } from "lucide-react";

interface PrepLink { label: string; href: string }

interface JobListing {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  apply_url: string | null;
  url: string | null;
  posted_at: string;
  work_type: "remote" | "hybrid" | "onsite";
  level: "entry" | "junior" | "mid" | "senior";
  quality_score: number;
  prep_links: PrepLink[] | null;
  source_type: string | null;
  source_name: string | null;
}

interface Props {
  initialJobs: JobListing[];
  isLoggedIn: boolean;
  syncError?: string;
}

interface PracticeModal {
  jobTitle: string;
  company: string;
  practiceParams: string;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg:          "#09090b",
  surface:     "#111117",
  card:        "#131318",
  border:      "#1e293b",
  borderHover: "#334155",
  teal:        "#1fbf9f",
  tealSoft:    "rgba(31,191,159,0.10)",
  tealBorder:  "rgba(31,191,159,0.25)",
  text1:       "#f8fafc",
  text2:       "#cbd5e1",
  text3:       "#94a3b8",
  text4:       "#475569",
};

// ── Prep → challenge type mapping ─────────────────────────────────────────────

const PREP_TO_TYPES: Record<string, string[]> = {
  "Requirements Challenge":    ["requirements", "elicitation"],
  "Stakeholder Interview Sim": ["facilitation", "elicitation"],
  "Agile BA Challenge":        ["discovery", "requirements"],
  "Process Mapping Challenge": ["solution-analysis", "change-management"],
  "Data Analysis Challenge":   ["data-migration"],
};

const WHY_MAP: Record<string, string> = {
  "Requirements Challenge":    "tests requirements gathering and BRD writing",
  "Stakeholder Interview Sim": "tests stakeholder facilitation and alignment",
  "Agile BA Challenge":        "tests agile BA workflow and backlog management",
  "Process Mapping Challenge": "tests process analysis and as-is/to-be documentation",
  "Data Analysis Challenge":   "tests data requirements and reporting skills",
  "Exam Prep":                 "aligns with CBAP/CCBA certification knowledge areas",
};

function whyThisMatters(prepLinks: PrepLink[]): string | null {
  const hit = prepLinks.find(p => p.label !== "Career Suite" && WHY_MAP[p.label]);
  return hit ? WHY_MAP[hit.label] : null;
}

function getPracticeTypes(prepLinks: PrepLink[]): string[] {
  const types = new Set<string>();
  for (const p of prepLinks) {
    (PREP_TO_TYPES[p.label] ?? []).forEach(t => types.add(t));
  }
  return Array.from(types);
}

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

function extractProvince(location: string | null): string {
  if (!location) return "";
  if (/\bremote\b/i.test(location)) return "Remote";
  const m = location.match(/\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT)\b/);
  return m ? m[1] : "";
}

const AGGREGATOR_HOSTS = ["adzuna", "indeed", "ziprecruiter", "monster", "careerjet", "jobbank"];
function isDirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !AGGREGATOR_HOSTS.some(a => host.includes(a));
  } catch { return false; }
}

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const WORK_TYPE_COLORS: Record<string, string> = { remote: "#059669", hybrid: "#7c3aed", onsite: "#2563eb" };
const LEVEL_LABELS: Record<string, string> = { entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior" };
const PROVINCES = ["ON", "BC", "AB", "QC", "MB", "SK", "NS", "Remote"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpportunitiesClient({ initialJobs, isLoggedIn, syncError }: Props) {
  const router = useRouter();
  const [keyword,  setKeyword]  = useState("");
  const [workType, setWorkType] = useState("all");
  const [level,    setLevel]    = useState("all");
  const [province, setProvince] = useState("all");
  const [syncing,  setSyncing]  = useState(false);
  const [syncMsg,  setSyncMsg]  = useState<string | null>(null);
  const [modal,       setModal]       = useState<PracticeModal | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  const triggerSync = useCallback(async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const res  = await fetch("/api/jobs/sync");
      const data = await res.json();
      if (!res.ok || data.error) setSyncMsg(`Sync failed: ${data.error ?? "unknown error"}`);
      else if (data.skipped) setSyncMsg(`Already synced ${data.minsAgo} minutes ago. Refresh to see latest.`);
      else { setSyncMsg(`Sync complete. ${data.upserted} jobs loaded.`); setTimeout(() => router.refresh(), 1200); }
    } catch (e) { setSyncMsg(`Sync failed: ${String(e)}`); }
    finally { setSyncing(false); }
  }, [router]);

  function handlePractice(job: JobListing) {
    const types = getPracticeTypes(job.prep_links ?? []);
    const params = new URLSearchParams({
      practicing: job.title,
      company:    job.company ?? "",
      types:      types.join(","),
    }).toString();

    if (isLoggedIn) {
      router.push(`/scenarios?${params}`);
    } else {
      // Store for post-signup pickup on scenarios page
      try { sessionStorage.setItem("practiceContext", params); } catch {}
      setModal({ jobTitle: job.title, company: job.company ?? "", practiceParams: params });
    }
  }

  const filtered = useMemo(() => initialJobs.filter(job => {
    const applyUrl = job.apply_url || job.url;
    if (!isDirectUrl(applyUrl)) return false;
    if (workType !== "all" && job.work_type !== workType) return false;
    if (level    !== "all" && job.level     !== level)    return false;
    if (province !== "all") {
      if (extractProvince(job.location) !== province) return false;
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      if (!job.title.toLowerCase().includes(k) &&
          !(job.company  ?? "").toLowerCase().includes(k) &&
          !(job.location ?? "").toLowerCase().includes(k)) return false;
    }
    return true;
  }), [initialJobs, keyword, workType, level, province]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased", color: C.text1 }}>

      {/* ── Nav ── */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(9,9,11,0.92)", borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 16, fontWeight: 800, color: C.text1, letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "monospace" }}>BA</div>
            The<span style={{ color: C.teal }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login"  style={{ fontSize: 13, color: C.text3, textDecoration: "none" }}>Sign in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ paddingTop: 58, background: `linear-gradient(180deg, #0d1117 0%, ${C.bg} 100%)`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 24px 64px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20, fontFamily: "monospace" }}>
            // live BA roles — Canada
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800, letterSpacing: "-0.03em", color: C.text1, lineHeight: 1.05, marginBottom: 20, maxWidth: 640 }}>
            Apply fast.{" "}
            <span style={{ color: C.teal }}>Then prove you can do the job.</span>
          </h1>
          <p style={{ fontSize: 16, color: C.text3, lineHeight: 1.7, maxWidth: 500, marginBottom: 36 }}>
            Real BA roles. Then practice what they&apos;ll actually test you on.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.01em" }}>
              Start practicing free <ChevronRight size={14} />
            </Link>
            <a href="#listings" style={{ fontSize: 14, color: C.text3, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Browse roles ↓
            </a>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
            {[
              `${filtered.length} roles live`,
              "Direct employer links only",
              "Canada only",
            ].map(s => (
              <span key={s} style={{ fontSize: 12, color: C.text4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal, display: "inline-block", flexShrink: 0 }} />
                {s}
              </span>
            ))}
          </div>
          {syncError && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#f87171", padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <AlertTriangle size={13} /> Sync error: {syncError}
            </div>
          )}
        </div>
      </div>

      {/* ── Listings ── */}
      <div id="listings" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 0" }}>

        {/* Filters */}
        <div style={{ marginBottom: 28, background: C.surface, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.border}` }}>
          <div style={{ position: "relative", maxWidth: 440, marginBottom: 14 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text4, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search title, company, or city…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text1, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.text4, fontWeight: 600, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</span>
            {(["all", "remote", "hybrid", "onsite"] as const).map(t => (
              <button key={t} onClick={() => setWorkType(t)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: workType === t ? C.teal : "transparent", color: workType === t ? "#fff" : C.text3, borderColor: workType === t ? C.teal : C.border, transition: "all 0.12s" }}>
                {t === "all" ? "All" : WORK_TYPE_LABELS[t]}
              </button>
            ))}
            <span style={{ fontSize: 11, color: C.text4, fontWeight: 600, marginLeft: 10, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Level</span>
            {(["all", "entry", "mid", "senior"] as const).map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: level === l ? C.teal : "transparent", color: level === l ? "#fff" : C.text3, borderColor: level === l ? C.teal : C.border, transition: "all 0.12s" }}>
                {l === "all" ? "All" : LEVEL_LABELS[l]}
              </button>
            ))}
            <span style={{ fontSize: 11, color: C.text4, fontWeight: 600, marginLeft: 10, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Province</span>
            {(["all", ...PROVINCES] as const).map(p => (
              <button key={p} onClick={() => setProvince(p)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: province === p ? C.teal : "transparent", color: province === p ? "#fff" : C.text3, borderColor: province === p ? C.teal : C.border, transition: "all 0.12s" }}>
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: C.text4 }}>
            {filtered.length} role{filtered.length !== 1 ? "s" : ""}
          </span>
          {syncMsg && (
            <span style={{ fontSize: 12, color: syncMsg.includes("failed") ? "#f87171" : C.teal, fontFamily: "monospace" }}>
              {syncMsg}
            </span>
          )}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center", color: C.text3 }}>
            <Briefcase size={36} style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }} />
            {initialJobs.length === 0 ? (
              <>
                <p style={{ fontSize: 15, marginBottom: 8, color: C.text2 }}>
                  {syncError ? "Sync failed — jobs could not be loaded." : "No jobs loaded yet."}
                </p>
                <p style={{ fontSize: 13, color: C.text3, marginBottom: 20 }}>
                  {syncError ? "Check that SUPABASE_SERVICE_ROLE_KEY is set in Vercel." : "Pull in the latest listings now."}
                </p>
                <button onClick={triggerSync} disabled={syncing}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", background: C.tealSoft, color: C.teal, border: `1px solid ${C.tealBorder}`, opacity: syncing ? 0.6 : 1 }}>
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "Syncing…" : "Sync jobs now"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, color: C.text2 }}>No jobs match your filters.</p>
                <button onClick={() => { setKeyword(""); setWorkType("all"); setLevel("all"); setProvince("all"); }}
                  style={{ marginTop: 12, fontSize: 13, color: C.teal, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16, marginBottom: 64 }}>
            {filtered.map(job => {
              const applyUrl = job.apply_url || job.url || "#";
              const fresh    = isFresh(job.posted_at);
              const prep     = (job.prep_links ?? []).filter(p => p.label !== "Career Suite").slice(0, 2);
              const prov     = extractProvince(job.location);
              const why      = whyThisMatters(job.prep_links ?? []);

              return (
                <div key={job.id}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", transition: "border-color 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;      e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Row 1: company + freshness */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={12} style={{ color: C.text4, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>{job.company ?? "Unknown company"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {fresh && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, borderRadius: 20, padding: "2px 8px", letterSpacing: "0.04em" }}>NEW</span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text4 }}>
                        <Clock size={11} />{daysAgo(job.posted_at)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: title */}
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 8, lineHeight: 1.35 }}>
                    {job.title}
                  </h2>

                  {/* Row 3: location + tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
                    {job.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text3 }}>
                        <MapPin size={11} style={{ color: C.text4 }} />
                        {prov || job.location}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: WORK_TYPE_COLORS[job.work_type] ?? C.text3, border: `1px solid rgba(255,255,255,0.06)` }}>
                      {WORK_TYPE_LABELS[job.work_type]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: C.text3, border: "1px solid rgba(255,255,255,0.06)" }}>
                      {LEVEL_LABELS[job.level] ?? job.level}
                    </span>
                  </div>

                  {/* Row 4: why this matters */}
                  {why && (
                    <div style={{ fontSize: 12, color: C.teal, fontFamily: "monospace", marginBottom: 10, opacity: 0.85 }}>
                      // {why}
                    </div>
                  )}

                  {/* Row 5: description preview */}
                  {job.description && (
                    <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.6, marginBottom: 14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {job.description.slice(0, 200)}
                    </p>
                  )}

                  {/* Row 6: prep chips + CTAs */}
                  <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {prep.map((p, i) => (
                          <button key={i} onClick={() => handlePractice(job)}
                            style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: C.tealSoft, color: C.teal, border: `1px solid ${C.tealBorder}`, cursor: "pointer" }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Practice — secondary, visible */}
                        <button onClick={() => handlePractice(job)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: C.text2, background: "transparent", padding: "7px 13px", borderRadius: 8, border: `1px solid ${C.border}`, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.12s, border-color 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text1; (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderHover; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text2; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}>
                          Practice this role
                        </button>
                        {/* Apply — primary, always direct */}
                        <a href={applyUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => setAppliedJobs(prev => new Set(prev).add(job.id))}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "8px 16px", borderRadius: 9, textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.12s" }}
                          onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = "#17a888")}
                          onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = C.teal)}>
                          Apply <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    {/* Post-apply nudge — shown after Apply is clicked */}
                    {appliedJobs.has(job.id) ? (
                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => handlePractice(job)}
                          style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer", padding: 0, display: "block", textAlign: "left" }}>
                          Got the interview? Practice this role in 5 minutes →
                        </button>
                        <span style={{ fontSize: 11, color: C.text4, display: "block", marginTop: 2 }}>
                          Don&apos;t walk in guessing.
                        </span>
                      </div>
                    ) : (
                      <p style={{ marginTop: 10, fontSize: 11, color: C.text4, fontStyle: "italic" }}>
                        Interview coming? Practice this role
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA — logged-out users */}
        {!isLoggedIn && filtered.length > 0 && (
          <div style={{ marginBottom: 64, padding: "48px 40px", borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.teal}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: C.tealSoft, filter: "blur(60px)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: "monospace" }}>
                // more than a job board
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 10, letterSpacing: "-0.02em" }}>
                Apply today. Practice before the interview.
              </h3>
              <p style={{ fontSize: 14, color: C.text3, marginBottom: 28, maxWidth: 460, lineHeight: 1.65 }}>
                Scenarios, stakeholder simulations, and real BA deliverables — so you walk in ready.
              </p>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Start free — no credit card needed
              </Link>
            </div>
          </div>
        )}
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px", textAlign: "center", background: C.surface, marginTop: 16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: "12px", color: C.text4, textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>

      {/* ── Practice modal ── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "#18181b", border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setModal(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text4, padding: 4 }}>
              <X size={18} />
            </button>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: "monospace" }}>
              // simulation mode
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Interview coming up?
            </h2>
            <p style={{ fontSize: 14, color: C.text3, marginBottom: 6, lineHeight: 1.6 }}>
              Run a real BA simulation and see how you&apos;d perform before the interview.
            </p>
            <div style={{ fontSize: 13, color: C.text4, marginBottom: 28, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontStyle: "italic" }}>
              {modal.jobTitle}{modal.company ? ` · ${modal.company}` : ""}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/signup"
                style={{ display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.01em" }}>
                Start free simulation
              </Link>
              <Link href="/login"
                style={{ display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 12, background: "transparent", color: C.text2, fontSize: 14, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.border}` }}>
                Sign in
              </Link>
            </div>

            <p style={{ fontSize: 12, color: C.text4, textAlign: "center", marginTop: 18 }}>
              Free to start. No credit card required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
