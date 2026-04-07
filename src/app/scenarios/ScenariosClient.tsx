"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { challenges } from "@/data/challenges";
import type { Challenge } from "@/data/challenges";
import AppSidebar from "@/components/AppSidebar";

// ── Config ────────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  "discovery":           { label: "Discovery",          color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  "requirements":        { label: "Requirements",       color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "solution-analysis":   { label: "Solution Analysis",  color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  "uat":                 { label: "UAT",                 color: "#1fbf9f", bg: "rgba(31,191,159,0.12)"  },
  "production-incident": { label: "Incident",            color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  "facilitation":        { label: "Facilitation",        color: "#facc15", bg: "rgba(250,204,21,0.12)"  },
  "change-management":   { label: "Change Management",   color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  "elicitation":         { label: "Elicitation",         color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  "data-migration":      { label: "Data Migration",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  "erp-implementation":  { label: "ERP Implementation",  color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  "beginner":     { label: "Beginner",     color: "#22c55e" },
  "intermediate": { label: "Intermediate", color: "#eab308" },
  "advanced":     { label: "Advanced",     color: "#ef4444" },
};

const INDUSTRY_OPTIONS   = ["All", "Banking", "Healthcare", "Energy", "Technology", "Insurance", "Government", "Retail", "Logistics"];
const DIFFICULTY_OPTIONS = ["All", "Beginner", "Intermediate", "Advanced"];

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function ArrowRight({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  );
}

function UsersIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

function FilterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({ value, options, onChange, label }: {
  value: string; options: string[]; onChange: (v: string) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = value !== "All";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
          background: isActive ? "rgba(31,191,159,0.08)" : "rgba(255,255,255,0.04)",
          border: isActive ? "1px solid rgba(31,191,159,0.22)" : "1px solid var(--border)",
          color: isActive ? "var(--teal)" : "var(--text-2)",
          transition: "all 0.15s", whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
        {value}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "rgba(13,13,18,0.98)", border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12, padding: 4, minWidth: 170,
          boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          zIndex: 200,
        }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: opt === value ? "rgba(31,191,159,0.1)" : "transparent",
                color: opt === value ? "var(--teal)" : "var(--text-2)",
                border: "none", cursor: "pointer", transition: "background .12s",
              }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ChallengeCard ─────────────────────────────────────────────────────────────

function ChallengeCard({ challenge, isPro, isRecommended, onClick }: {
  challenge: Challenge; isPro: boolean; isRecommended: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isLocked = challenge.tier === "pro" && !isPro;
  const type = typeConfig[challenge.type];
  const diff = difficultyConfig[challenge.difficulty];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: "var(--card)",
        border: isRecommended
          ? "1px solid rgba(31,191,159,0.38)"
          : hovered
          ? `1px solid ${type?.color ?? "rgba(255,255,255,0.12)"}35`
          : "1px solid var(--border)",
        borderRadius: 18,
        padding: "28px 26px",
        display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered
          ? "0 16px 48px rgba(0,0,0,0.5)"
          : isRecommended
          ? "0 0 0 1px rgba(31,191,159,0.1), 0 4px 20px rgba(31,191,159,0.06)"
          : "none",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
    >
      {/* Top accent line on hover */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: type?.color ?? "var(--teal)",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.2s",
      }} />

      {/* a) Title */}
      <div style={{
        fontSize: 15.5, fontWeight: 700, color: "var(--text-1)",
        lineHeight: 1.32, letterSpacing: "-0.015em",
        marginBottom: 14,
      }}>
        {challenge.title}
      </div>

      {/* b) Industry • Type • Difficulty */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
          background: "rgba(255,255,255,0.05)", color: "var(--text-3)", border: "1px solid var(--border)",
        }}>
          {challenge.industry}
        </span>

        <span style={{ color: "var(--border)", fontSize: 12 }}>•</span>

        {type && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5,
            background: type.bg, color: type.color, border: `1px solid ${type.color}28`,
          }}>
            {type.label}
          </span>
        )}

        <span style={{ color: "var(--border)", fontSize: 12 }}>•</span>

        {isLocked ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
            background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)",
          }}>
            <LockIcon size={10} />
            Pro only
          </span>
        ) : diff && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
            background: `${diff.color}12`, color: diff.color, border: `1px solid ${diff.color}22`,
          }}>
            {diff.label}
          </span>
        )}

        {isRecommended && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
            background: "rgba(31,191,159,0.1)", color: "#1fbf9f", border: "1px solid rgba(31,191,159,0.22)",
          }}>
            Recommended
          </span>
        )}
      </div>

      {/* c) Brief description */}
      <p style={{
        fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65,
        marginBottom: 18, flex: 1,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      }}>
        {challenge.brief.situation}
      </p>

      {/* d) Metadata row */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", fontFamily: "monospace" }}>
          <ClockIcon />
          {challenge.duration}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", fontFamily: "monospace" }}>
          <UsersIcon />
          {challenge.stakeholders.length} stakeholder{challenge.stakeholders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* e) CTA */}
      {isLocked ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: "rgba(255,255,255,0.04)", color: "var(--text-3)",
          border: "1px solid var(--border)",
        }}>
          <LockIcon size={13} />
          Upgrade to Pro
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: hovered ? "var(--teal)" : "rgba(31,191,159,0.1)",
          color: hovered ? "#041a13" : "var(--teal)",
          border: "1px solid rgba(31,191,159,0.22)",
          transition: "background 0.2s, color 0.2s",
        }}>
          Start Simulation
          <ArrowRight size={13} />
        </div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PracticeContext { title: string; company: string; types: string[] }

