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
  user:           { email: string; displayName?: string | null };
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

/* ── SVG illustration: node graph for BA Workspace ── */
function WorkspaceIllustration() {
  return (
    <svg
      width="160" height="130" viewBox="0 0 160 130" fill="none"
      style={{ position: "absolute", top: 0, right: 0, opacity: 0.07, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Connection lines */}
      <line x1="80" y1="65" x2="32" y2="32" stroke="#0891b2" strokeWidth="1.5" />
      <line x1="80" y1="65" x2="128" y2="32" stroke="#0891b2" strokeWidth="1.5" />
      <line x1="80" y1="65" x2="32" y2="98" stroke="#0891b2" strokeWidth="1.5" />
      <line x1="80" y1="65" x2="128" y2="98" stroke="#0891b2" strokeWidth="1.5" />
      {/* Mid-point dots on connections */}
      <circle cx="56" cy="48" r="3" fill="#0891b2" />
      <circle cx="104" cy="48" r="3" fill="#0891b2" />
      <circle cx="56" cy="82" r="3" fill="#0891b2" />
      <circle cx="104" cy="82" r="3" fill="#0891b2" />
      {/* Central hub */}
      <circle cx="80" cy="65" r="13" stroke="#0891b2" strokeWidth="2" />
      <circle cx="80" cy="65" r="6" fill="#0891b2" />
      {/* Satellite nodes */}
      <circle cx="28" cy="28" r="9" stroke="#0891b2" strokeWidth="1.5" />
      <circle cx="132" cy="28" r="9" stroke="#0891b2" strokeWidth="1.5" />
      <circle cx="28" cy="102" r="9" stroke="#0891b2" strokeWidth="1.5" />
      <circle cx="132" cy="102" r="9" stroke="#0891b2" strokeWidth="1.5" />
      {/* Tiny detail marks inside satellite nodes */}
      <line x1="24" y1="28" x2="32" y2="28" stroke="#0891b2" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="128" y1="28" x2="136" y2="28" stroke="#0891b2" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="102" x2="32" y2="102" stroke="#0891b2" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="128" y1="102" x2="136" y2="102" stroke="#0891b2" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── SVG illustration: growth curve for Career Suite ── */
function CareerIllustration() {
  return (
    <svg
      width="160" height="130" viewBox="0 0 160 130" fill="none"
      style={{ position: "absolute", top: 0, right: 0, opacity: 0.07, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Subtle grid lines */}
      <line x1="12" y1="110" x2="148" y2="110" stroke="#0284c7" strokeWidth="0.8" />
      <line x1="12" y1="83"  x2="148" y2="83"  stroke="#0284c7" strokeWidth="0.8" opacity="0.6" />
      <line x1="12" y1="56"  x2="148" y2="56"  stroke="#0284c7" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="29"  x2="148" y2="29"  stroke="#0284c7" strokeWidth="0.8" opacity="0.2" />
      {/* Rising curve */}
      <path
        d="M18 105 C35 100 50 90 68 74 C86 58 102 38 138 16"
        stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Arrow at the end of the curve */}
      <path d="M132 12 L138 16 L133 22" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points on the curve */}
      <circle cx="18"  cy="105" r="4.5" fill="#0284c7" />
      <circle cx="52"  cy="82"  r="4.5" fill="#0284c7" />
      <circle cx="88"  cy="55"  r="4.5" fill="#0284c7" />
      <circle cx="122" cy="30"  r="4.5" fill="#0284c7" />
      {/* White centre for each dot (ring effect) */}
      <circle cx="18"  cy="105" r="2" fill="white" />
      <circle cx="52"  cy="82"  r="2" fill="white" />
      <circle cx="88"  cy="55"  r="2" fill="white" />
      <circle cx="122" cy="30"  r="2" fill="white" />
    </svg>
  );
}

export default function DashboardClient({ profile, user, upgradeSuccess, emailConfirmed, stats }: DashboardClientProps) {
  const router = useRouter();
  const [isPro, setIsPro] = useState(
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise"
  );
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const rawFirst =
    profile?.full_name?.split(" ")[0]?.trim() ||
    user.displayName?.split(" ")[0]?.trim() ||
    "";
  const firstName = rawFirst.length > 0 ? rawFirst : "";
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
    background: "var(--lc-surface)",
    border: "1px solid var(--lc-border-soft)",
    borderRadius: 20,
    boxShadow: "var(--lc-shadow-md)",
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppSidebar activeHref="/dashboard" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto", background: "var(--lc-bg)" }}>
        <div style={{ padding: "28px 40px" }}>

          {/* Banners */}
          {showUpgradeBanner && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "var(--lc-green-bg)", border: "1px solid var(--lc-green-border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--lc-green)" }}>You are now on Pro. All tools are unlocked.</span>
              </div>
              <button onClick={() => setShowUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lc-text-5)", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {emailConfirmed && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "var(--lc-blue-bg)", border: "1px solid var(--lc-blue-border)", borderRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--lc-blue)" }}>Your email is confirmed. Welcome to The BA Portal.</span>
            </div>
          )}

          {/* Greeting */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {firstName ? `${greeting()}, ${firstName}.` : "Hi there!"}
              </h1>
              {isPro && (
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", color: "var(--lc-teal)", letterSpacing: ".05em" }}>
                  PRO
                </span>
              )}
            </div>
            <p style={{ fontSize: 15, color: "var(--lc-text-4)", lineHeight: 1.6, margin: 0 }}>
              Where do you want to go today?
            </p>
          </div>

          {/* Two zone cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            {/* Workspace */}
            <div
              style={card}
              onClick={() => router.push("/workspace")}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "0 12px 40px -8px rgba(8,145,178,0.18)";
                el.style.borderColor = "rgba(8,145,178,0.3)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "var(--lc-shadow-md)";
                el.style.borderColor = "var(--lc-border-soft)";
                el.style.transform = "translateY(0)";
              }}
            >
              <WorkspaceIllustration />

              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lc-teal)" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--lc-teal)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>BA Workspace</div>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
                Do your BA work
              </h2>
              <p style={{ fontSize: 14, color: "var(--lc-text-4)", lineHeight: 1.7, flex: 1, margin: "0 0 28px" }}>
                Analyze problems, extract requirements, write user stories, generate BRDs and FRDs, build process flows, and run decision analysis. Everything connects automatically.
              </p>
              <div className="dash-link" style={{ color: "var(--lc-teal)" }}>
                Open Workspace <Arrow />
              </div>
            </div>

            {/* Career */}
            <div
              style={card}
              onClick={() => router.push("/career")}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "0 12px 40px -8px rgba(2,132,199,0.18)";
                el.style.borderColor = "rgba(2,132,199,0.3)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = "var(--lc-shadow-md)";
                el.style.borderColor = "var(--lc-border-soft)";
                el.style.transform = "translateY(0)";
              }}
            >
              <CareerIllustration />

              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--lc-blue-bg)", border: "1px solid var(--lc-blue-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lc-blue)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--lc-blue)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Career Suite</div>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
                Land a job, grow as a BA, or find your direction.
              </h2>
              <p style={{ fontSize: 14, color: "var(--lc-text-4)", lineHeight: 1.7, flex: 1, margin: "0 0 28px" }}>
                Analyze job descriptions, improve your resume, write cover letters, prepare for interviews, negotiate offers, and get career direction. Tell it what you want and it routes you there.
              </p>
              <div className="dash-link" style={{ color: "var(--lc-blue)" }}>
                Open Career Suite <Arrow />
              </div>
            </div>
          </div>

          {/* Practice streak */}
          {n > 0 && (
            <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border-soft)", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, boxShadow: "var(--lc-shadow-sm)" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--lc-text-5)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3 }}>Practice Lab</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--lc-text-1)" }}>
                  {n} session{n !== 1 ? "s" : ""} completed · {stats.levelInfo.level}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); router.push("/scenarios"); }}
                style={{ padding: "9px 18px", background: "none", border: "1px solid var(--lc-border)", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--lc-text-3)", transition: "border-color .15s, color .15s", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--lc-teal)"; e.currentTarget.style.color = "var(--lc-teal)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--lc-border)"; e.currentTarget.style.color = "var(--lc-text-3)"; }}
              >
                Continue practicing
              </button>
            </div>
          )}

          {/* Upgrade card */}
          {!isPro && (
            <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border-soft)", borderRadius: 14, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, boxShadow: "var(--lc-shadow-sm)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "var(--lc-teal)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>Upgrade to Pro</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)", marginBottom: 3 }}>Unlock everything</div>
                <div style={{ fontSize: 13, color: "var(--lc-text-4)", lineHeight: 1.6 }}>
                  Unlimited analyses, full Career Suite, all learning paths, and template customisation.
                </div>
              </div>
              <button onClick={() => router.push("/pricing")}
                style={{ padding: "11px 22px", background: "var(--lc-text-1)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#ffffff", flexShrink: 0, transition: "opacity .15s", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
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
