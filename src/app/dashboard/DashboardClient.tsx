"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight, ChevronUp, ArrowRight, Bell,
  Zap, Award, Target, CheckCircle2,
  Flame, Clock, Users,
} from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import type { ChallengeAttempt, UserBadge, UserProgress } from "@/lib/progress";
import { BADGE_DEFINITIONS } from "@/lib/progress";

interface Stats {
  attempts: ChallengeAttempt[];
  badges: UserBadge[];
  progress: UserProgress;
  skills: { elicitation: number; requirements: number; solutionAnalysis: number; stakeholderMgmt: number };
  levelInfo: { level: string; nextLevel: string; progressPct: number; challengesNeeded: number };
}

interface DashboardClientProps {
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
  upgradeSuccess?: boolean;
  emailConfirmed?: boolean;
  stats: Stats;
}

const featuredChallenges = [
  {
    id: "banking-discovery-001",
    title: "Rising Customer Churn at First National Bank",
    type: "Discovery",
    industry: "Banking/Finance",
    duration: "30–45 min",
    stakeholders: 2,
    typeColor: "#38bdf8",
    img: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=600&q=80",
    imgAlt: "Bank branch interior",
  },
  {
    id: "healthcare-requirements-001",
    title: "Patient Referral System Overhaul",
    type: "Requirements",
    industry: "Healthcare",
    duration: "45–60 min",
    stakeholders: 2,
    typeColor: "#a78bfa",
    img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80",
    imgAlt: "Hospital corridor",
  },
  {
    id: "energy-solution-001",
    title: "Field Inspection Digitization at Cascade Energy",
    type: "Solution Analysis",
    industry: "Energy/Oil & Gas",
    duration: "45–60 min",
    stakeholders: 2,
    typeColor: "#fb923c",
    img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    imgAlt: "Energy industrial operations",
  },
];

const HERO_IMG = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80";


