"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, TrendingUp, Settings,
  LayoutDashboard, Target, GraduationCap,
  BriefcaseBusiness, Trophy, CheckCircle2,
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
  stats: Stats;
}

const typeColors: Record<string, string> = {
  discovery: "#38bdf8",
  requirements: "#a78bfa",
  "solution-analysis": "#f97316",
  uat: "#00d4a0",
  "production-incident": "#f87171",
};

const levels = [
  { name: "Rookie", req: 0 },
  { name: "Associate", req: 1 },
  { name: "Practitioner", req: 3 },
  { name: "Senior BA", req: 5 },
  { name: "Expert", req: 6 },
];

export default function ProgressClient({ profile, stats }: Props) {
  const router = useRouter();
  const { attempts, badges, progress, skills, levelInfo } = stats;
  const initials = (profile?.full_name?.[0] || "B").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#09090b" }}>

      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 flex flex-col relative overflow-hidden" style={{ background: "#0a0a0d", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,212,160,0.08)", border: "1px solid rgba(0,212,160,0.18)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "#00d4a0" }} />
            </div>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "15px", color: "#fafafa", letterSpacing: "-0.03em" }}>
                The<span style={{ color: "#00d4a0" }}>BA</span>Portal
              </div>
              <div style={{ fontSize: "10px", color: "#3f3f46" }}>v3.0 · PHASE 1</div>
            </div>
          </div>
        </div>
        <nav className="relative flex-1 px-3 py-5 space-y-0.5">
          {[
            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
            { icon: BookOpen, label: "Challenges", href: "/scenarios" },
            { icon: TrendingUp, label: "Progress", href: "/progress", active: true },
            { icon: GraduationCap, label: "Learning Paths", href: "/learning", locked: true },
            { icon: Target, label: "Exam Prep", href: "/exam", locked: true },
            { icon: BriefcaseBusiness, label: "Career Suite", href: "/career", locked: true },
            { icon: Trophy, label: "Portfolio", href: "/portfolio", locked: true },
          ].map(item => (
            <button key={item.href} onClick={() => !item.locked && router.push(item.href)} className="sidebar-item"
              style={item.active ? { background: "rgba(0,212,160,0.08)", color: "#00d4a0", border: "1px solid rgba(0,212,160,0.15)" }
                : item.locked ? { color: "#2a2a2a", cursor: "not-allowed", border: "1px solid transparent" }
                : { color: "#71717a", border: "1px solid transparent" }}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1, textAlign: "left", fontSize: "13px" }}>{item.label}</span>
              {item.active && <div className="teal-dot" />}
              {item.locked && <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", color: "#2a2a2a" }}>SOON</span>}
            </button>
          ))}
          <div className="px-3 pt-5 pb-2" style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3f3f46" }}>Account</div>
          <button className="sidebar-item" onClick={() => router.push("/settings")} style={{ color: "#52525b", border: "1px solid transparent" }}>
            <Settings className="w-4 h-4" />
            <span style={{ fontSize: "13px" }}>Settings</span>
          </button>
        </nav>
        <div className="relative px-3 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            style={{ transition: "background 0.15s" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(0,212,160,0.1)", color: "#00d4a0", border: "1px solid rgba(0,212,160,0.2)", fontFamily: "Syne, sans-serif" }}>{initials}</div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#e4e4e7", fontFamily: "Syne, sans-serif" }}>{profile?.full_name || "BA Learner"}</div>
              <div style={{ fontSize: "11px", color: "#3f3f46" }}>{profile?.subscription_tier === "pro" ? "Pro Member" : "Free Plan"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-5 flex items-center gap-4 sticky top-0 z-20" style={{ background: "rgba(9,9,11,0.9)", backdropFilter: "blur(28px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", color: "#fafafa", letterSpacing: "-0.03em", lineHeight: 1 }}>Your Progress</h1>
            <p style={{ fontSize: "13px", color: "#52525b", marginTop: "4px" }}>Track your BA journey and earned achievements</p>
          </div>
        </header>

        <div className="px-8 py-8 max-w-5xl space-y-8">

          {/* BA Level Journey */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "32px" }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "18px", color: "#fafafa", letterSpacing: "-0.03em" }}>BA Level Journey</h2>
                <p style={{ fontSize: "13px", color: "#52525b", marginTop: "3px" }}>Complete challenges to advance your level</p>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", color: "#00d4a0", letterSpacing: "-0.03em" }}>{levelInfo.level}</div>
                {levelInfo.challengesNeeded > 0 && (
                  <div style={{ fontSize: "12px", color: "#52525b", marginTop: "2px" }}>
                    {levelInfo.challengesNeeded} challenge{levelInfo.challengesNeeded !== 1 ? "s" : ""} to {levelInfo.nextLevel}
                  </div>
                )}
              </div>
            </div>

            {/* Level progression bar */}
            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-3">
                {levels.map((lvl, i) => {
                  const isActive = lvl.name === levelInfo.level;
                  const isPast = progress.challenges_completed >= lvl.req;
                  return (
                    <div key={lvl.name} className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: isActive ? "#00d4a0" : isPast ? "rgba(0,212,160,0.2)" : "rgba(255,255,255,0.05)",
                          border: isActive ? "2px solid #00d4a0" : isPast ? "1px solid rgba(0,212,160,0.3)" : "1px solid rgba(255,255,255,0.08)",
                          color: isActive ? "#09090b" : isPast ? "#00d4a0" : "#52525b",
                          boxShadow: isActive ? "0 0 16px rgba(0,212,160,0.4)" : "none",
                        }}>
                        {isPast && !isActive ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: isActive ? "#00d4a0" : isPast ? "#71717a" : "#3f3f46", whiteSpace: "nowrap" }}>
                        {lvl.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1 rounded-full overflow-hidden mx-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((progress.challenges_completed / 6) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #00d4a0, #00ffbf)", boxShadow: "0 0 8px rgba(0,212,160,0.5)" }} />
              </div>
            </div>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Completed", value: progress.challenges_completed, sub: "challenges", color: "#00d4a0" },
              { label: "Best Score", value: attempts.length > 0 ? Math.max(...attempts.map(a => a.total_score)) : "—", sub: "out of 100", color: "#f59e0b" },
              { label: "Avg Score", value: progress.avg_score > 0 ? progress.avg_score : "—", sub: "across all attempts", color: "#a78bfa" },
              { label: "Badges", value: badges.length, sub: `of ${BADGE_DEFINITIONS.length} total`, color: "#38bdf8" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden" }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 80% 20%, ${stat.color}10 0%, transparent 60%)` }} />
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "30px", color: "#fafafa", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "6px" }}>{stat.value}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: stat.color, marginBottom: "2px" }}>{stat.label}</div>
                <div style={{ fontSize: "11px", color: "#3f3f46" }}>{stat.sub}</div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${stat.color}30, transparent)` }} />
              </motion.div>
            ))}
          </div>

          {/* Skills + Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px" }}>
              <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "16px", color: "#fafafa", letterSpacing: "-0.02em", marginBottom: "6px" }}>Skill Breakdown</h3>
              <p style={{ fontSize: "12px", color: "#52525b", marginBottom: "24px" }}>Calculated from your submission scores</p>
              {[
                { label: "Elicitation & Problem Framing", pct: skills.elicitation, color: "#00d4a0" },
                { label: "Root Cause & Requirements", pct: skills.requirements, color: "#a78bfa" },
                { label: "Solution Evaluation", pct: skills.solutionAnalysis, color: "#f97316" },
                { label: "Stakeholder Management", pct: skills.stakeholderMgmt, color: "#38bdf8" },
              ].map((skill, i) => (
                <div key={skill.label} style={{ marginBottom: i < 3 ? "20px" : "0" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#a1a1aa" }}>{skill.label}</span>
                    <span style={{ fontSize: "12px", color: skill.pct > 0 ? skill.color : "#52525b", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{skill.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${skill.pct}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: skill.color, boxShadow: skill.pct > 0 ? `0 0 8px ${skill.color}40` : "none" }} />
                  </div>
                </div>
              ))}
              {attempts.length === 0 && (
                <div className="mt-4 text-center py-4">
                  <p style={{ fontSize: "12px", color: "#52525b" }}>Complete a challenge to see your skill scores</p>
                  <button onClick={() => router.push("/scenarios")} style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, color: "#00d4a0", background: "none", border: "none", cursor: "pointer" }}>Browse challenges →</button>
                </div>
              )}
            </motion.div>

            {/* Badges */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px" }}>
              <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "16px", color: "#fafafa", letterSpacing: "-0.02em", marginBottom: "6px" }}>Achievements</h3>
              <p style={{ fontSize: "12px", color: "#52525b", marginBottom: "20px" }}>{badges.length} of {BADGE_DEFINITIONS.length} badges earned</p>
              <div className="grid grid-cols-2 gap-3">
                {BADGE_DEFINITIONS.map(badge => {
                  const earned = badges.some(b => b.badge_id === badge.id);
                  const earnedData = badges.find(b => b.badge_id === badge.id);
                  return (
                    <div key={badge.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: earned ? `${badge.color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${earned ? badge.color + "20" : "rgba(255,255,255,0.04)"}`, opacity: earned ? 1 : 0.4 }}>
                      <span style={{ fontSize: "22px", filter: earned ? "none" : "grayscale(1)", flexShrink: 0 }}>{badge.icon}</span>
                      <div className="min-w-0">
                        <div style={{ fontSize: "11px", fontWeight: 700, color: earned ? badge.color : "#52525b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{badge.name}</div>
                        <div style={{ fontSize: "10px", color: "#3f3f46", marginTop: "1px", lineHeight: 1.4 }}>
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
            style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px" }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "16px", color: "#fafafa", letterSpacing: "-0.02em", marginBottom: "6px" }}>Submission History</h3>
            <p style={{ fontSize: "12px", color: "#52525b", marginBottom: "20px" }}>Every challenge you have submitted</p>

            {attempts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: "#3f3f46" }} />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#52525b", fontFamily: "Syne, sans-serif" }}>No submissions yet</p>
                <p style={{ fontSize: "13px", color: "#3f3f46", marginTop: "6px", marginBottom: "16px" }}>Complete your first challenge to see your history here</p>
                <button onClick={() => router.push("/scenarios")} className="btn-teal" style={{ padding: "10px 20px", fontSize: "13px" }}>
                  Browse Challenges <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt, i) => {
                  const typeColor = typeColors[attempt.challenge_type] || "#71717a";
                  const scoreColor = attempt.total_score >= 80 ? "#00d4a0" : attempt.total_score >= 60 ? "#f59e0b" : "#f87171";
                  return (
                    <motion.div key={attempt.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-5 p-4 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${typeColor}10`, border: `1px solid ${typeColor}20` }}>
                        <span style={{ fontSize: "14px", fontFamily: "Syne, sans-serif", fontWeight: 800, color: typeColor }}>
                          {attempt.total_score}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "13px", color: "#fafafa" }} className="truncate">{attempt.challenge_title}</div>
                        <div style={{ fontSize: "11px", color: "#52525b", marginTop: "2px" }}>
                          {attempt.industry} · {attempt.difficulty_mode.charAt(0).toUpperCase() + attempt.difficulty_mode.slice(1)} · {new Date(attempt.completed_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "18px", color: scoreColor, letterSpacing: "-0.03em" }}>
                            {attempt.total_score}<span style={{ fontSize: "11px", color: "#52525b" }}>/100</span>
                          </div>
                        </div>
                        <button onClick={() => router.push(`/scenarios/${attempt.challenge_id}?mode=${attempt.difficulty_mode}`)}
                          style={{ fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", color: "#71717a", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
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