interface ScenariosClientProps {
  profile: { subscription_tier: string; full_name: string | null } | null;
  user: { email: string };
  practiceContext?: PracticeContext | null;
  isFirstTime?: boolean;
  confirmed?: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const RECOMMENDED_ID = "banking-discovery-001";

export default function ScenariosClient({ profile, user, practiceContext: practiceContextProp, isFirstTime = false, confirmed = false }: ScenariosClientProps) {
  const router = useRouter();
  const [activeType,       setActiveType]       = useState<string>("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [activeIndustry,   setActiveIndustry]   = useState("All");
  const [practiceContext,  setPracticeContext]   = useState<PracticeContext | null>(practiceContextProp ?? null);
  const [showFirstTime,    setShowFirstTime]     = useState(isFirstTime);
  const [showToast,        setShowToast]         = useState(confirmed);

  // Pick up context from sessionStorage when redirected after sign-up
  useEffect(() => {
    if (!practiceContext) {
      try {
        const stored = sessionStorage.getItem("practiceContext");
        if (stored) {
          const params = new URLSearchParams(stored);
          const title   = params.get("practicing");
          const company = params.get("company") ?? "";
          const types   = (params.get("types") ?? "").split(",").filter(Boolean);
          if (title) {
            setPracticeContext({ title, company, types });
            sessionStorage.removeItem("practiceContext");
          }
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss confirmation toast after 5 s
  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(t);
  }, [showToast]);

  // Inject responsive grid CSS
  useEffect(() => {
    const id = "sc-grid-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .sc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      @media (max-width: 1100px) { .sc-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 660px)  { .sc-grid { grid-template-columns: 1fr; } }
      .sc-type-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
      .sc-type-tabs::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(style);
  }, []);

  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";

  // Derive type tabs from data (only show types that have at least one challenge)
  const availableTypeKeys = Object.keys(typeConfig).filter(t => challenges.some(c => c.type === t));

  const filtered = challenges.filter(c => {
    const matchType = activeType === "All" || c.type === activeType;
    const matchDiff = activeDifficulty === "All" || c.difficulty === activeDifficulty.toLowerCase();
    const matchInd  = activeIndustry === "All" || c.industry.toLowerCase().includes(activeIndustry.toLowerCase());
    return matchType && matchDiff && matchInd;
  });

  const hasActiveFilters = activeType !== "All" || activeDifficulty !== "All" || activeIndustry !== "All";

  function clearFilters() {
    setActiveType("All");
    setActiveDifficulty("All");
    setActiveIndustry("All");
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/scenarios" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>

        {/* Sticky top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          padding: "14px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(9,9,11,0.9)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            {filtered.length} of {challenges.length} challenges
          </span>
          {!isPro && (
            <button onClick={() => router.push("/pricing")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer",
              }}>
              Upgrade to Pro
            </button>
          )}
        </header>

        {/* Confirmation toast */}
        {showToast && (
          <div style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, pointerEvents: "none",
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderRadius: 12,
            background: "rgba(31,191,159,0.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(31,191,159,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 15 }}>✓</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1fbf9f", fontFamily: "'Inter', sans-serif" }}>
              You did it. Now let&apos;s get to work. Your first simulation is waiting.
            </span>
          </div>
        )}

        <div style={{ padding: "40px 32px", maxWidth: 1240, margin: "0 auto" }}>

          {/* Practice context banner */}
          {practiceContext && (
            <div style={{
              marginBottom: 28, padding: "16px 20px", borderRadius: 14,
              background: "rgba(31,191,159,0.07)", border: "1px solid rgba(31,191,159,0.22)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4, fontFamily: "monospace" }}>
                  Practice Mode
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>
                  Preparing for: <span style={{ color: "var(--teal)" }}>{practiceContext.title}</span>
                  {practiceContext.company && <span style={{ color: "var(--text-3)", fontWeight: 400 }}> at {practiceContext.company}</span>}
                </p>
                {practiceContext.types.length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: "4px 0 0", fontFamily: "monospace" }}>
                    Recommended challenges are highlighted below
                  </p>
                )}
              </div>
              <button onClick={() => setPracticeContext(null)}
                style={{
                  fontSize: 12, fontWeight: 600, color: "var(--text-3)",
                  background: "none", border: "1px solid var(--border)", borderRadius: 8,
                  cursor: "pointer", padding: "5px 12px",
                }}>
                Clear
              </button>
            </div>
          )}

          {/* 1. Header */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{
              fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800,
              letterSpacing: "-0.03em", color: "var(--text-1)",
              marginBottom: 10, lineHeight: 1.1,
            }}>
              BA Simulation Lab
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-2)", lineHeight: 1.6 }}>
              Practice real BA scenarios. Get scored. Know exactly where you stand.
            </p>
          </div>

          {/* First-time onboarding block */}
          {showFirstTime && (() => {
            const rec = challenges.find(c => c.id === RECOMMENDED_ID);
            if (!rec) return null;
            const recType = typeConfig[rec.type];
            const recDiff = difficultyConfig[rec.difficulty];
            return (
              <div style={{
                marginBottom: 48,
                padding: "36px 36px 32px",
                borderRadius: 20,
                background: "linear-gradient(135deg, rgba(31,191,159,0.07) 0%, rgba(31,191,159,0.03) 100%)",
                border: "1px solid rgba(31,191,159,0.22)",
                position: "relative", overflow: "hidden",
              }}>
                {/* Ambient glow */}
                <div style={{
                  position: "absolute", top: "-40px", right: "-40px",
                  width: 200, height: 200,
                  background: "radial-gradient(ellipse, rgba(31,191,159,0.1) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />

                {/* Eyebrow */}
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                  color: "#1fbf9f", fontFamily: "monospace", marginBottom: 12,
                }}>
                  Start here
                </div>

                {/* Title + subtitle */}
                <h2 style={{
                  fontSize: "clamp(22px, 2.8vw, 30px)", fontWeight: 800,
                  letterSpacing: "-0.03em", color: "var(--text-1)",
                  margin: "0 0 8px", lineHeight: 1.15,
                }}>
                  Start your first simulation
                </h2>
                <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 540 }}>
                  We&apos;ve picked the best starting point for you. Complete it and you&apos;ll have a real score, real feedback, and a clear picture of where to improve.
                </p>

                {/* CTAs */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const, marginBottom: 28 }}>
                  <button
                    onClick={() => router.push(`/scenarios/${RECOMMENDED_ID}?mode=normal`)}
                    style={{
                      padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                      background: "#1fbf9f", color: "#041a13", border: "none", cursor: "pointer",
                      boxShadow: "0 0 20px rgba(31,191,159,0.25)",
                      display: "flex", alignItems: "center", gap: 8,
                      fontFamily: "'Inter', sans-serif",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#25d4b0"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1fbf9f"; }}
                  >
                    Start this simulation
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setShowFirstTime(false)}
                    style={{
                      padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                      background: "transparent", color: "var(--text-2)",
                      border: "1px solid var(--border)", cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                  >
                    Browse all simulations
                  </button>
                </div>

                {/* Recommended card */}
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(31,191,159,0.25)",
                  borderRadius: 16, padding: "22px 24px 20px",
                  maxWidth: 520, position: "relative",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                    {recType && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5, background: recType.bg, color: recType.color, border: `1px solid ${recType.color}28` }}>
                        {recType.label}
                      </span>
                    )}
                    <span style={{ color: "var(--border)", fontSize: 12 }}>•</span>
                    {recDiff && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5, background: `${recDiff.color}12`, color: recDiff.color, border: `1px solid ${recDiff.color}22` }}>
                        {recDiff.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3, marginBottom: 8 }}>{rec.title}</div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    {rec.brief.situation}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-3)", fontFamily: "monospace" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ClockIcon size={12} /> {rec.duration}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><UsersIcon size={12} /> {rec.stakeholders.length} stakeholder{rec.stakeholders.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. Filter bar */}
          <div style={{ marginBottom: 36, opacity: showFirstTime ? 0.5 : 1, transition: "opacity 0.2s", pointerEvents: showFirstTime ? "none" : "auto" }}>

