"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { challenges } from "@/data/challenges";
import {
  BookOpen, Clock, Lock, ChevronRight, Zap,
  Target, Search, ArrowLeft, Users, X,
  Settings, TrendingUp, GraduationCap,
  BriefcaseBusiness, Trophy, LayoutDashboard, Filter,
} from "lucide-react";

// ─── Type config ────────────────────────────────────────────────────────────
const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  "discovery":           { label: "Discovery",        color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  "requirements":        { label: "Requirements",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "solution-analysis":   { label: "Solution Analysis",color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  "uat":                 { label: "UAT",               color: "#1fbf9f", bg: "rgba(31,191,159,0.12)"  },
  "production-incident": { label: "Incident",          color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  "facilitation":        { label: "Facilitation",      color: "#facc15", bg: "rgba(250,204,21,0.12)"  },
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  "beginner":     { label: "Beginner",     color: "#22c55e" },
  "intermediate": { label: "Intermediate", color: "#eab308" },
  "advanced":     { label: "Advanced",     color: "#ef4444" },
};

// ─── Real Unsplash images per challenge ─────────────────────────────────────
const challengeImages: Record<string, { url: string; credit: string }> = {
  "banking-discovery-001": {
    url: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&q=80",
    credit: "Banking operations",
  },
  "healthcare-requirements-001": {
    url: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&q=80",
    credit: "Clinical operations",
  },
  "energy-solution-001": {
    url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
    credit: "Field inspection",
  },
  "saas-uat-001": {
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
    credit: "Product team",
  },
  "insurance-incident-001": {
    url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
    credit: "Claims office",
  },
  "saas-facilitation-001": {
    url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    credit: "Strategy session",
  },
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80";

const industries = ["All", "Banking/Finance", "Healthcare", "Energy/Oil & Gas", "Technology/SaaS", "Insurance"];
const typeFilters = ["All Types", "Discovery", "Requirements", "Solution Analysis", "UAT", "Incident", "Facilitation"];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",      href: "/dashboard" },
  { icon: BookOpen,        label: "Challenges",     href: "/scenarios", active: true },
  { icon: TrendingUp,      label: "Progress",       href: "/progress" },
  { icon: GraduationCap,   label: "Learning Paths", href: "/learning",  locked: true },
  { icon: Target,          label: "Exam Prep",      href: "/exam",      locked: true },
  { icon: BriefcaseBusiness, label: "Career Suite", href: "/career",    locked: true },
  { icon: Trophy,          label: "Portfolio",      href: "/portfolio", locked: true },
];

interface ScenariosClientProps {
  profile: { subscription_tier: string; full_name?: string | null } | null;
}

export default function ScenariosClient({ profile }: ScenariosClientProps) {
  const router = useRouter();
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [activeType,     setActiveType]     = useState("All Types");
  const [searchQuery,    setSearchQuery]    = useState("");

  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";
  const initials = (profile?.full_name?.[0] || "B").toUpperCase();
  const completedChallenges = 0;
  const totalChallenges = challenges.length;

  const filtered = challenges.filter(c => {
    const matchInd  = activeIndustry === "All" || c.industry === activeIndustry;
    const matchType = activeType === "All Types" ||
      typeConfig[c.type]?.label.toLowerCase() === activeType.toLowerCase();
    const matchSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchInd && matchType && matchSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col relative overflow-hidden"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none dot-grid" />
        {/* top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(31,191,159,0.05) 0%, transparent 70%)",
        }} />

        {/* Logo */}
        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
            }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--teal)" }} />
            </div>
            <div>
              <div style={{
                fontFamily: "'Inter','Open Sans',sans-serif",
                fontWeight: 800, fontSize: "15px", color: "var(--text-1)", letterSpacing: "-0.03em",
              }}>
                The<span style={{ color: "var(--teal)" }}>BA</span>Portal
              </div>
              <div className="type-label" style={{ marginTop: "1px" }}>v3.0 · Phase 1</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="type-label px-3 pb-3">Platform</div>
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => !item.locked && router.push(item.href)}
              className="sidebar-item"
              style={
                item.active
                  ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)" }
                  : item.locked
                  ? { color: "var(--text-4)", cursor: "not-allowed" }
                  : {}
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.active && <div className="teal-dot" />}
              {item.locked && (
                <span className="type-label" style={{
                  padding: "2px 6px", borderRadius: "4px",
                  background: "rgba(255,255,255,0.03)", color: "var(--text-4)",
                }}>SOON</span>
              )}
            </button>
          ))}

          <div className="type-label px-3 pt-5 pb-3">Account</div>
          <button className="sidebar-item" onClick={() => router.push("/settings")}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </nav>

        {/* BA Level */}
        <div className="relative px-4 pb-4">
          <div className="rounded-2xl p-4" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="type-meta">BA Level</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--teal)" }}>Rookie</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{
                width: `${(completedChallenges / totalChallenges) * 100}%`,
                background: "var(--teal)",
              }} />
            </div>
            <div className="type-meta" style={{ marginTop: "8px" }}>
              {completedChallenges}/{totalChallenges} challenges complete
            </div>
          </div>
        </div>

        {/* User */}
        <div className="relative px-3 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer"
            style={{ transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
              background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)",
              fontFamily: "'Inter','Open Sans',sans-serif",
            }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }} className="truncate">
                {profile?.full_name || "BA Learner"}
              </div>
              <div className="type-meta">{isPro ? "Pro Member" : "Free Plan"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Sticky header */}
        <header
          className="px-8 py-5 flex items-center gap-4 sticky top-0 z-20"
          style={{
            background: "rgba(9,9,11,0.88)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search challenges..."
              className="portal-input pl-9"
              style={{ fontSize: "14px", paddingTop: "9px", paddingBottom: "9px" }}
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="type-meta">{filtered.length} of {challenges.length} challenges</span>
            {!isPro && (
              <button onClick={() => router.push("/pricing")} className="btn-teal" style={{ padding: "8px 18px", fontSize: "13px" }}>
                <Zap className="w-3.5 h-3.5" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </header>

        <div className="px-8 py-8" style={{ maxWidth: "960px" }}>

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="type-hero" style={{ fontSize: "28px", marginBottom: "8px" }}>
              BA Simulation Challenges
            </h1>
            <p className="type-body">
              Interview AI stakeholders. Produce real deliverables. Get scored by a Senior BA Coach.
            </p>
          </div>

          {/* Filter panel */}
          <div className="mb-8 p-4 rounded-2xl" style={{
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            {/* Industry row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-label" style={{ minWidth: "58px" }}>Industry</span>
              {industries.map(ind => (
                <button
                  key={ind}
                  onClick={() => setActiveIndustry(ind)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "all 0.15s",
                    ...(activeIndustry === ind
                      ? { background: "var(--teal-soft)", color: "var(--teal)", borderColor: "var(--teal-border)" }
                      : { background: "none", color: "var(--text-3)" }),
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>

            <div style={{ height: "1px", background: "var(--border)", margin: "10px 0" }} />

            {/* Type row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-label" style={{ minWidth: "58px" }}>Type</span>
              {typeFilters.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    transition: "all 0.15s",
                    ...(activeType === t
                      ? { background: "rgba(167,139,250,0.10)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.22)" }
                      : { background: "none", color: "var(--text-3)" }),
                  }}
                >
                  {t}
                </button>
              ))}

              {(activeIndustry !== "All" || activeType !== "All Types" || searchQuery) && (
                <button
                  onClick={() => { setActiveIndustry("All"); setActiveType("All Types"); setSearchQuery(""); }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(248,113,113,0.07)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.15)",
                    transition: "all 0.15s",
                  }}
                >
                  <X className="w-3 h-3" />Clear
                </button>
              )}
            </div>
          </div>

          {/* ── CHALLENGE CARDS ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-24 flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                  }}>
                    <Filter className="w-6 h-6" style={{ color: "var(--text-4)" }} />
                  </div>
                  <p className="type-card" style={{ color: "var(--text-3)" }}>No matches</p>
                  <p className="type-meta" style={{ marginTop: "6px" }}>Try adjusting your filters</p>
                </motion.div>
              ) : (
                filtered.map((challenge, i) => {
                  const type = typeConfig[challenge.type];
                  const diff = difficultyConfig[challenge.difficulty];
                  const isLocked = challenge.tier === "pro" && !isPro;
                  const img = challengeImages[challenge.id] || { url: FALLBACK_IMAGE, credit: "Business operations" };

                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      onClick={() => isLocked
                        ? router.push("/pricing")
                        : router.push(`/scenarios/${challenge.id}?mode=normal`)}
                      className="group relative overflow-hidden cursor-pointer"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "18px",
                        display: "flex",
                        transition: "all 0.25s ease",
                        minHeight: "160px",
                      }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = `${type?.color}30`;
                        el.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5)";
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--border)";
                        el.style.boxShadow = "none";
                      }}
                    >
                      {/* Locked overlay */}
                      {isLocked && (
                        <div
                          className="absolute inset-0 z-20 flex items-center justify-end pr-7"
                          style={{ background: "rgba(9,9,11,0.65)", backdropFilter: "blur(4px)", borderRadius: "18px" }}
                        >
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
                            background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
                          }}>
                            <Lock className="w-3.5 h-3.5" style={{ color: "var(--teal)" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--teal)" }}>Pro Required</span>
                          </div>
                        </div>
                      )}

                      {/* ── Photo panel ─────────────────────────────────────── */}
                      <div
                        className="relative flex-shrink-0 overflow-hidden"
                        style={{ width: "220px", borderRadius: "18px 0 0 18px" }}
                      >
                        <img
                          src={img.url}
                          alt={img.credit}
                          className="w-full h-full object-cover"
                          style={{
                            filter: "brightness(0.45) saturate(0.75)",
                            transition: "transform 0.4s ease, filter 0.3s ease",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLImageElement).style.filter = "brightness(0.55) saturate(0.85)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLImageElement).style.filter = "brightness(0.45) saturate(0.75)";
                          }}
                        />
                        <div className="absolute inset-0" style={{
                          background: "linear-gradient(to right, rgba(19,19,24,0) 55%, var(--card) 100%)",
                        }} />
                        <div
                          className="absolute top-4 left-4"
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: `${type?.color}20`,
                            color: type?.color,
                            border: `1px solid ${type?.color}35`,
                            letterSpacing: "0.05em",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {type?.label?.toUpperCase()}
                        </div>
                      </div>

                      {/* ── Content panel ───────────────────────────────────── */}
                      <div className="flex-1 px-7 py-6 flex flex-col justify-center">

                        {/* Tags row */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span style={{
                            fontSize: "11px", fontWeight: 700,
                            padding: "3px 10px", borderRadius: "5px",
                            background: `${diff?.color}12`, color: diff?.color,
                            border: `1px solid ${diff?.color}22`,
                            letterSpacing: "0.03em",
                          }}>
                            {diff?.label}
                          </span>
                          <span style={{
                            fontSize: "11px", fontWeight: 600,
                            padding: "3px 10px", borderRadius: "5px",
                            background: "rgba(255,255,255,0.05)", color: "var(--text-2)",
                            border: "1px solid var(--border)",
                          }}>
                            {challenge.industry}
                          </span>
                          {challenge.tier === "pro" && (
                            <span style={{
                              fontSize: "11px", fontWeight: 700,
                              padding: "3px 10px", borderRadius: "5px",
                              background: "var(--teal-soft)", color: "var(--teal)",
                              border: "1px solid var(--teal-border)",
                            }}>PRO</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3
                          className="type-card"
                          style={{ marginBottom: "10px", transition: "color 0.15s" }}
                        >
                          {challenge.title}
                        </h3>

                        {/* Description */}
                        <p
                          className="type-body"
                          style={{
                            fontSize: "14px",
                            marginBottom: "18px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as const,
                            overflow: "hidden",
                          }}
                        >
                          {challenge.brief.situation}
                        </p>

                        {/* Meta + CTA */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <span className="flex items-center gap-1.5 type-meta">
                              <Clock className="w-3.5 h-3.5" />
                              {challenge.duration}
                            </span>
                            <span className="flex items-center gap-1.5 type-meta">
                              <Users className="w-3.5 h-3.5" />
                              {challenge.stakeholders.length} stakeholder{challenge.stakeholders.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* CTA button */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              background: `${type?.color}12`,
                              border: `1px solid ${type?.color}28`,
                              transition: "all 0.2s ease",
                            }}
                          >
                            <ChevronRight className="w-4 h-4" style={{ color: type?.color }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          <div style={{ height: "48px" }} />
        </div>
      </main>
    </div>
  );
}