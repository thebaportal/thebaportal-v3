"use client";

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function scoreColor(s: number): string {
  if (s >= 80) return "#1fbf9f";
  if (s >= 60) return "#eab308";
  return "#ef4444";
}

function avgOf(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// ── Arrow icon ────────────────────────────────────────────────────────────────
function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardClient({ profile, user, upgradeSuccess, emailConfirmed, stats }: DashboardClientProps) {
  const router  = useRouter();
  const [isPro, setIsPro] = useState(
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise"
  );
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const firstName   = profile?.full_name?.split(" ")[0] || "there";
  const { attempts, skills, levelInfo } = stats;
  const lastAttempt = attempts[0] ?? null;
  const n = attempts.length;

  // Stripe upgrade verification
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
      .then(data => {
        if (data.success) {
          setIsPro(true);
          setShowUpgradeBanner(true);
          window.history.replaceState({}, "", "/dashboard");
        }
      })
      .catch(() => {});
  }, []);

  // Email confirmed banner
  useEffect(() => {
    if (emailConfirmed) {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [emailConfirmed]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/dashboard" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>

        {/* Upgrade success banner */}
        {showUpgradeBanner && (
          <div style={{ marginBottom: 24, padding: "14px 20px", background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.22)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>You are now on Pro. All tools are unlocked.</span>
            </div>
            <button onClick={() => setShowUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Email confirmed banner */}
        {emailConfirmed && (
          <div style={{ marginBottom: 24, padding: "14px 20px", background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.18)", borderRadius: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#38bdf8" }}>Your email is confirmed. Welcome to The BA Portal.</span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em" }}>
              {greeting()}, {firstName}.
            </h1>
            {isPro && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", color: "var(--teal)", letterSpacing: ".05em" }}>
                PRO
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: "var(--t3)" }}>
            {n === 0 ? "Your workspace is ready. Pick a tool to get started." : `Welcome back. You have completed ${n} practice session${n !== 1 ? "s" : ""}.`}
          </p>
        </div>

        {/* Primary — Workspace tools */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>BA Workspace</h2>
            <Link href="/workspace" style={{ fontSize: 13, color: "var(--teal)", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              Open workspace <Arrow size={12} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Problem Analyzer",      sub: "Enter a problem, get a full analysis",    href: "/workspace", color: "#1fbf9f", icon: "⚡" },
              { label: "Requirements Analyzer", sub: "Paste notes, extract requirements",        href: "/workspace", color: "#34d399", icon: "✓" },
              { label: "User Story Generator",  sub: "Requirements to stories with ACs",         href: "/workspace", color: "#a78bfa", icon: "✍" },
              { label: "Document Generator",    sub: "BRD, FRD, or Use Cases",                  href: "/workspace", color: "#fb923c", icon: "📄" },
            ].map(tool => (
              <button key={tool.label} onClick={() => router.push(tool.href)}
                style={{ padding: "18px 16px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s, transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${tool.color}35`; e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-1)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ fontSize: 20, marginBottom: 10 }}>{tool.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{tool.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--t3)", lineHeight: 1.5 }}>{tool.sub}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Two column — Career + Practice */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>

          {/* Career Hub */}
          <section style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Career Hub</h2>
              <Link href="/career" style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 500 }}>Open</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Resume Analyzer",    sub: "ATS score + rewrite recommendations",    href: "/workspace/resumes", color: "#38bdf8" },
                { label: "Job Match Analyzer", sub: "Resume vs job description scoring",       href: "/workspace/jobs",    color: "#34d399" },
                { label: "Interview Copilot",  sub: "STAR responses + scenario questions",     href: "/interview",         color: "#a78bfa" },
                { label: "Career Suite",       sub: "Full career planning and positioning",    href: "/career",            color: "#fb923c" },
              ].map(item => (
                <button key={item.label} onClick={() => router.push(item.href)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "border-color .15s, background .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}30`; e.currentTarget.style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "none"; }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{item.sub}</div>
                  </div>
                  <Arrow size={12} />
                </button>
              ))}
            </div>
          </section>

          {/* Practice stats */}
          <section style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Practice Performance</h2>
              <Link href="/scenarios" style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 500 }}>Practice Lab</Link>
            </div>

            {n === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13.5, color: "var(--t3)", lineHeight: 1.6, marginBottom: 16 }}>
                  No practice sessions yet. Run a simulation to see your skill scores here.
                </p>
                <button onClick={() => router.push("/scenarios")}
                  style={{ padding: "10px 20px", background: "var(--teal)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#041a13" }}>
                  Start a simulation
                </button>
              </div>
            ) : (
              <>
                {/* Level badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)" }}>
                    {levelInfo.level.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{levelInfo.level}</div>
                    <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${levelInfo.progressPct}%`, borderRadius: 99, background: "var(--teal)", transition: "width .6s ease" }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>→ {levelInfo.nextLevel}</div>
                </div>

                {/* Skill scores */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Elicitation",       val: skills.elicitation,     color: "#38bdf8" },
                    { label: "Requirements",       val: skills.requirements,    color: "#a78bfa" },
                    { label: "Solution Analysis",  val: skills.solutionAnalysis,color: "#fb923c" },
                    { label: "Stakeholder Mgmt",   val: skills.stakeholderMgmt, color: "#1fbf9f" },
                  ].map(sk => (
                    <div key={sk.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--t3)", width: 120, flexShrink: 0 }}>{sk.label}</div>
                      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${sk.val}%`, borderRadius: 99, background: sk.color, transition: "width .6s ease" }} />
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: scoreColor(sk.val), width: 30, textAlign: "right" }}>{sk.val}</div>
                    </div>
                  ))}
                </div>

                {/* Last attempt */}
                {lastAttempt && (
                  <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, color: "var(--t3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Last: {lastAttempt.challenge_title ?? "Practice session"}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: scoreColor(lastAttempt.total_score), marginLeft: 12, flexShrink: 0 }}>
                      {lastAttempt.total_score}/100
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Bottom row — Learning + Upgrade */}
        <div style={{ display: "grid", gridTemplateColumns: isPro ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>

          {/* Learning Hub */}
          <section style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Learn & Practice</h2>
              <Link href="/learning" style={{ fontSize: 12, color: "var(--teal)", textDecoration: "none", fontWeight: 500 }}>Learning Hub</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Learning Hub",   href: "/learning",   color: "#fb923c", desc: "Beginner to advanced paths" },
                { label: "Practice Lab",   href: "/scenarios",  color: "#38bdf8", desc: "Real scenario simulations" },
                { label: "PitchReady",     href: "/pitchready", color: "#a78bfa", desc: "Interview answer practice" },
                { label: "Exam Prep",      href: "/exam",       color: "#facc15", desc: "CBAP, CCBA, PMI-PBA" },
              ].map(item => (
                <button key={item.label} onClick={() => router.push(item.href)}
                  style={{ padding: "14px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${item.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: item.color, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.4 }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Upgrade card — free users only */}
          {!isPro && (
            <section style={{ background: "rgba(31,191,159,.03)", border: "1px solid rgba(31,191,159,.14)", borderRadius: 16, padding: "24px 24px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.07) 0%, transparent 65%)", pointerEvents: "none" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Upgrade to Pro</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.2 }}>
                  Unlock the full Intelligence Engine
                </h3>
                <p style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.65, marginBottom: 20 }}>
                  Unlimited workspace analyses, full Career Hub, all learning paths, and template customisation.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 24 }}>
                  {["Unlimited Problem Analyzer and Document Generator", "Full Career Hub — resume, interview, portfolio", "All learning paths and practice simulations", "Template Studio with org customisation"].map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12.5, color: "var(--t2)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => router.push("/pricing")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: "var(--teal)", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#041a13", transition: "background .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--teal-hi)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--teal)"}
              >
                Upgrade to Pro <Arrow size={14} />
              </button>
            </section>
          )}
        </div>

      </main>
    </div>
  );
}
