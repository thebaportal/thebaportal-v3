"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, TrendingUp, Settings,
  LayoutDashboard, Target, GraduationCap,
  BriefcaseBusiness, Trophy, CheckCircle2,
  LogOut, User, ChevronUp,
} from "lucide-react";
import { BADGE_DEFINITIONS } from "@/lib/progress";
import type { ChallengeAttempt, UserBadge, UserProgress } from "@/lib/progress";

interface Stats {
  attempts: ChallengeAttempt[];
  badges: UserBadge[];
  progress: UserProgress;
  skills: { elicitation: number; requirements: number; solutionAnalysis: number; stakeholderMgmt: number };
  levelInfo: { level: string; nextLevel: string; progressPct: number; challengesNeeded: number };
}

interface Props {
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
  stats: Stats;
}

const typeColors: Record<string, string> = {
  discovery: "#38bdf8",
  requirements: "#a78bfa",
  "solution-analysis": "#f97316",
  uat: "#1fbf9f",
  "production-incident": "#f87171",
};

const levels = [
  { name: "Rookie",      req: 0 },
  { name: "Associate",   req: 1 },
  { name: "Practitioner",req: 3 },
  { name: "Senior BA",   req: 5 },
  { name: "Expert",      req: 6 },
];

const navItems: { icon: React.ElementType; label: string; href: string; active?: boolean; locked?: boolean }[] = [
  { icon: LayoutDashboard,   label: "Dashboard",    href: "/dashboard"               },
  { icon: BookOpen,          label: "Challenges",   href: "/scenarios"               },
  { icon: TrendingUp,        label: "Progress",     href: "/progress",  active: true },
  { icon: GraduationCap,     label: "Learning",     href: "/learning"                },
  { icon: Target,            label: "Exam Prep",    href: "/exam"                   },
  { icon: BriefcaseBusiness, label: "Career Suite", href: "/career" },
  { icon: Trophy,            label: "Portfolio",    href: "/portfolio" },
];

function DropdownItem({ icon, label, onClick, teal = false }: { icon: React.ReactNode; label: string; onClick: () => void; teal?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "none", border: "none", cursor: "pointer", color: teal ? "var(--teal)" : "var(--text-2)", fontSize: "13px", fontWeight: 500, fontFamily: "'Inter','Open Sans',sans-serif", transition: "background 0.15s", textAlign: "left" }}
      onMouseEnter={e => (e.currentTarget.style.background = teal ? "rgba(31,191,159,0.08)" : "rgba(255,255,255,0.05)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
      {icon}{label}
    </button>
  );
}

