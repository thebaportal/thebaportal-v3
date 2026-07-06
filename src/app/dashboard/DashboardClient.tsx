"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import type { ChallengeAttempt, UserProgress } from "@/lib/progress";

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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function DashboardClient({ profile, user, upgradeSuccess, emailConfirmed, stats }: DashboardClientProps) {
  const router = useRouter();
  const [isPro, setIsPro] = useState(
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise"
  );
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const n = stats.attempts.length;

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

  useEffect(() => {
    if (emailConfirmed) window.history.replaceState({}, "", "/dashboard");
  }, [emailConfirmed]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/dashboard" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto", padding: "48px 52px", maxWidth: 960 }}>

        {/* Banners */}
        {showUpgradeBanner && (
          <div style={{ marginBottom: 28, padding: "14px 20px", background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.22)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--teal)" }}>You are now on Pro. All tools are unlocked.</span>
            </div>
            <button onClick={() => setShowUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {emailConfirmed && (
          <div style={{ marginBottom: 28, padding: "14px 20px", background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.18)", borderRadius: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#38bdf8" }}>Your email is confirmed. Welcome to The BA Portal.</span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {greeting()}, {firstName}.
            </h1>
            {isPro && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", color: "var(--teal)", letterSpacing: ".05em" }}>
                PRO
              </span>
            )}
          </div>
          <p style={{ fontSize: 15, color: "var(--t3)", lineHeight: 1.6 }}>
            Where do you want to go today?
          </p>
        </div>

        {/* Two zone cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* Workspace */}
          <div
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 0, cursor: "pointer", transition: "border-color .2s, background .2s" }}
            onClick={() => router.push("/workspace")}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(31,191,159,.3)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#1fbf9f", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 10 }}>BA Workspace</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 14 }}>
              Do your BA work
            </h2>
            <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.7, marginBottom: 32, flex: 1 }}>
              Analyze problems, extract requirements, write user stories, generate BRDs and FRDs, build process flows, and run decision analysis. Everything connects automatically.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#1fbf9f" }}>
              Open Workspace <Arrow size={14} />
            </div>
          </div>

          {/* Career */}
          <div
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 0, cursor: "pointer", transition: "border-color .2s, background .2s" }}
            onClick={() => router.push("/career")}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(56,189,248,.3)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#38bdf8", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Career Suite</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 14 }}>
              Advance your career
            </h2>
            <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.7, marginBottom: 32, flex: 1 }}>
              Write tailored cover letters, analyze job descriptions, improve your resume, prepare for interviews, and get career direction. Tell the platform what you want and it routes you there.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>
              Open Career Suite <Arrow size={14} />
            </div>
          </div>
        </div>

        {/* Practice streak — only shown when user has data */}
        {n > 0 && (
          <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--t4)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Practice Lab</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>
                {n} session{n !== 1 ? "s" : ""} completed · {stats.levelInfo.level}
              </div>
            </div>
            <button onClick={() => router.push("/scenarios")}
              style={{ padding: "10px 20px", background: "none", border: "1px solid var(--border)", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--t2)", transition: "border-color .15s, color .15s", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,.3)"; e.currentTarget.style.color = "var(--teal)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}
            >
              Continue practicing
            </button>
          </div>
        )}

        {/* Upgrade card — free users only */}
        {!isPro && (
          <div style={{ background: "rgba(31,191,159,.03)", border: "1px solid rgba(31,191,159,.14)", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.06) 0%, transparent 65%)", pointerEvents: "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Upgrade to Pro</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Unlock everything</div>
              <div style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.6 }}>
                Unlimited analyses, full Career Suite, all learning paths, and template customisation.
              </div>
            </div>
            <button onClick={() => router.push("/pricing")}
              style={{ padding: "12px 24px", background: "var(--teal)", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#041a13", flexShrink: 0, transition: "background .2s", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--teal-hi)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--teal)"}
            >
              Upgrade to Pro
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
