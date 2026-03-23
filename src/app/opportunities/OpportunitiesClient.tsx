"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Briefcase, Clock, ExternalLink, ChevronRight, Globe, Users, Zap } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrepLink {
  label: string;
  href: string;
  color: string;
}

interface Listing {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: "remote" | "hybrid" | "onsite";
  level: "entry" | "junior" | "intermediate";
  industry: string;
  description: string;
  posted: string;
  applyUrl: string;
  prep: PrepLink[];
}

interface Volunteer {
  id: string;
  title: string;
  org: string;
  location: string;
  commitment: string;
  description: string;
  skills: string[];
  prep: PrepLink[];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const JOBS: Listing[] = [
  {
    id: "td-junior-ba",
    title: "Junior Business Analyst",
    company: "TD Bank",
    location: "Toronto, ON",
    workType: "hybrid",
    level: "entry",
    industry: "Banking / Finance",
    description: "Support business analysis across retail banking initiatives. Gather and document requirements, facilitate stakeholder workshops, and produce BRDs under senior BA guidance.",
    posted: "Active",
    applyUrl: "https://jobs.td.com",
    prep: [
      { label: "Banking Discovery Challenge", href: "/scenarios/banking-discovery-001", color: "#38bdf8" },
      { label: "Career Advisor", href: "/career", color: "#1fbf9f" },
      { label: "PitchReady", href: "/pitchready", color: "#a78bfa" },
    ],
  },
  {
    id: "shopify-associate-ba",
    title: "Associate Business Analyst",
    company: "Shopify",
    location: "Ottawa, ON",
    workType: "remote",
    level: "entry",
    industry: "Technology / SaaS",
    description: "Work with product and engineering teams to translate merchant needs into clear requirements. Own discovery conversations, write user stories, and support UAT cycles.",
    posted: "Active",
    applyUrl: "https://www.shopify.com/careers",
    prep: [
      { label: "CRM UAT Challenge", href: "/scenarios/saas-uat-001", color: "#1fbf9f" },
      { label: "Learning: Module 3 — Requirements", href: "/learning", color: "#fb923c" },
      { label: "PitchReady", href: "/pitchready", color: "#a78bfa" },
    ],
  },
  {
    id: "deloitte-ba-analyst",
    title: "Business Analyst (Consulting)",
    company: "Deloitte Canada",
    location: "Toronto / Montreal",
    workType: "hybrid",
    level: "junior",
    industry: "Consulting",
    description: "Join Deloitte's technology consulting practice. Engage with clients across financial services, government, and healthcare to define solutions and drive digital transformation.",
    posted: "Active",
    applyUrl: "https://www2.deloitte.com/ca/en/careers.html",
    prep: [
      { label: "Healthcare Requirements Challenge", href: "/scenarios/healthcare-requirements-001", color: "#a78bfa" },
      { label: "Stakeholder Interview Practice", href: "/pitchready", color: "#a78bfa" },
      { label: "Career Advisor", href: "/career", color: "#1fbf9f" },
    ],
  },
  {
    id: "cibc-junior-ba",
    title: "Junior Business Analyst",
    company: "CIBC",
    location: "Toronto, ON",
    workType: "hybrid",
    level: "entry",
    industry: "Banking / Finance",
    description: "Support the delivery of digital banking features by bridging business and technology. Document as-is and to-be processes, identify gaps, and track requirements through delivery.",
    posted: "Active",
    applyUrl: "https://careers.cibc.com",
    prep: [
      { label: "Banking Discovery Challenge", href: "/scenarios/banking-discovery-001", color: "#38bdf8" },
      { label: "Learning: Module 1 — BA Foundations", href: "/learning", color: "#fb923c" },
      { label: "Portfolio Builder", href: "/portfolio", color: "#1fbf9f" },
    ],
  },
  {
    id: "ontario-bsa",
    title: "Business Systems Analyst",
    company: "Government of Ontario",
    location: "Toronto, ON",
    workType: "hybrid",
    level: "junior",
    industry: "Government / Public Sector",
    description: "Analyse business processes and information systems for Ontario ministries. Support procurement and implementation of enterprise technology solutions.",
    posted: "Active",
    applyUrl: "https://www.ontario.ca/page/careers-government-ontario",
    prep: [
      { label: "Requirements Elicitation Challenge", href: "/scenarios", color: "#facc15" },
      { label: "Exam Prep (BABOK)", href: "/exam", color: "#facc15" },
      { label: "Career Advisor", href: "/career", color: "#1fbf9f" },
    ],
  },
  {
    id: "cgi-ba",
    title: "Junior Business Analyst",
    company: "CGI Group",
    location: "Ottawa / Montreal / Toronto",
    workType: "hybrid",
    level: "entry",
    industry: "IT Consulting",
    description: "Assist senior consultants on government and enterprise IT projects. Participate in requirements workshops, produce functional specs, and support testing phases.",
    posted: "Active",
    applyUrl: "https://www.cgi.com/canada/en-ca/careers",
    prep: [
      { label: "ERP Implementation Challenge", href: "/scenarios/manufacturing-erp-001", color: "#64748b" },
      { label: "Learning: Full SDLC Story", href: "/learning", color: "#fb923c" },
      { label: "PitchReady", href: "/pitchready", color: "#a78bfa" },
    ],
  },
];

const VOLUNTEER: Volunteer[] = [
  {
    id: "united-way-ba",
    title: "Business Analyst Volunteer",
    org: "United Way Greater Toronto Area",
    location: "Toronto / Remote",
    commitment: "4–6 hrs/week",
    description: "Support the digital team with requirements gathering and process documentation for community programme delivery. Real stakeholder conversations with programme managers and frontline staff.",
    skills: ["Requirements gathering", "Process mapping", "Stakeholder interviews"],
    prep: [
      { label: "Discovery Challenge", href: "/scenarios/banking-discovery-001", color: "#38bdf8" },
      { label: "Learning: Stakeholder Management", href: "/learning", color: "#fb923c" },
    ],
  },
  {
    id: "pathways-tech-volunteer",
    title: "Technology & Systems Volunteer",
    org: "Pathways to Education Canada",
    location: "Toronto, ON",
    commitment: "3–5 hrs/week",
    description: "Help document and improve Pathways' student tracking and case management systems. Work directly with programme coordinators to analyse current workflows and identify improvements.",
    skills: ["Process analysis", "Documentation", "System analysis"],
    prep: [
      { label: "Healthcare Requirements Challenge", href: "/scenarios/healthcare-requirements-001", color: "#a78bfa" },
      { label: "Portfolio Builder", href: "/portfolio", color: "#1fbf9f" },
    ],
  },
  {
    id: "code-for-canada",
    title: "Civic Tech Business Analyst",
    org: "Code for Canada",
    location: "Remote",
    commitment: "5–8 hrs/week",
    description: "Collaborate with government partners to improve digital public services. Define problems, run discovery sprints, and produce artefacts that shape real government products.",
    skills: ["Service design", "Discovery sprints", "Government digital"],
    prep: [
      { label: "Learning: Full SDLC Story", href: "/learning", color: "#fb923c" },
      { label: "PitchReady", href: "/pitchready", color: "#a78bfa" },
    ],
  },
  {
    id: "technovation-ba",
    title: "BA Mentor — Youth Tech Programme",
    org: "Technovation Girls Canada",
    location: "Remote",
    commitment: "2–3 hrs/week",
    description: "Mentor student teams building tech solutions for social challenges. Guide them through problem definition, requirements gathering, and solution scoping — genuine BA practice in a low-stakes environment.",
    skills: ["Mentoring", "Problem framing", "Requirements"],
    prep: [
      { label: "Career Advisor — New to BA", href: "/career", color: "#1fbf9f" },
      { label: "Learning: Module 1", href: "/learning", color: "#fb923c" },
    ],
  },
];

// ── Config ────────────────────────────────────────────────────────────────────
const workTypeConfig = {
  remote:  { label: "Remote",  color: "#1fbf9f", bg: "rgba(31,191,159,0.1)"   },
  hybrid:  { label: "Hybrid",  color: "#38bdf8", bg: "rgba(56,189,248,0.1)"   },
  onsite:  { label: "Onsite",  color: "#fb923c", bg: "rgba(251,146,60,0.1)"   },
};
const levelConfig = {
  entry:        { label: "Entry Level", color: "#22c55e" },
  junior:       { label: "Junior",      color: "#eab308" },
  intermediate: { label: "Intermediate",color: "#ef4444" },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OpportunitiesClient({ profile, user }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab]         = useState<"jobs" | "volunteer">("jobs");
  const [workFilter, setWorkFilter]       = useState("All");
  const [levelFilter, setLevelFilter]     = useState("All");

  const filteredJobs = JOBS.filter(j => {
    const matchWork  = workFilter  === "All" || j.workType === workFilter.toLowerCase();
    const matchLevel = levelFilter === "All" || j.level    === levelFilter.toLowerCase();
    return matchWork && matchLevel;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar activeHref="/opportunities" profile={profile} user={user} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="px-8 py-5 flex items-center gap-4 sticky top-0 z-20"
          style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2" style={{ borderRadius: "10px" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Opportunities
            </h1>
            <p className="type-body" style={{ marginTop: "4px" }}>
              Canada-first roles and volunteer experience — with a direct line to your practice
            </p>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)", padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            Manually curated · Updated monthly
          </div>
        </header>

        <div className="px-8 py-8" style={{ maxWidth: "960px" }}>

          {/* Intro banner */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "28px 32px", marginBottom: "32px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div className="flex items-start gap-5">
              <div style={{ width: 48, height: 48, borderRadius: "14px", background: "var(--teal-soft)", border: "1px solid var(--teal-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Globe className="w-5 h-5" style={{ color: "var(--teal)" }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "16px", color: "var(--text-1)", marginBottom: "6px" }}>
                  From practice to employment
                </div>
                <p className="type-body" style={{ maxWidth: "520px" }}>
                  Every listing below includes a recommended preparation path — specific challenges, modules, and tools on this platform that will make you a stronger candidate for that exact role.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px", padding: "4px", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", width: "fit-content" }}>
            {([["jobs", "Jobs", JOBS.length], ["volunteer", "Volunteer & Experience", VOLUNTEER.length]] as const).map(([tab, label, count]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "8px 18px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "7px",
                  background: activeTab === tab ? "var(--teal-soft)" : "transparent",
                  color: activeTab === tab ? "var(--teal)" : "var(--text-3)",
                }}>
                {label}
                <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "5px",
                  background: activeTab === tab ? "rgba(31,191,159,0.15)" : "rgba(255,255,255,0.05)",
                  color: activeTab === tab ? "var(--teal)" : "var(--text-4)",
                }}>{count}</span>
              </button>
            ))}
          </div>

          {/* Filters — jobs only */}
          {activeTab === "jobs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["All", "Remote", "Hybrid", "Onsite"].map(v => (
                  <button key={v} onClick={() => setWorkFilter(v)}
                    style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid transparent", transition: "all 0.15s",
                      background: workFilter === v ? "var(--teal-soft)" : "rgba(255,255,255,0.04)",
                      color: workFilter === v ? "var(--teal)" : "var(--text-3)",
                      borderColor: workFilter === v ? "var(--teal-border)" : "transparent",
                    }}>{v}</button>
                ))}
              </div>
              <div style={{ width: 1, height: 18, background: "var(--border)" }} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["All", "Entry", "Junior"].map(v => (
                  <button key={v} onClick={() => setLevelFilter(v)}
                    style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid transparent", transition: "all 0.15s",
                      background: levelFilter === v ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                      color: levelFilter === v ? "#a78bfa" : "var(--text-3)",
                      borderColor: levelFilter === v ? "rgba(167,139,250,0.22)" : "transparent",
                    }}>{v}</button>
                ))}
              </div>
              {(workFilter !== "All" || levelFilter !== "All") && (
                <button onClick={() => { setWorkFilter("All"); setLevelFilter("All"); }}
                  style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "rgba(248,113,113,0.07)", color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>
                  Clear
                </button>
              )}
              <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-4)" }}>
                {filteredJobs.length} of {JOBS.length} roles
              </span>
            </motion.div>
          )}

          {/* Jobs list */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <p className="type-card" style={{ color: "var(--text-3)" }}>No roles match those filters</p>
                  <button onClick={() => { setWorkFilter("All"); setLevelFilter("All"); }} style={{ marginTop: "10px", fontSize: "13px", color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>Clear filters</button>
                </div>
              ) : (
                filteredJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} />
                ))
              )}
            </div>
          )}

          {/* Volunteer list */}
          {activeTab === "volunteer" && (
            <div className="space-y-4">
              {VOLUNTEER.map((vol, i) => (
                <VolunteerCard key={vol.id} vol={vol} index={i} />
              ))}
            </div>
          )}

          <div style={{ height: "48px" }} />
        </div>
      </main>
    </div>
  );
}

// ── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, index }: { job: Listing; index: number }) {
  const router = useRouter();
  const wt = workTypeConfig[job.workType];
  const lv = levelConfig[job.level];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "24px 28px", transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "5px", background: wt.bg, color: wt.color }}>{wt.label}</span>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "5px", background: `${lv.color}12`, color: lv.color }}>{lv.label}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)" }}>{job.industry}</span>
          </div>
          <h3 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "16px", color: "var(--text-1)", marginBottom: "4px" }}>{job.title}</h3>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>{job.company}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span className="flex items-center gap-1 type-meta"><MapPin className="w-3 h-3" />{job.location}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span className="flex items-center gap-1 type-meta"><Clock className="w-3 h-3" />{job.posted}</span>
          </div>
        </div>
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, color: "var(--teal)", background: "var(--teal-soft)", border: "1px solid var(--teal-border)", textDecoration: "none", flexShrink: 0, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(31,191,159,0.18)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--teal-soft)")}>
          Apply <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Description */}
      <p className="type-body" style={{ fontSize: "13px", marginBottom: "18px", lineHeight: 1.65 }}>{job.description}</p>

      {/* Recommended prep */}
      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--teal)" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Recommended preparation</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.prep.map(p => (
            <button key={p.label} onClick={() => router.push(p.href)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20`, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = `${p.color}1e`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${p.color}10`)}>
              {p.label} <ChevronRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Volunteer Card ─────────────────────────────────────────────────────────────
function VolunteerCard({ vol, index }: { vol: Volunteer; index: number }) {
  const router = useRouter();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "24px 28px", transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "5px", background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>Volunteer</span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)" }}>Experience Building</span>
          </div>
          <h3 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 700, fontSize: "16px", color: "var(--text-1)", marginBottom: "4px" }}>{vol.title}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-2)" }}>{vol.org}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span className="flex items-center gap-1 type-meta"><MapPin className="w-3 h-3" />{vol.location}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span className="flex items-center gap-1 type-meta"><Clock className="w-3 h-3" />{vol.commitment}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, color: "#a78bfa", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.16)", flexShrink: 0 }}>
          <Users className="w-3.5 h-3.5" /> Volunteer Role
        </div>
      </div>

      <p className="type-body" style={{ fontSize: "13px", marginBottom: "14px", lineHeight: 1.65 }}>{vol.description}</p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {vol.skills.map(s => (
          <span key={s} style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)" }}>{s}</span>
        ))}
      </div>

      {/* Recommended prep */}
      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--teal)" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Recommended preparation</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {vol.prep.map(p => (
            <button key={p.label} onClick={() => router.push(p.href)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20`, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = `${p.color}1e`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${p.color}10`)}>
              {p.label} <ChevronRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