function UserMenu({ fullName, email, isPro, initials, onSignOut, signingOut }: { fullName: string | null; email: string; isPro: boolean; initials: string; onSignOut: () => void; signingOut: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", borderTop: "1px solid var(--border)", padding: "8px" }}>
      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 -8px 32px rgba(0,0,0,0.5)", zIndex: 50 }}>
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", fontFamily: "'Inter','Open Sans',sans-serif", marginBottom: "2px" }}>{fullName || "BA Learner"}</div>
            <div style={{ fontSize: "11px", color: "var(--text-3)", wordBreak: "break-all" }}>{email}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "8px", padding: "3px 8px", borderRadius: "6px", background: isPro ? "rgba(31,191,159,0.12)" : "rgba(255,255,255,0.05)", border: isPro ? "1px solid rgba(31,191,159,0.2)" : "1px solid rgba(255,255,255,0.08)", fontSize: "11px", fontWeight: 600, color: isPro ? "var(--teal)" : "var(--text-3)" }}>
              {isPro ? "⚡ Pro Member" : "Free Plan"}
            </div>
          </div>
          <div style={{ padding: "6px" }}>
            <DropdownItem icon={<User size={14} />} label="Profile" onClick={() => { setOpen(false); router.push("/settings"); }} />
            <DropdownItem icon={<Settings size={14} />} label="Settings" onClick={() => { setOpen(false); router.push("/settings"); }} />
            {!isPro && <DropdownItem icon={<span style={{ fontSize: "13px" }}>⚡</span>} label="Upgrade to Pro" teal onClick={() => { setOpen(false); router.push("/pricing"); }} />}
          </div>
          <div style={{ padding: "6px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => { setOpen(false); onSignOut(); }} disabled={signingOut}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "none", border: "none", cursor: signingOut ? "not-allowed" : "pointer", color: "#f87171", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter','Open Sans',sans-serif", transition: "background 0.15s", opacity: signingOut ? 0.5 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <LogOut size={14} />{signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "12px", background: open ? "rgba(255,255,255,0.06)" : "none", border: open ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent", cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "none"; }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: "var(--teal-soft)", border: "1px solid var(--teal-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "var(--teal)", fontFamily: "'Inter','Open Sans',sans-serif" }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName || "BA Learner"}</div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "1px" }}>{isPro ? "Pro Member" : "Free Plan"}</div>
        </div>
        <ChevronUp size={14} style={{ color: "var(--text-4)", flexShrink: 0, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s ease" }} />
      </button>
    </div>
  );
}

export default function ProgressClient({ profile, user, stats }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const { attempts, badges, progress, skills, levelInfo } = stats;
  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";
  const initials = (profile?.full_name?.[0] || user.email[0]).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 flex flex-col relative overflow-hidden" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div className="absolute inset-0 pointer-events-none dot-grid" />
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(31,191,159,0.05) 0%, transparent 70%)" }} />

        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-border)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--teal)" }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
                The<span style={{ color: "var(--teal)" }}>BA</span>Portal
              </div>
              <div className="type-label" style={{ marginTop: "1px" }}>v3.0 · Phase 1</div>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="type-label px-3 pb-3">Platform</div>
          {navItems.map(item => (
            <button key={item.href} onClick={() => !item.locked && router.push(item.href)} className="sidebar-item"
              style={item.active ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)" } : item.locked ? { color: "var(--text-4)", cursor: "not-allowed" } : {}}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.active && <div className="teal-dot" />}
              {item.locked && <span className="type-label" style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", color: "var(--text-4)" }}>SOON</span>}
            </button>
          ))}
        </nav>

        <div className="relative">
          <UserMenu fullName={profile?.full_name ?? null} email={user.email} isPro={isPro} initials={initials} onSignOut={handleSignOut} signingOut={signingOut} />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-5 flex items-center gap-4 sticky top-0 z-20" style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>Your Progress</h1>
            <p className="type-body" style={{ marginTop: "4px" }}>Track your BA journey and earned achievements</p>
          </div>
        </header>

        <div className="px-8 py-8 max-w-5xl space-y-8">

          {/* BA Level Journey */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px" }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="type-card" style={{ fontSize: "18px" }}>BA Level Journey</h2>
                <p className="type-body" style={{ marginTop: "3px" }}>Complete challenges to advance your level</p>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "var(--teal)", letterSpacing: "-0.03em" }}>{levelInfo.level}</div>
                {levelInfo.challengesNeeded > 0 && (
                  <div className="type-meta" style={{ marginTop: "2px" }}>{levelInfo.challengesNeeded} challenge{levelInfo.challengesNeeded !== 1 ? "s" : ""} to {levelInfo.nextLevel}</div>
                )}
              </div>
            </div>
            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-3">
                {levels.map(lvl => {
                  const isActive = lvl.name === levelInfo.level;
                  const isPast = progress.challenges_completed >= lvl.req;
                  return (
                    <div key={lvl.name} className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: isActive ? "var(--teal)" : isPast ? "var(--teal-soft)" : "rgba(255,255,255,0.05)", border: isActive ? "2px solid var(--teal)" : isPast ? "1px solid var(--teal-border)" : "1px solid var(--border)", color: isActive ? "var(--bg)" : isPast ? "var(--teal)" : "var(--text-4)", boxShadow: isActive ? "0 0 16px rgba(31,191,159,0.4)" : "none" }}>
                        {isPast && !isActive ? <CheckCircle2 className="w-4 h-4" /> : levels.findIndex(l => l.name === lvl.name) + 1}
                      </div>
                      <span className="type-meta" style={{ color: isActive ? "var(--teal)" : isPast ? "var(--text-3)" : "var(--text-4)", whiteSpace: "nowrap" }}>{lvl.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1 rounded-full overflow-hidden mx-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((progress.challenges_completed / 6) * 100, 100)}%` }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full" style={{ background: "var(--teal)", boxShadow: "0 0 8px rgba(31,191,159,0.5)" }} />
              </div>
            </div>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Completed",  value: progress.challenges_completed, sub: "challenges",                  color: "var(--teal)" },
              { label: "Best Score", value: attempts.length > 0 ? Math.max(...attempts.map(a => a.total_score)) : "—", sub: "out of 100", color: "#f59e0b" },
              { label: "Avg Score",  value: progress.avg_score > 0 ? progress.avg_score : "—", sub: "across all attempts", color: "#a78bfa" },
              { label: "Badges",     value: badges.length, sub: `of ${BADGE_DEFINITIONS.length} total`,        color: "#38bdf8" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "30px", color: "var(--text-1)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "6px" }}>{stat.value}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: stat.color, marginBottom: "2px" }}>{stat.label}</div>
                <div className="type-meta">{stat.sub}</div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${stat.color}30, transparent)` }} />
              </motion.div>
            ))}
          </div>

          {/* Skills + Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px" }}>
              <h3 className="type-card" style={{ fontSize: "16px", marginBottom: "6px" }}>Skill Breakdown</h3>
              <p className="type-meta" style={{ marginBottom: "24px" }}>Calculated from your submission scores</p>
              {[
                { label: "Elicitation & Problem Framing", pct: skills.elicitation,      color: "var(--teal)" },
                { label: "Root Cause & Requirements",     pct: skills.requirements,     color: "#a78bfa"     },
                { label: "Solution Evaluation",           pct: skills.solutionAnalysis, color: "#fb923c"     },
                { label: "Stakeholder Management",        pct: skills.stakeholderMgmt,  color: "#38bdf8"     },
              ].map((skill, i) => (
                <div key={skill.label} style={{ marginBottom: i < 3 ? "20px" : "0" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="type-body" style={{ fontSize: "13px" }}>{skill.label}</span>
                    <span style={{ fontSize: "12px", color: skill.pct > 0 ? skill.color : "var(--text-4)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{skill.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${skill.pct}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.9, ease: "easeOut" }} className="h-full rounded-full" style={{ background: skill.color }} />
                  </div>
                </div>
              ))}
              {attempts.length === 0 && (
                <div className="mt-4 text-center py-4">
                  <p className="type-meta">Complete a challenge to see your skill scores</p>
                  <button onClick={() => router.push("/scenarios")} style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>Browse challenges →</button>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px" }}>
              <h3 className="type-card" style={{ fontSize: "16px", marginBottom: "6px" }}>Achievements</h3>
              <p className="type-meta" style={{ marginBottom: "20px" }}>{badges.length} of {BADGE_DEFINITIONS.length} badges earned</p>
              <div className="grid grid-cols-2 gap-3">
                {BADGE_DEFINITIONS.map(badge => {
                  const earned = badges.some(b => b.badge_id === badge.id);
                  const earnedData = badges.find(b => b.badge_id === badge.id);
                  return (
                    <div key={badge.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: earned ? `${badge.color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${earned ? badge.color + "20" : "rgba(255,255,255,0.04)"}`, opacity: earned ? 1 : 0.4 }}>
                      <span style={{ fontSize: "22px", filter: earned ? "none" : "grayscale(1)", flexShrink: 0 }}>{badge.icon}</span>
                      <div className="min-w-0">
                        <div style={{ fontSize: "11px", fontWeight: 700, color: earned ? badge.color : "var(--text-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{badge.name}</div>
                        <div className="type-meta" style={{ marginTop: "1px", lineHeight: 1.4 }}>
                          {earned && earnedData ? `Earned ${new Date(earnedData.earned_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}` : badge.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Attempt history */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px" }}>
            <h3 className="type-card" style={{ fontSize: "16px", marginBottom: "6px" }}>Submission History</h3>
            <p className="type-meta" style={{ marginBottom: "20px" }}>Every challenge you have submitted</p>
            {attempts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: "var(--text-4)" }} />
                </div>
                <p className="type-card" style={{ color: "var(--text-3)" }}>No submissions yet</p>
                <p className="type-meta" style={{ marginTop: "6px", marginBottom: "16px" }}>Complete your first challenge to see your history here</p>
                <button onClick={() => router.push("/scenarios")} className="btn-teal" style={{ padding: "10px 20px", fontSize: "13px" }}>Browse Challenges</button>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt, i) => {
                  const typeColor = typeColors[attempt.challenge_type] || "var(--text-3)";
                  const scoreColor = attempt.total_score >= 80 ? "var(--teal)" : attempt.total_score >= 60 ? "#f59e0b" : "#f87171";
                  return (
                    <motion.div key={attempt.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${typeColor}10`, border: `1px solid ${typeColor}20` }}>
                        <span style={{ fontSize: "14px", fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, color: typeColor }}>{attempt.total_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 600, fontSize: "13px", color: "var(--text-1)" }} className="truncate">{attempt.challenge_title}</div>
                        <div className="type-meta" style={{ marginTop: "2px" }}>
                          {attempt.industry} · {attempt.difficulty_mode.charAt(0).toUpperCase() + attempt.difficulty_mode.slice(1)} · {new Date(attempt.completed_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "18px", color: scoreColor, letterSpacing: "-0.03em" }}>
                          {attempt.total_score}<span className="type-meta" style={{ fontSize: "11px" }}>/100</span>
                        </div>
                        <button onClick={() => router.push(`/scenarios/${attempt.challenge_id}?mode=${attempt.difficulty_mode}`)}
                          style={{ fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)", cursor: "pointer" }}>
                          Retry
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <div style={{ height: "40px" }} />
        </div>
      </main>
    </div>
  );
}