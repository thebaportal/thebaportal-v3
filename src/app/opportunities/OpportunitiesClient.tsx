"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Building2, Clock, ExternalLink, Search, Briefcase, RefreshCw, AlertTriangle } from "lucide-react";

interface PrepLink { label: string; href: string }

interface JobListing {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  url: string;
  posted_at: string;
  work_type: "remote" | "hybrid" | "onsite";
  level: "entry" | "junior" | "mid" | "senior";
  quality_score: number;
  prep_links: PrepLink[] | null;
}

interface Props {
  initialJobs: JobListing[];
  isLoggedIn: boolean;
  syncError?: string;
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const LEVEL_LABELS: Record<string, string>     = { entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior" };
const WORK_TYPE_BG:   Record<string, string>   = { remote: "rgba(31,191,159,0.12)", hybrid: "rgba(139,92,246,0.12)", onsite: "rgba(59,130,246,0.12)" };
const WORK_TYPE_TEXT: Record<string, string>   = { remote: "#1fbf9f", hybrid: "#a78bfa", onsite: "#60a5fa" };

export default function OpportunitiesClient({ initialJobs, isLoggedIn, syncError }: Props) {
  const router = useRouter();
  const [keyword, setKeyword]     = useState("");
  const [workType, setWorkType]   = useState<string>("all");
  const [level, setLevel]         = useState<string>("all");
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState<string | null>(null);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/jobs/sync");
      const data = await res.json();
      if (!res.ok || data.error) {
        setSyncMsg(`Sync failed: ${data.error ?? "unknown error"}`);
      } else if (data.skipped) {
        setSyncMsg(`Already synced ${data.minsAgo} minutes ago — refresh the page to see latest listings.`);
      } else {
        setSyncMsg(`Sync complete — ${data.upserted} jobs loaded. Refreshing...`);
        setTimeout(() => router.refresh(), 1200);
      }
    } catch (e) {
      setSyncMsg(`Sync failed: ${String(e)}`);
    } finally {
      setSyncing(false);
    }
  }, [router]);

  const filtered = useMemo(() => initialJobs.filter(job => {
    if (workType !== "all" && job.work_type !== workType) return false;
    if (level    !== "all" && job.level     !== level)    return false;
    if (keyword) {
      const k = keyword.toLowerCase();
      if (
        !job.title.toLowerCase().includes(k) &&
        !(job.company  ?? "").toLowerCase().includes(k) &&
        !(job.location ?? "").toLowerCase().includes(k)
      ) return false;
    }
    return true;
  }), [initialJobs, keyword, workType, level]);

  return (
    <div style={{ background: "#07070a", color: "#f2f2f8", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 28px", background: "rgba(7,7,10,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 800, color: "#f2f2f8", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#1fbf9f" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "#041a13", background: "#1fbf9f", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login"  style={{ fontSize: 13, color: "#505068", textDecoration: "none" }}>Sign in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: "#041a13", background: "#1fbf9f", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "108px 28px 0" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#1fbf9f", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Live Job Board</div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f2f2f8", lineHeight: 1.05, marginBottom: 16 }}>
            Business Analyst Jobs in Canada
          </h1>
          <p style={{ fontSize: 16, color: "#9090a8", lineHeight: 1.68, maxWidth: 520, marginBottom: 0 }}>
            Fresh listings refreshed every 2 hours from across Canada. Find your next role, then use TheBAPortal to get ready for it.
          </p>
          {syncError && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#f87171", fontFamily: "monospace", padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
              <AlertTriangle size={13} /> Sync error: {syncError}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", maxWidth: 480 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#505068", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search by title, company, or city…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f2f2f8", fontSize: 14, fontFamily: "'Open Sans',sans-serif", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#505068", fontFamily: "monospace", marginRight: 4 }}>Type:</span>
            {(["all", "remote", "hybrid", "onsite"] as const).map(t => (
              <button key={t} onClick={() => setWorkType(t)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 600, cursor: "pointer", border: "none", background: workType === t ? "#1fbf9f" : "rgba(255,255,255,0.06)", color: workType === t ? "#041a13" : "#9090a8", transition: "all 0.15s" }}>
                {t === "all" ? "All" : WORK_TYPE_LABELS[t]}
              </button>
            ))}
            <span style={{ fontSize: 12, color: "#505068", fontFamily: "monospace", marginLeft: 12, marginRight: 4 }}>Level:</span>
            {(["all", "entry", "mid", "senior"] as const).map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 13, fontFamily: "'Inter',sans-serif", fontWeight: 600, cursor: "pointer", border: "none", background: level === l ? "#1fbf9f" : "rgba(255,255,255,0.06)", color: level === l ? "#041a13" : "#9090a8", transition: "all 0.15s" }}>
                {l === "all" ? "All" : LEVEL_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#505068" }}>
            {filtered.length} role{filtered.length !== 1 ? "s" : ""} found
          </span>
        </div>

        {/* Sync status message */}
        {syncMsg && (
          <div style={{ marginBottom: 16, fontSize: 13, color: syncMsg.includes("failed") ? "#f87171" : "#1fbf9f", fontFamily: "monospace", padding: "10px 14px", borderRadius: 8, background: syncMsg.includes("failed") ? "rgba(248,113,113,0.06)" : "rgba(31,191,159,0.06)", border: `1px solid ${syncMsg.includes("failed") ? "rgba(248,113,113,0.15)" : "rgba(31,191,159,0.15)"}` }}>
            {syncMsg}
          </div>
        )}

        {/* Job cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#505068" }}>
            <Briefcase size={32} style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }} />
            {initialJobs.length === 0 ? (
              // Table is genuinely empty
              <>
                <p style={{ fontSize: 15, marginBottom: 8 }}>
                  {syncError ? "Sync failed — jobs could not be loaded." : "No jobs loaded yet."}
                </p>
                <p style={{ fontSize: 13, color: "#3a3a50", marginBottom: 20 }}>
                  {syncError
                    ? "Check that all four env vars are set in Netlify (ADZUNA_APP_ID, ADZUNA_APP_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET)."
                    : "The job board syncs every 2 hours. You can trigger it manually now."}
                </p>
                <button
                  onClick={triggerSync}
                  disabled={syncing}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", background: "rgba(31,191,159,0.1)", color: "#1fbf9f", border: "1px solid rgba(31,191,159,0.2)", fontFamily: "'Inter',sans-serif", opacity: syncing ? 0.6 : 1 }}
                >
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "Syncing…" : "Sync jobs now"}
                </button>
              </>
            ) : (
              // Jobs exist but filters show nothing
              <>
                <p style={{ fontSize: 15 }}>No jobs match your filters.</p>
                <button onClick={() => { setKeyword(""); setWorkType("all"); setLevel("all"); }} style={{ marginTop: 12, fontSize: 13, color: "#1fbf9f", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 64 }}>
            {filtered.map(job => {
              const salary = formatSalary(job.salary_min, job.salary_max);
              const prep   = job.prep_links ?? [];
              return (
                <div
                  key={job.id}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 28px", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(31,191,159,0.25)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: "#f2f2f8", marginBottom: 6, lineHeight: 1.3 }}>{job.title}</h2>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        {job.company && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#9090a8" }}>
                            <Building2 size={12} style={{ color: "#505068" }} />{job.company}
                          </span>
                        )}
                        {job.location && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#9090a8" }}>
                            <MapPin size={12} style={{ color: "#505068" }} />{job.location}
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#505068" }}>
                          <Clock size={11} style={{ color: "#505068" }} />{daysAgo(job.posted_at)}
                        </span>
                      </div>
                    </div>
                    {salary && (
                      <div style={{ flexShrink: 0, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "#1fbf9f", whiteSpace: "nowrap" }}>{salary}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", padding: "3px 10px", borderRadius: 20, background: WORK_TYPE_BG[job.work_type], color: WORK_TYPE_TEXT[job.work_type] }}>
                      {WORK_TYPE_LABELS[job.work_type]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#9090a8" }}>
                      {LEVEL_LABELS[job.level] ?? job.level}
                    </span>
                  </div>

                  {job.description && (
                    <p style={{ fontSize: 13, color: "#505068", lineHeight: 1.6, marginBottom: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {job.description.replace(/<[^>]+>/g, "").slice(0, 260)}
                    </p>
                  )}

                  {prep.length > 0 && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, marginBottom: 16 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "#505068", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recommended prep</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {prep.map((p, i) => (
                          <Link
                            key={i}
                            href={p.href}
                            style={{ fontSize: 12, fontFamily: "'Inter',sans-serif", fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: "rgba(31,191,159,0.08)", color: "#1fbf9f", textDecoration: "none", border: "1px solid rgba(31,191,159,0.18)", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(31,191,159,0.16)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(31,191,159,0.08)")}
                          >
                            {p.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#f2f2f8", background: "rgba(255,255,255,0.07)", padding: "8px 18px", borderRadius: 10, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'Inter',sans-serif", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  >
                    View and Apply <ExternalLink size={12} />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {!isLoggedIn && filtered.length > 0 && (
          <div style={{ marginBottom: 64, padding: "40px", borderRadius: 20, background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.12)", textAlign: "center" }}>
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 20, fontWeight: 800, color: "#f2f2f8", marginBottom: 10 }}>
              Get ready for your next BA role
            </h3>
            <p style={{ fontSize: 14, color: "#9090a8", marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              Practice stakeholder interviews, write real deliverables, and prep for interviews — all in one place.
            </p>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: "#1fbf9f", color: "#041a13", fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>
              Start practicing free
            </Link>
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#2a2a38", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
