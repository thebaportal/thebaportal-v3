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
  description: string | null;
  apply_url: string | null;
  url: string | null;         // fallback for legacy rows
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

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function isFresh(dateStr: string): boolean {
  const days = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  return days <= 3;
}

function extractProvince(location: string | null): string {
  if (!location) return "";
  const remote = /\bremote\b/i.test(location);
  if (remote) return "Remote";
  const m = location.match(/\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT)\b/);
  return m ? m[1] : "";
}

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const WORK_TYPE_COLOR:  Record<string, string> = {
  remote:  "#059669",
  hybrid:  "#7c3aed",
  onsite:  "#2563eb",
};
const LEVEL_LABELS: Record<string, string> = { entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior" };

const PROVINCES = ["ON", "BC", "AB", "QC", "MB", "SK", "NS", "Remote"];

export default function OpportunitiesClient({ initialJobs, isLoggedIn, syncError }: Props) {
  const router = useRouter();
  const [keyword,  setKeyword]  = useState("");
  const [workType, setWorkType] = useState<string>("all");
  const [level,    setLevel]    = useState<string>("all");
  const [province, setProvince] = useState<string>("all");
  const [syncing,  setSyncing]  = useState(false);
  const [syncMsg,  setSyncMsg]  = useState<string | null>(null);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/jobs/sync");
      const data = await res.json();
      if (!res.ok || data.error) {
        setSyncMsg(`Sync failed: ${data.error ?? "unknown error"}`);
      } else if (data.skipped) {
        setSyncMsg(`Already synced ${data.minsAgo} minutes ago. Refresh to see latest.`);
      } else {
        setSyncMsg(`Sync complete. ${data.upserted} jobs loaded. Refreshing...`);
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
    if (province !== "all") {
      const p = extractProvince(job.location);
      if (p !== province) return false;
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      if (
        !job.title.toLowerCase().includes(k) &&
        !(job.company  ?? "").toLowerCase().includes(k) &&
        !(job.location ?? "").toLowerCase().includes(k)
      ) return false;
    }
    return true;
  }), [initialJobs, keyword, workType, level, province]);

  return (
    <div style={{ background: "#f7f8fc", minHeight: "100vh", fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Nav */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "#ebfdf7", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#059669", fontFamily: "monospace" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "#1fbf9f", padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login"  style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>Sign in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "#1fbf9f", padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "82px 24px 0" }}>

        {/* Hero */}
        <div style={{ marginBottom: 40, paddingTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1fbf9f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>
            Curated BA Jobs
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1.1, marginBottom: 12 }}>
            Business Analyst Jobs in Canada
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.65, maxWidth: 540 }}>
            Curated BA roles sourced directly from employer ATS platforms. Every listing links straight to the application. No aggregator redirects.
          </p>
          {syncError && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#dc2626", padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <AlertTriangle size={13} /> Sync error: {syncError}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 12, background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", maxWidth: 440 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search title, company, or city…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, color: "#0f172a", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</span>
            {(["all", "remote", "hybrid", "onsite"] as const).map(t => (
              <button key={t} onClick={() => setWorkType(t)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: workType === t ? "#1fbf9f" : "transparent", color: workType === t ? "#fff" : "#64748b", borderColor: workType === t ? "#1fbf9f" : "#e2e8f0", transition: "all 0.12s" }}>
                {t === "all" ? "All" : WORK_TYPE_LABELS[t]}
              </button>
            ))}
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginLeft: 10, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Level</span>
            {(["all", "entry", "mid", "senior"] as const).map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: level === l ? "#1fbf9f" : "transparent", color: level === l ? "#fff" : "#64748b", borderColor: level === l ? "#1fbf9f" : "#e2e8f0", transition: "all 0.12s" }}>
                {l === "all" ? "All" : LEVEL_LABELS[l]}
              </button>
            ))}
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginLeft: 10, marginRight: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Province</span>
            {(["all", ...PROVINCES] as const).map(p => (
              <button key={p} onClick={() => setProvince(p)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", background: province === p ? "#1fbf9f" : "transparent", color: province === p ? "#fff" : "#64748b", borderColor: province === p ? "#1fbf9f" : "#e2e8f0", transition: "all 0.12s" }}>
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            {filtered.length} role{filtered.length !== 1 ? "s" : ""}
          </span>
          {syncMsg && (
            <span style={{ fontSize: 12, color: syncMsg.includes("failed") ? "#dc2626" : "#059669", fontFamily: "monospace" }}>
              {syncMsg}
            </span>
          )}
        </div>

        {/* Job cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center", color: "#94a3b8" }}>
            <Briefcase size={36} style={{ margin: "0 auto 16px", display: "block", opacity: 0.3 }} />
            {initialJobs.length === 0 ? (
              <>
                <p style={{ fontSize: 15, marginBottom: 8, color: "#475569" }}>
                  {syncError ? "Sync failed — jobs could not be loaded." : "No jobs loaded yet."}
                </p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                  {syncError
                    ? "Check that SUPABASE_SERVICE_ROLE_KEY is set in Vercel."
                    : "Pull in the latest listings now."}
                </p>
                <button
                  onClick={triggerSync}
                  disabled={syncing}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", background: "#f0fdf9", color: "#059669", border: "1px solid #a7f3d0", opacity: syncing ? 0.6 : 1 }}
                >
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "Syncing…" : "Sync jobs now"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, color: "#475569" }}>No jobs match your filters.</p>
                <button onClick={() => { setKeyword(""); setWorkType("all"); setLevel("all"); setProvince("all"); }} style={{ marginTop: 12, fontSize: 13, color: "#1fbf9f", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 16, marginBottom: 64 }}>
            {filtered.map(job => {
              const applyUrl  = job.apply_url || job.url || "#";
              const fresh     = isFresh(job.posted_at);
              const prep      = (job.prep_links ?? []).slice(0, 2);
              const province  = extractProvince(job.location);

              return (
                <div
                  key={job.id}
                  style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 0, transition: "box-shadow 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  {/* Row 1: company + freshness */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{job.company ?? "Unknown company"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {fresh && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "2px 8px", letterSpacing: "0.04em" }}>NEW</span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8" }}>
                        <Clock size={11} />{daysAgo(job.posted_at)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: title */}
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6, lineHeight: 1.35 }}>
                    {job.title}
                  </h2>

                  {/* Row 3: location + tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
                    {job.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                        <MapPin size={11} style={{ color: "#94a3b8" }} />
                        {province ? `${province}` : job.location}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "#f1f5f9", color: WORK_TYPE_COLOR[job.work_type] ?? "#64748b" }}>
                      {WORK_TYPE_LABELS[job.work_type]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "#f1f5f9", color: "#64748b" }}>
                      {LEVEL_LABELS[job.level] ?? job.level}
                    </span>
                  </div>

                  {/* Row 4: description preview */}
                  {job.description && (
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flexShrink: 0 }}>
                      {job.description.slice(0, 200)}
                    </p>
                  )}

                  {/* Row 5: prep + CTA */}
                  <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {prep.map((p, i) => (
                        <Link
                          key={i}
                          href={p.href}
                          style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#f0fdf9", color: "#059669", textDecoration: "none", border: "1px solid #a7f3d0" }}
                        >
                          {p.label}
                        </Link>
                      ))}
                    </div>
                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#fff", background: "#1fbf9f", padding: "8px 16px", borderRadius: 9, textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#17a888")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#1fbf9f")}
                    >
                      Apply directly <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA for logged-out users */}
        {!isLoggedIn && filtered.length > 0 && (
          <div style={{ marginBottom: 64, padding: "40px 32px", borderRadius: 20, background: "#f0fdf9", border: "1px solid #a7f3d0", textAlign: "center" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
              Get ready for your next BA role
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Practice stakeholder interviews, write real deliverables, and prep for your interviews — all in one place.
            </p>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: "#1fbf9f", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Start practicing free
            </Link>
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center", background: "#fff", marginTop: 16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#94a3b8", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