            {/* Type tabs */}
            <div className="sc-type-tabs" style={{ marginBottom: 12 }}>
              {(["All", ...availableTypeKeys] as string[]).map(key => {
                const isActive = activeType === key;
                const cfg = key === "All" ? null : typeConfig[key];
                const activeColor = cfg?.color ?? "var(--teal)";
                return (
                  <button key={key} onClick={() => setActiveType(key)}
                    style={{
                      flexShrink: 0, padding: "7px 16px", borderRadius: 999,
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.15s",
                      background: isActive
                        ? (cfg ? `${cfg.color}18` : "rgba(31,191,159,0.1)")
                        : "rgba(255,255,255,0.04)",
                      color: isActive ? activeColor : "var(--text-3)",
                      border: isActive ? `1px solid ${activeColor}30` : "1px solid var(--border)",
                    }}>
                    {key === "All" ? "All Types" : cfg?.label ?? key}
                  </button>
                );
              })}
            </div>

            {/* Dropdowns + Clear */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Dropdown
                value={activeDifficulty}
                options={DIFFICULTY_OPTIONS}
                onChange={setActiveDifficulty}
                label="Difficulty: "
              />
              <Dropdown
                value={activeIndustry}
                options={INDUSTRY_OPTIONS}
                onChange={setActiveIndustry}
                label="Industry: "
              />
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: "rgba(248,113,113,0.07)", color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.18)", transition: "all 0.15s",
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* 3+6. Card grid or empty state */}
          {filtered.length === 0 ? (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FilterIcon size={22} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginBottom: 12 }}>
                No challenges match your filters.
              </p>
              <button onClick={clearFilters}
                style={{
                  fontSize: 13, fontWeight: 600, color: "var(--teal)",
                  cursor: "pointer", background: "none", border: "none",
                  textDecoration: "underline", textUnderlineOffset: 3,
                }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="sc-grid">
              {filtered.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isPro={isPro}
                  isRecommended={practiceContext?.types.includes(challenge.type) ?? false}
                  onClick={() => {
                    if (challenge.tier === "pro" && !isPro) {
                      router.push("/pricing");
                    } else {
                      router.push(`/scenarios/${challenge.id}?mode=normal`);
                    }
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ height: 60 }} />
        </div>
      </main>
    </div>
  );
}
