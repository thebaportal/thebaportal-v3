"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Award } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import type { ChallengeAttempt, UserProgress } from "@/lib/progress";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  attempts:  ChallengeAttempt[];
  progress:  UserProgress;
  skills:    { elicitation: number; requirements: number; solutionAnalysis: number; stakeholderMgmt: number };
  levelInfo: { level: string; nextLevel: string; progressPct: number; challengesNeeded: number };
  badges:    { badge_id: string }[];
}

interface DashboardClientProps {
  profile:        { full_name: string | null; subscription_tier: string | null } | null;
  user:           { email: string };
  upgradeSuccess?: boolean;
  emailConfirmed?: boolean;
  stats:          Stats;
}

interface JobContext { title: string; company: string; source: "practice" | "interview" | "pitch" }

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return "#1fbf9f";
  if (s >= 60) return "#eab308";
  return "#ef4444";
}

function avgOf(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

const DIM_LABELS: Record<string, string> = {
  pf: "Problem Framing",
  rc: "Root Cause",
  eu: "Evidence Use",
  rq: "Recommendation",
};

function buildDimStats(attempts: ChallengeAttempt[]) {
  const r = attempts.slice(0, 5);
  return [
    { key: "pf", color: "#38bdf8", avg: avgOf(r.map(a => a.score_problem_framing)),  weak: "You tend to jump to solutions before the problem is fully understood.",         strong: "Your strongest move is framing the problem clearly before diving in."       },
    { key: "rc", color: "#a78bfa", avg: avgOf(r.map(a => a.score_root_cause)),        weak: "You accept the first explanation too quickly — probe deeper.",                  strong: "You consistently dig past surface symptoms to find the real root cause."   },
    { key: "eu", color: "#fb923c", avg: avgOf(r.map(a => a.score_evidence_use)),      weak: "You tend to under-use the evidence from your stakeholder conversations.",       strong: "You effectively tie stakeholder evidence to your recommendations."          },
    { key: "rq", color: "#1fbf9f", avg: avgOf(r.map(a => a.score_recommendation)),    weak: "Your recommendations often lack the specificity needed in a real BA setting.",  strong: "Your recommendations are consistently clear, specific, and actionable."     },
  ];
}

function deltaLabel(delta: number): string {
  if (delta > 10) return "Strong improvement. Keep that momentum.";
  if (delta > 0)  return "Moving in the right direction. Push deeper next time.";
  if (delta === 0) return "Consistent. Push for more depth on your next attempt.";
  return "A dip — that happens. Look at where you dropped and focus there.";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardClient({ profile, user, upgradeSuccess, emailConfirmed, stats }: DashboardClientProps) {
  const router    = useRouter();
  const [isPro,   setIsPro]   = useState(
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise"
  );
  const [jobCtx,  setJobCtx]  = useState<JobContext | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const { attempts, progress } = stats;

  // ── Stripe upgrade verification ────────────────────────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const upgrade   = params.get("upgrade");
    const sessionId = params.get("session_id");
    if (upgrade !== "success" || !sessionId) return;
    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(res => res.json())
      .then(data => { if (data.success) { setIsPro(true); window.history.replaceState({}, "", "/dashboard"); } })
      .catch(() => {});
  }, []);

  // ── Job context (from localStorage, written by job action buttons) ──────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dashboardJobContext");
      if (raw) setJobCtx(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const n          = attempts.length;
  const lastAttempt = attempts[0] ?? null;
  const prevAttempt = attempts[1] ?? null;
  const scoreDelta  = lastAttempt && prevAttempt ? lastAttempt.total_score - prevAttempt.total_score : null;

  const dimStats   = n >= 2 ? buildDimStats(attempts) : [];
  const sorted     = [...dimStats].sort((a, b) => a.avg - b.avg);
  const weakest    = sorted[0] ?? null;
  const strongest  = sorted[sorted.length - 1] ?? null;

  const isLastInterview = lastAttempt?.attempt_type === "interview" || lastAttempt?.challenge_type === "interview";

  // ── Next action ────────────────────────────────────────────────────────────
  const nextAction = (() => {
    if (n === 0) return { label: "Start your first simulation", href: "/scenarios", sub: "Simulation Lab" };
    if (isLastInterview) return { label: "Run another interview", href: "/interview/session", sub: "Interview Lab" };
    return { label: `Retry: ${lastAttempt?.challenge_title ?? "last challenge"}`, href: `/scenarios/${lastAttempt?.challenge_id}`, sub: "Simulation Lab" };
  })();

  const secondaryAction = (() => {
    if (n === 0) return { label: "Try Interview Lab", href: "/interview" };
    if (isLastInterview) return { label: "Practice a simulation", href: "/scenarios" };
    return { label: "Run an interview", href: "/interview" };
  })();

  // ── Focus copy ─────────────────────────────────────────────────────────────
  const focusLine = (() => {
    if (jobCtx) return null; // handled separately
    if (n === 0) return "Complete your first simulation to see where you stand.";
    if (weakest) return weakest.weak;
    return "Keep practicing to see patterns in your performance.";
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      <AppSidebar
        activeHref="/dashboard"
        profile={isPro && profile ? { ...profile, subscription_tier: "pro" } : profile}
        user={user}
      />

      <main style={{ flex: 1, overflowY: "auto" }}>

        {/* Header */}
        <header style={{
          padding: "0 32px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(9,9,11,0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 20, color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 3, fontFamily: "monospace" }}>
              Good to see you, {firstName}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPro
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--teal)", background: "var(--teal-soft)", border: "1px solid var(--teal-border)", borderRadius: 20, padding: "5px 12px" }}>
                  <Award size={12} /> Pro
                </span>
              : <button onClick={() => router.push("/pricing")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer" }}>
                  <Zap size={13} /> Upgrade
                </button>
            }
          </div>
        </header>

        <div style={{ padding: "32px 32px 80px", maxWidth: 820, margin: "0 auto" }}>

          {/* Alerts */}
          {emailConfirmed && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "14px 20px", borderRadius: 12, marginBottom: 20, background: "rgba(31,191,159,0.08)", border: "1px solid rgba(31,191,159,0.25)", fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>
              Email confirmed. You are all set.
            </motion.div>
          )}
          {upgradeSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: "14px 20px", borderRadius: 12, marginBottom: 20, background: "rgba(31,191,159,0.08)", border: "1px solid rgba(31,191,159,0.25)", fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>
              Welcome to Pro — all challenges and features are now unlocked.
            </motion.div>
          )}

          {/* ── 1. CURRENT FOCUS ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {jobCtx ? (
              <div style={{
                padding: "24px 28px", borderRadius: 16, marginBottom: 20,
                background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.22)",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>
                    Preparing for
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em", marginBottom: 4 }}>
                    {jobCtx.title}
                    {jobCtx.company && <span style={{ color: "var(--text-3)", fontWeight: 500 }}> — {jobCtx.company}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "monospace" }}>
                    From selected job
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  <button onClick={() => router.push("/scenarios")} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: "rgba(31,191,159,0.1)", color: "var(--teal)", border: "1px solid rgba(31,191,159,0.25)", cursor: "pointer" }}>
                    Practice
                  </button>
                  <button onClick={() => router.push("/interview/session")} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "var(--text-2)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    Interview
                  </button>
                  <button onClick={() => { try { localStorage.removeItem("dashboardJobContext"); } catch {} setJobCtx(null); }} style={{ padding: "9px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: "transparent", color: "var(--text-4)", border: "1px solid transparent", cursor: "pointer" }}>
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "22px 28px", borderRadius: 16, marginBottom: 20,
                background: "var(--card)", border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>
                  Your current focus
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
                  {focusLine}
                </p>
                {n === 0 && (
                  <button onClick={() => router.push("/opportunities")} style={{ fontSize: 12, fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Or browse jobs to prepare for a specific role →
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* ── 2. PROGRESS SNAPSHOT + NEXT ACTION ───────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.35 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Progress snapshot */}
            <div style={{ padding: "24px 26px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 16 }}>
                Progress
              </div>
              {n === 0 ? (
                <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                  No attempts yet. Your scores will appear here after your first simulation.
                </p>
              ) : n === 1 ? (
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 48, fontWeight: 900, color: scoreColor(lastAttempt!.total_score), letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {lastAttempt!.total_score}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-4)", fontFamily: "monospace" }}>/100</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
                    First attempt. Run another to start seeing your trajectory.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text-3)", letterSpacing: "-0.03em" }}>
                      {prevAttempt!.total_score}
                    </span>
                    <ArrowRight size={16} style={{ color: "var(--text-4)", flexShrink: 0 }} />
                    <span style={{ fontSize: 42, fontWeight: 900, color: scoreColor(lastAttempt!.total_score), letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {lastAttempt!.total_score}
                    </span>
                    {scoreDelta !== null && (
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: scoreDelta > 0 ? "#1fbf9f" : scoreDelta < 0 ? "#ef4444" : "var(--text-4)",
                        fontFamily: "monospace",
                      }}>
                        {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, lineHeight: 1.6 }}>
                    {scoreDelta !== null ? deltaLabel(scoreDelta) : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Next action */}
            <div style={{
              padding: "24px 26px", borderRadius: 16,
              background: "rgba(31,191,159,0.05)", border: "1px solid rgba(31,191,159,0.2)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>
                Next
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", marginBottom: 4, lineHeight: 1.4 }}>
                  {nextAction.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "monospace", marginBottom: 20 }}>
                  {nextAction.sub}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => router.push(nextAction.href)}
                  style={{
                    padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  Go now <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => router.push(secondaryAction.href)}
                  style={{
                    padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: "transparent", color: "var(--text-3)", border: "1px solid rgba(31,191,159,0.2)", cursor: "pointer",
                  }}
                >
                  {secondaryAction.label}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── 3. PATTERN INSIGHTS (2+ attempts) ────────────────────────── */}
          {n >= 2 && dimStats.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.35 }}
              style={{ padding: "22px 26px", borderRadius: 16, marginBottom: 20, background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 16 }}>
                What the data shows
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {weakest && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb923c", flexShrink: 0, marginTop: 6 }} />
                    <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{weakest.weak}</p>
                  </div>
                )}
                {strongest && strongest.avg >= (weakest?.avg ?? 0) + 3 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1fbf9f", flexShrink: 0, marginTop: 6 }} />
                    <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{strongest.strong}</p>
                  </div>
                )}
              </div>

              {/* Dimension bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {dimStats.map(d => {
                  const isWk = d.key === weakest?.key;
                  const isSt = d.key === strongest?.key;
                  return (
                    <div key={d.key} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: isWk ? "1px solid rgba(251,146,60,0.25)" : isSt ? "1px solid rgba(31,191,159,0.25)" : "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{DIM_LABELS[d.key]}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(d.avg * 4), fontFamily: "monospace" }}>
                          {d.avg}<span style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 400 }}>/25</span>
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(d.avg / 25) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                          style={{ height: "100%", borderRadius: 99, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace", marginTop: 12 }}>
                Based on your last {Math.min(n, 5)} simulation{Math.min(n, 5) !== 1 ? "s" : ""}
              </div>
            </motion.div>
          )}

          {/* ── 4. RECENT ACTIVITY ───────────────────────────────────────── */}
          {n > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}
              style={{ padding: "22px 26px", borderRadius: 16, marginBottom: 20, background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>
                  Recent Activity
                </div>
                <button onClick={() => router.push("/progress")} style={{ fontSize: 12, fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
                  View all →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attempts.slice(0, 3).map(a => {
                  const isIntv = a.attempt_type === "interview" || a.challenge_type === "interview";
                  const daysAgo = Math.floor((Date.now() - new Date(a.completed_at).getTime()) / 86400000);
                  const when = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                  return (
                    <div key={a.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
                      cursor: isIntv ? "default" : "pointer",
                    }}
                    onClick={() => !isIntv && router.push(`/scenarios/${a.challenge_id}`)}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                          {a.challenge_title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>
                          {isIntv ? "Interview" : "Simulation"} · {when}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(a.total_score), letterSpacing: "-0.02em", flexShrink: 0, marginLeft: 12 }}>
                        {a.total_score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── 5. QUICK LINKS ───────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.35 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>
              Jump In
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Simulation Lab",  sub: "Practice the job",         href: "/scenarios",        color: "#38bdf8" },
                { label: "Interview Lab",    sub: "Practice getting the job",  href: "/interview",        color: "#1fbf9f" },
                { label: "Opportunities",    sub: "Browse BA jobs",            href: "/opportunities",    color: "#a78bfa" },
              ].map(item => (
                <button key={item.href} onClick={() => router.push(item.href)}
                  style={{
                    padding: "18px 20px", borderRadius: 14, textAlign: "left",
                    background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${item.color}30`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace" }}>{item.sub}</div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Pro upsell */}
          {!isPro && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
              style={{ marginTop: 20, padding: "22px 26px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(ellipse, rgba(31,191,159,0.07) 0%, transparent 70%)", transform: "translate(20%, -20%)", pointerEvents: "none" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>Unlock Pro</div>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14, lineHeight: 1.6 }}>
                All challenges, Expert mode, full AI evaluation.
              </p>
              <button onClick={() => router.push("/pricing")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer" }}>
                <Zap size={13} /> Upgrade
              </button>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
