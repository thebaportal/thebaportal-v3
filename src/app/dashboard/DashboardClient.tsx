"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

function Arrow() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

  const rawFirst = profile?.full_name?.split(" ")[0]?.trim();
  const firstName = rawFirst && rawFirst.length > 0 ? rawFirst : "";
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

  const card: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e9edf2",
    borderRadius: 20,
    boxShadow: "0 2px 16px -4px rgba(0,0,0,0.07)",
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "box-shadow 0.2s, border-color 0.2s",
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppSidebar activeHref="/dashboard" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 40px" }}>

          {/* Banners */}
          {showUpgradeBanner && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>You are now on Pro. All tools are unlocked.</span>
              </div>
              <button onClick={() => setShowUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {emailConfirmed && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0284c7" }}>Your email is confirmed. Welcome to The BA Portal.</span>
            </div>
          )}

          {/* Greeting */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {greeting()}{firstName ? `, ${firstName}` : ""}.
              </h1>
              {isPro && (
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.2)", color: "#0891b2", letterSpacing: ".05em" }}>
                  PRO
                </span>
              )}
            </div>
            <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>
              Where do you want to go today?
            </p>
          </div>

          {/* Two zone cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            {/* Workspace */}
            <div
              style={card}
              onClick={() => router.push("/workspace")}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px -4px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#c7d8e8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px -4px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e9edf2"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(31,191,159,0.1)", border: "1px solid rgba(31,191,159,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#1fbf9f", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>BA Workspace</div>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
                Do your BA work
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 28, flex: 1 }}>
                Analyze problems, extract requirements, write user stories, generate BRDs and FRDs, build process flows, and run decision analysis. Everything connects automatically.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#1fbf9f" }}>
                Open Workspace <Arrow />
              </div>
            </div>

            {/* Career */}
            <div
              style={card}
              onClick={() => router.push("/career")}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px -4px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#c7d8e8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px -4px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e9edf2"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#0284c7", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Career Suite</div>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
                Advance your career
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 28, flex: 1 }}>
                Write tailored cover letters, analyze job descriptions, improve your resume, prepare for interviews, and get career direction. Tell the platform what you want and it routes you there.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#0284c7" }}>
                Open Career Suite <Arrow />
              </div>
            </div>
          </div>

          {/* Practice streak */}
          {n > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid #e9edf2", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, boxShadow: "0 2px 8px -2px rgba(0,0,0,0.05)" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3 }}>Practice Lab</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                  {n} session{n !== 1 ? "s" : ""} completed · {stats.levelInfo.level}
                </div>
              </div>
              <button onClick={() => router.push("/scenarios")}
                style={{ padding: "9px 18px", background: "none", border: "1px solid #e2e8f0", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", transition: "border-color .15s, color .15s", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1fbf9f"; e.currentTarget.style.color = "#1fbf9f"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
              >
                Continue practicing
              </button>
            </div>
          )}

          {/* Upgrade card */}
          {!isPro && (
            <div style={{ background: "#ffffff", border: "1px solid #e9edf2", borderRadius: 14, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, boxShadow: "0 2px 8px -2px rgba(0,0,0,0.05)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#1fbf9f", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Upgrade to Pro</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Unlock everything</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Unlimited analyses, full Career Suite, all learning paths, and template customisation.
                </div>
              </div>
              <button onClick={() => router.push("/pricing")}
                style={{ padding: "11px 22px", background: "#0f172a", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#ffffff", flexShrink: 0, transition: "background .15s", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
                onMouseLeave={e => e.currentTarget.style.background = "#0f172a"}
              >
                Upgrade to Pro
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