export default function DashboardClient({ profile, user, upgradeSuccess, emailConfirmed, stats }: DashboardClientProps) {
  const router = useRouter();
  const [rightColOpen, setRightColOpen] = useState(false);
  const [isPro, setIsPro] = useState(
    profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise"
  );

  // On mount: read params directly from the URL (useSearchParams is unreliable inside Suspense)
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
      .then(async res => {
        const data = await res.json();
        console.log("[dashboard] verify-session response:", res.status, data);
        if (data.success) {
          setIsPro(true);
          window.history.replaceState({}, "", "/dashboard");
        }
      })
      .catch(err => console.error("[dashboard] verify-session fetch error:", err));
  }, []);
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const { progress, skills, levelInfo, badges, attempts } = stats;

  const statCards = [
    { label: "Challenges Done", value: String(progress.challenges_completed), sub: "of 6 available",          color: "#1fbf9f", icon: CheckCircle2 },
    { label: "Day Streak",      value: String(progress.current_streak),        sub: progress.current_streak > 0 ? "Keep it going" : "Start today", color: "#fb923c", icon: Flame },
    { label: "Avg Score",       value: progress.avg_score > 0 ? String(progress.avg_score) : "—", sub: progress.avg_score > 0 ? progress.avg_score >= 80 ? "Excellent" : "Keep improving" : "Submit a challenge", color: "#a78bfa", icon: Target },
    { label: "Hours Practiced", value: progress.total_hours > 0 ? `${progress.total_hours}h` : "0h", sub: "Goal: 1 hr / week", color: "#38bdf8", icon: Clock },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      <AppSidebar activeHref="/dashboard" profile={isPro && profile ? { full_name: profile.full_name ?? null, subscription_tier: "pro" } : profile} user={user} />

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-20" style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>Dashboard</h1>
            <p className="type-meta" style={{ marginTop: "4px" }}>Good to see you, {firstName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ border: "1px solid var(--border)", color: "var(--text-3)", background: "none", cursor: "pointer" }}>
              <Bell className="w-4 h-4" />
            </button>
            {isPro
              ? <span className="badge-teal"><Award className="w-3 h-3" />Pro</span>
              : <button onClick={() => router.push("/pricing")} className="btn-teal" style={{ padding: "8px 18px", fontSize: "13px" }}><Zap className="w-3.5 h-3.5" />Upgrade</button>
            }
          </div>
        </header>

        <div className="px-8 py-8" style={{ maxWidth: "1100px" }}>

          {emailConfirmed && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="portal-card-static px-6 py-4 flex items-center gap-3 mb-6" style={{ borderColor: "var(--teal-border)", background: "var(--teal-soft)" }}>
              <div className="teal-dot" />
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--teal)" }}>Email confirmed. You are all set.</p>
            </motion.div>
          )}

          {upgradeSuccess && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="portal-card-static px-6 py-4 flex items-center gap-3 mb-6" style={{ borderColor: "var(--teal-border)", background: "var(--teal-soft)" }}>
              <div className="teal-dot" />
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--teal)" }}>Welcome to Pro — all challenges and features are now unlocked.</p>
            </motion.div>
          )}

          {/* HERO */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative overflow-hidden mb-6" style={{ borderRadius: "20px", border: "1px solid var(--border)", minHeight: "240px" }}>
            <img src={HERO_IMG} alt="Business analysis workspace" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.18) saturate(0.45)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(9,9,11,0.97) 0%, rgba(9,9,11,0.88) 50%, rgba(9,9,11,0.3) 100%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(31,191,159,0.05) 0%, transparent 55%)" }} />
            <div className="relative px-10 py-9">
              <div className="flex items-center gap-2 mb-4">
                <span className="badge-teal" style={{ fontSize: "11px" }}>Recommended</span>
                <span className="badge-zinc" style={{ fontSize: "11px" }}>Banking/Finance · Discovery</span>
              </div>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "26px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "10px", maxWidth: "480px" }}>
                Rising Customer Churn<br /><span style={{ color: "var(--teal)" }}>at First National Bank</span>
              </h2>
              <p className="type-body" style={{ maxWidth: "420px", marginBottom: "24px", fontSize: "14px" }}>A 23% spike in account closures. Two stakeholders with conflicting stories. Find the root cause before the board meeting.</p>
              <div className="flex items-center gap-8 mb-7">
                {[{ label: "Duration", value: "30–45 min" }, { label: "Stakeholders", value: "2 interviews" }, { label: "Modes", value: "Normal / Hard / Expert" }].map(item => (
                  <div key={item.label}>
                    <div className="type-label" style={{ marginBottom: "2px" }}>{item.label}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => router.push("/scenarios/banking-discovery-001?mode=normal")} className="btn-teal" style={{ fontSize: "14px" }}>Begin Challenge <ArrowRight className="w-4 h-4" /></button>
                <button onClick={() => router.push("/scenarios")} className="btn-outline" style={{ fontSize: "14px" }}>Browse all challenges</button>
              </div>
            </div>
          </motion.div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="relative overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "22px 20px" }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 85% 15%, ${stat.color}0d 0%, transparent 60%)` }} />
                <div className="relative">
                  <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "32px", color: "var(--text-1)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "6px" }}>{stat.value}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: stat.color, marginBottom: "3px" }}>{stat.label}</div>
                  <div className="type-meta">{stat.sub}</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, ${stat.color}22, transparent)` }} />
              </motion.div>
            ))}
          </div>

          {/* BOTTOM GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "17px", color: "var(--text-1)", letterSpacing: "-0.02em" }}>Start Practicing</h2>
                  <p className="type-meta" style={{ marginTop: "3px" }}>Three challenges to build your foundation</p>
                </div>
                <button onClick={() => router.push("/scenarios")} style={{ fontSize: "13px", fontWeight: 600, color: "var(--teal)", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer" }}>
                  View all 6 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {featuredChallenges.map((ch, i) => {
                  const isCompleted = attempts.some(a => a.challenge_id === ch.id);
                  const bestScore   = attempts.filter(a => a.challenge_id === ch.id).reduce((best, a) => Math.max(best, a.total_score), 0);
                  return (
                    <motion.div key={ch.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                      onClick={() => router.push(`/scenarios/${ch.id}?mode=normal`)}
                      className="group relative overflow-hidden cursor-pointer"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", alignItems: "stretch", minHeight: "108px", transition: "all 0.22s ease" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${ch.typeColor}30`; el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.45)"; el.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; el.style.transform = "none"; }}>
                      <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "120px", borderRadius: "16px 0 0 16px" }}>
                        <img src={ch.img} alt={ch.imgAlt} className="w-full h-full object-cover" style={{ filter: "brightness(0.38) saturate(0.65)" }} />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 45%, var(--card) 100%)" }} />
                      </div>
                      <div className="flex-1 px-5 py-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px", background: `${ch.typeColor}12`, color: ch.typeColor, border: `1px solid ${ch.typeColor}22`, letterSpacing: "0.05em" }}>{ch.type.toUpperCase()}</span>
                          {isCompleted && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px", background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)" }}>DONE · {bestScore}/100</span>}
                        </div>
                        <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 600, fontSize: "14px", color: "var(--text-1)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</div>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="type-meta flex items-center gap-1.5"><Clock className="w-3 h-3" />{ch.duration}</span>
                          <span className="type-meta flex items-center gap-1.5"><Users className="w-3 h-3" />{ch.stakeholders} stakeholders</span>
                        </div>
                      </div>
                      <div className="flex items-center pr-5 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${ch.typeColor}10`, border: `1px solid ${ch.typeColor}22` }}>
                          <ChevronRight className="w-4 h-4" style={{ color: ch.typeColor }} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <button
                className="w-full flex items-center justify-between lg:cursor-default"
                onClick={() => setRightColOpen(o => !o)}
                style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
              >
                <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "17px", color: "var(--text-1)", letterSpacing: "-0.02em" }}>Skills & Badges</h2>
                <ChevronUp className="w-4 h-4 lg:hidden" style={{ color: "var(--text-3)", flexShrink: 0, transform: rightColOpen ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s ease" }} />
              </button>

              <div className={`space-y-4 ${rightColOpen ? "block" : "hidden"} lg:block`}>
              <div className="portal-card-static p-5" style={{ borderRadius: "16px" }}>
                <p className="type-meta" style={{ marginBottom: "16px" }}>Skill Progress</p>
                {[
                  { label: "Elicitation",      pct: skills.elicitation,      color: "var(--teal)" },
                  { label: "Requirements",      pct: skills.requirements,     color: "#a78bfa"     },
                  { label: "Solution Analysis", pct: skills.solutionAnalysis, color: "#fb923c"     },
                  { label: "Stakeholder Mgmt",  pct: skills.stakeholderMgmt,  color: "#38bdf8"     },
                ].map((skill, i) => (
                  <div key={skill.label} style={{ marginBottom: i < 3 ? "14px" : 0 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-2)" }}>{skill.label}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "'JetBrains Mono',monospace" }}>{skill.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${skill.pct}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: skill.color }} />
                    </div>
                  </div>
                ))}
                {attempts.length === 0 && <p className="type-meta" style={{ marginTop: "12px", textAlign: "center" }}>Complete a challenge to see scores</p>}
              </div>

              <div className="portal-card-static p-5" style={{ borderRadius: "16px" }}>
                <p className="type-meta" style={{ marginBottom: "14px" }}>Badges — {badges.length} of {BADGE_DEFINITIONS.length} earned</p>
                <div className="grid grid-cols-4 gap-2">
                  {BADGE_DEFINITIONS.map(badge => {
                    const earned = badges.some(b => b.badge_id === badge.id);
                    return (
                      <div key={badge.id} title={`${badge.name}: ${badge.description}`} className="flex flex-col items-center gap-1.5 p-2 rounded-xl"
                        style={{ background: earned ? `${badge.color}0d` : "rgba(255,255,255,0.02)", border: `1px solid ${earned ? badge.color + "20" : "rgba(255,255,255,0.05)"}`, opacity: earned ? 1 : 0.35 }}>
                        <span style={{ fontSize: "18px", filter: earned ? "none" : "grayscale(1)" }}>{badge.icon}</span>
                        <span style={{ fontSize: "9px", fontWeight: 600, color: earned ? badge.color : "var(--text-4)", textAlign: "center", lineHeight: 1.2 }}>{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => router.push("/progress")} style={{ width: "100%", marginTop: "14px", fontSize: "13px", fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                  View full progress →
                </button>
              </div>

              {!isPro && (
                <div className="relative overflow-hidden p-5" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }}>
                  <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(31,191,159,0.06) 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
                  <div className="relative">
                    <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "15px", color: "var(--text-1)", marginBottom: "6px" }}>Unlock Pro</div>
                    <p className="type-body" style={{ fontSize: "13px", marginBottom: "14px" }}>All 6 challenges, Expert mode, full AI evaluation and scoring.</p>
                    <button onClick={() => router.push("/pricing")} className="btn-teal" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "13px" }}>
                      <Zap className="w-3.5 h-3.5" />Upgrade — $29/mo
                    </button>
                  </div>
                </div>
              )}
              </div>{/* end collapsible */}
            </div>
          </div>

          <div style={{ height: "48px" }} />
        </div>
      </main>
    </div>
  );
}