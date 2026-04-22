"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Briefcase, RefreshCw, AlertTriangle, X, Bookmark } from "lucide-react";
import type { JobListing, PrepLink } from "@/lib/jobInsights";
import JobDetailContent from "@/components/JobDetailContent";
import { useAnalytics } from "@/lib/posthog";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  initialJobs: JobListing[];
  isLoggedIn: boolean;
  savedJobIds?: string[];
  syncError?: string;
  profile?: { full_name: string | null; subscription_tier: string | null } | null;
  user?: { email: string };
}

interface PracticeModal {
  jobTitle: string;
  company: string;
  practiceParams: string;
}

// ── Description parser ─────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// Converts HTML description to readable plain text preserving paragraph structure
function rawDescriptionText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBullets(text: string): string[] {
  return text
    .split(/[\n\r]|(?<=\.)(?=\s+[A-Z•\-])/)
    .map(l => l.replace(/^[\s•·●▪\-\*\d\.\)]+/, "").trim())
    .filter(l => l.length > 12 && l.length < 200);
}

function parseDesc(raw: string | null): {
  overview:      string;
  duties:        string[];
  requirements:  string[];
} {
  if (!raw) return { overview: "", duties: [], requirements: [] };
  const clean = stripHtml(raw);

  // Find section boundaries
  const lower   = clean.toLowerCase();
  const respIdx = lower.search(/\b(responsibilities|what you.ll do|your role|key duties|what we need you to do)\b/i);
  const reqIdx  = lower.search(/\b(requirements|qualifications|what you need|what you bring|must.have|you have)\b/i);

  const overview = clean.slice(0, 280).replace(/\..*$/, "") + ".";

  if (respIdx > 0 && reqIdx > respIdx) {
    const duties       = parseBullets(clean.slice(respIdx, reqIdx)).slice(0, 6);
    const requirements = parseBullets(clean.slice(reqIdx)).slice(0, 6);
    return { overview, duties, requirements };
  }

  // No clear sections — split at midpoint
  const all = parseBullets(clean);
  const mid = Math.ceil(all.length / 2);
  return {
    overview,
    duties:       all.slice(0, mid).slice(0, 6),
    requirements: all.slice(mid).slice(0, 6),
  };
}

// ── Card content extractors ───────────────────────────────────────────────────

// First sentence of description — acts as a company/role overview blurb
function extractCompanyBlurb(desc: string | null): string {
  if (!desc) return "";
  const text = stripHtml(desc).replace(/\s+/g, " ").trim();
  const cut  = text.search(/[.!?]\s+[A-Z]/);
  const line = cut > 20 ? text.slice(0, cut + 1) : text.slice(0, 130);
  return line.slice(0, 130).trim() + (line.length > 130 ? "…" : "");
}

// 1-2 requirement bullets extracted from the requirements/qualifications section
function extractKeyRequirements(desc: string | null): string {
  if (!desc) return "";
  const text = stripHtml(desc);
  const lower = text.toLowerCase();
  const reqIdx = lower.search(/\b(requirements?|qualifications?|what you (need|bring|have)|must[- ]have)\b/);
  const section = text.slice(reqIdx > 0 ? reqIdx : 0, (reqIdx > 0 ? reqIdx : 0) + 600);
  const bullets = parseBullets(section)
    .filter(b => /\b(year|degree|certif|experience|proficien|knowledge|skill|familiar)\b/i.test(b))
    .slice(0, 2);
  if (bullets.length > 0) return bullets.join(" · ").slice(0, 160);
  return parseBullets(text).slice(0, 1).join("").slice(0, 120);
}

// ── Sample interview questions by prep type ────────────────────────────────────

const SAMPLE_QUESTIONS: Record<string, string> = {
  "Agile BA Challenge":        "Walk me through how you facilitated sprint planning as the BA — what did you own?",
  "Requirements Challenge":    "Tell me about a time conflicting stakeholder needs threatened your requirements. How did you resolve it?",
  "Stakeholder Interview Sim": "How do you handle a key stakeholder who keeps changing requirements mid-project?",
  "Process Mapping Challenge": "Walk me through a business process you documented and improved. What was the measurable impact?",
  "Data Analysis Challenge":   "Describe a time you used data to challenge or validate a business assumption.",
  "Exam Prep":                 "What does BABOK say about the difference between elicitation and requirements analysis?",
};

function getSampleQuestion(prepLinks: PrepLink[]): string {
  const hit = prepLinks.find(p => SAMPLE_QUESTIONS[p.label]);
  return hit ? SAMPLE_QUESTIONS[hit.label] : "Tell me about a project where you translated complex business needs into clear technical requirements.";
}

// ── 3-tag generator ────────────────────────────────────────────────────────────

function generateTags(title: string, desc: string | null): [string, string, string] {
  const text = (title + " " + (desc ?? "")).toLowerCase();

  const core = (() => {
    if (/stakeholder|facilitat|workshop|elicit/.test(text)) return "Stakeholders";
    if (/\bdata\b|sql|analytics|reporting|\bbi\b|power bi/.test(text)) return "Data";
    if (/process|workflow|bpmn|swimlane/.test(text)) return "Process";
    if (/agile|scrum|sprint|kanban/.test(text)) return "Agile";
    if (/system|integration|\bapi\b/.test(text)) return "Systems";
    return "Stakeholders";
  })();

  const tool = (() => {
    if (/\bsap\b/.test(text)) return "SAP";
    if (/salesforce/.test(text)) return "Salesforce";
    if (/\bsql\b/.test(text)) return "SQL";
    if (/power bi|powerbi/.test(text)) return "Power BI";
    if (/\bapi\b|restful/.test(text)) return "APIs";
    if (/tableau/.test(text)) return "Tableau";
    if (/\bazure\b/.test(text)) return "Azure";
    if (/\baws\b/.test(text)) return "AWS";
    if (/agile|scrum/.test(text) && core !== "Agile") return "Agile";
    if (/process|workflow/.test(text) && core !== "Process") return "Process";
    return "Agile";
  })();

  const focus = (() => {
    if (/transform|change management/.test(text)) return "Transformation";
    if (/deliver|implement|deploy/.test(text)) return "Delivery";
    if (/strateg/.test(text)) return "Strategy";
    if (/operat/.test(text)) return "Operations";
    if (/senior|lead|principal/.test(title.toLowerCase())) return "Strategy";
    return "Delivery";
  })();

  return [core, tool, focus];
}

// ── Insight quality guardrail ─────────────────────────────────────────────────
// Rejects any insight containing generic phrases that undermine Alex's specificity.

const GUARDRAIL_PHRASES = [
  "great opportunity",
  "exciting chance",
  "values communication",
  "team player",
  "grow your career",
];

function passesGuardrail(text: string): boolean {
  const lower = text.toLowerCase();
  if (GUARDRAIL_PHRASES.some(p => lower.includes(p))) return false;
  // "collaborate with stakeholders" is acceptable only when followed by a consequence
  if (lower.includes("collaborate with stakeholders")) {
    const idx   = lower.indexOf("collaborate with stakeholders");
    const after = lower.slice(idx + 29, idx + 100);
    if (!/\b(to|and|who|that|when|but|while|by|in order)\b/.test(after)) return false;
  }
  return true;
}

// ── (generateInsight moved to @/lib/jobInsights — see JobDetailContent) ──────


// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg:          "#09090b",
  surface:     "#111117",
  card:        "#131318",
  border:      "#1e293b",
  borderHover: "#334155",
  teal:        "#1fbf9f",
  tealSoft:    "rgba(31,191,159,0.10)",
  tealBorder:  "rgba(31,191,159,0.25)",
  text1:       "#f8fafc",
  text2:       "#cbd5e1",
  text3:       "#94a3b8",
  text4:       "#475569",
};

// Alex Rivera coaching panel — warm light palette (distinct from dark employer panel)
const A = {
  bg:        "#FAF8F5",
  bgCard:    "#F0EBE3",
  border:    "#E2D8CC",
  teal:      "#0F766E",
  tealSoft:  "rgba(15,118,110,0.10)",
  tealBorder:"rgba(15,118,110,0.22)",
  text1:     "#0F172A",
  text2:     "#334155",
  text3:     "#64748B",
  text4:     "#94A3B8",
  green:     "#059669",
  red:       "#DC2626",
};

// ── Prep → challenge type mapping ─────────────────────────────────────────────

const PREP_TO_TYPES: Record<string, string[]> = {
  "Requirements Challenge":    ["requirements", "elicitation"],
  "Stakeholder Interview Sim": ["facilitation", "elicitation"],
  "Agile BA Challenge":        ["discovery", "requirements"],
  "Process Mapping Challenge": ["solution-analysis", "change-management"],
  "Data Analysis Challenge":   ["data-migration"],
};

const WHY_MAP: Record<string, string> = {
  "Requirements Challenge":    "tests requirements gathering and BRD writing",
  "Stakeholder Interview Sim": "tests stakeholder facilitation and alignment",
  "Agile BA Challenge":        "tests agile BA workflow and backlog management",
  "Process Mapping Challenge": "tests process analysis and as-is/to-be documentation",
  "Data Analysis Challenge":   "tests data requirements and reporting skills",
  "Exam Prep":                 "aligns with CBAP/CCBA certification knowledge areas",
};

function whyThisMatters(prepLinks: PrepLink[]): string | null {
  const hit = prepLinks.find(p => p.label !== "Career Suite" && WHY_MAP[p.label]);
  return hit ? WHY_MAP[hit.label] : null;
}

function getPracticeTypes(prepLinks: PrepLink[]): string[] {
  const types = new Set<string>();
  for (const p of prepLinks) {
    (PREP_TO_TYPES[p.label] ?? []).forEach(t => types.add(t));
  }
  return Array.from(types);
}

function getResumeKeywords(title: string, prepLinks: PrepLink[]): string[] {
  const t = title.toLowerCase();
  const kws = new Set<string>();

  if (/agile|scrum|sprint/.test(t) || prepLinks.some(p => p.label === "Agile BA Challenge")) {
    kws.add("Agile"); kws.add("Scrum"); kws.add("Sprint planning"); kws.add("Backlog refinement");
  }
  if (/data|analytics|reporting|sql/.test(t) || prepLinks.some(p => p.label === "Data Analysis Challenge")) {
    kws.add("SQL"); kws.add("Data analysis"); kws.add("Power BI"); kws.add("Reporting");
  }
  if (/process|workflow|bpmn/.test(t) || prepLinks.some(p => p.label === "Process Mapping Challenge")) {
    kws.add("Process mapping"); kws.add("BPMN"); kws.add("As-is / to-be"); kws.add("Workflow design");
  }
  if (/stakeholder/.test(t) || prepLinks.some(p => p.label === "Stakeholder Interview Sim")) {
    kws.add("Stakeholder management"); kws.add("Requirements elicitation"); kws.add("Workshop facilitation");
  }
  if (/requirement|brd|user stor/.test(t) || prepLinks.some(p => p.label === "Requirements Challenge")) {
    kws.add("BRD"); kws.add("User stories"); kws.add("Use cases"); kws.add("Gap analysis");
  }
  if (/senior/.test(t)) {
    kws.add("Cross-functional teams"); kws.add("Project delivery");
  }

  kws.add("Business analysis"); kws.add("BABOK");
  return Array.from(kws).slice(0, 8);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function isFresh(dateStr: string): boolean {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000 <= 3;
}

// Full province name → abbreviation (handles "Ontario", "British Columbia", etc.)
const PROVINCE_NAMES: [RegExp, string][] = [
  [/\bontario\b/i, "ON"], [/\bbritish columbia\b/i, "BC"], [/\balberta\b/i, "AB"],
  [/\bquebec\b/i, "QC"], [/\bmanitoba\b/i, "MB"], [/\bsaskatchewan\b/i, "SK"],
  [/\bnova scotia\b/i, "NS"], [/\bnew brunswick\b/i, "NB"],
  [/\bnewfoundland\b/i, "NL"], [/\bprince edward island\b/i, "PE"],
  [/\byukon\b/i, "YT"], [/\bnorthwest territories\b/i, "NT"], [/\bnunavut\b/i, "NU"],
];

function formatLocation(location: string | null): string {
  if (!location) return "";
  return location
    .replace(/,?\s*canada\s*$/i, "")   // strip trailing "Canada"
    .replace(/,?\s*ca\s*$/i, "")       // strip trailing "CA"
    .trim();
}

function extractProvince(location: string | null): string {
  if (!location) return "";
  if (/\bremote\b/i.test(location)) return "Remote";

  // Abbreviation matches (e.g. "Toronto, ON, Canada")
  const abbrev = location.match(/\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT)\b/g) ?? [];
  // Full name matches (e.g. "Toronto, Ontario")
  const named  = PROVINCE_NAMES.filter(([re]) => re.test(location)).map(([, code]) => code);

  const all = [...new Set([...abbrev, ...named])];
  // Multi-province listing → show under All only (no specific province match)
  if (all.length !== 1) return "";
  return all[0];
}

// Only block aggregator sites — broken/missing URLs are handled by resolveApplyUrl
const AGGREGATOR_HOSTS = ["adzuna", "indeed", "ziprecruiter", "monster", "careerjet", "jobbank"];
function isDirectUrl(url: string | null | undefined): boolean {
  if (!url) return true; // no URL: show job, resolveApplyUrl provides fallback
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !AGGREGATOR_HOSTS.some(a => host.includes(a));
  } catch { return true; }
}

function isBadUrl(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes("community.workday.com") || lower.includes("invalid");
}

// Known careers page fallbacks — used when direct job URL is broken
const CAREERS_FALLBACK: Record<string, string> = {
  "RBC":      "https://jobs.rbc.com",
  "TD Bank":  "https://jobs.td.com",
  "BMO":      "https://bmo.wd3.myworkdayjobs.com/en-US/External",
  "CIBC":     "https://cibc.wd3.myworkdayjobs.com/en-US/search",
  "Manulife": "https://manulife.wd3.myworkdayjobs.com/en-US/MFCJH_Jobs",
};

function resolveApplyUrl(job: JobListing): { href: string; label: string; isDirect: boolean } {
  // Only show "Apply" if the link has been positively verified server-side.
  if (job.apply_url_status === "valid" && job.verified_apply_url) {
    return { href: job.verified_apply_url, label: "Apply", isDirect: true };
  }
  // Invalid URL — server already computed the best fallback (careers page or Google).
  if (job.apply_url_status === "invalid" && job.verified_apply_url) {
    return { href: job.verified_apply_url, label: "View on company site", isDirect: false };
  }
  // Legacy rows from existing adapters (Greenhouse/Lever/iCIMS) — apply_url is a
  // stable hosted link, no verification needed. Show Apply directly.
  const raw = job.apply_url || job.url || "";
  if (!isBadUrl(raw) && raw.startsWith("http")) {
    return { href: raw, label: "Apply", isDirect: true };
  }
  // Last resort fallback from CAREERS_FALLBACK map or Google.
  const fallback = CAREERS_FALLBACK[job.company ?? ""];
  const google   = `https://www.google.com/search?q=${encodeURIComponent(
    [job.title, job.company, "Canada"].filter(Boolean).join(" ")
  )}`;
  return { href: fallback ?? google, label: "View on company site", isDirect: false };
}

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const WORK_TYPE_COLORS: Record<string, string> = { remote: "#059669", hybrid: "#7c3aed", onsite: "#2563eb" };
const LEVEL_LABELS: Record<string, string> = { entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior" };
const PROVINCES = ["ON", "BC", "AB", "QC", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU", "Remote"];

// ── Alex Rivera card insight ──────────────────────────────────────────────────
// Three rotating formats across visible cards. Single sentence, max 22 words.
// 0 = "Before you apply: ..."
// 1 = "Most candidates miss ... Do not be one of them."
// 2 = "If you cannot ..., you will not pass."

function generateAlexCardInsight(job: JobListing, cardIndex: number): string {
  const text = (job.title + " " + (job.description ?? "")).toLowerCase();
  const p = cardIndex % 3;

  if (/stakeholder|facilitat|workshop/.test(text)) return [
    "Before you apply: can you show how you got two disagreeing stakeholders to align?",
    "Most candidates miss that this role is about influence, not documentation. Do not be one of them.",
    "If you cannot align competing teams without escalating, you will not pass the second round.",
  ][p];

  if (/agile|scrum|sprint/.test(text)) return [
    "Before you apply: name exactly what you own in sprint planning that the product owner does not.",
    "Most candidates cannot separate their role from the product owner's. Do not be one of them.",
    "If you cannot say what you personally deliver each sprint, you will not pass.",
  ][p];

  if (/process|workflow|bpmn|as.is/.test(text)) return [
    "Before you apply: have a real example ready of a broken process you mapped and fixed end to end.",
    "Most candidates map what they were told, not what is actually broken. Do not be one of them.",
    "If you cannot trace a process problem to its root cause before drawing the fix, you will not pass.",
  ][p];

  if (/\bdata\b|sql|analytics|power bi/.test(text)) return [
    "Before you apply: can you name a time your analysis changed a business decision?",
    "Most candidates report numbers instead of challenging assumptions with them. Do not be one of them.",
    "If you cannot show where your data changed a direction, you will not pass the analytical screen.",
  ][p];

  if (/change|transform|adoption/.test(text)) return [
    "Before you apply: think of a rollout where resistance was real and you got people across anyway.",
    "Most candidates talk delivery but cannot show they drove adoption through pushback. Do not be one of them.",
    "If you cannot show you moved stakeholders through genuine resistance, you will not pass here.",
  ][p];

  if (/system|integration|\bapi\b/.test(text)) return [
    "Before you apply: can a developer build from your requirements without asking a follow-up question?",
    "Most candidates write requirements that need constant clarification. Do not be one of them.",
    "If you cannot write a spec a developer can ship from, you will not pass the technical review.",
  ][p];

  if (/requirement|brd|user stor/.test(text)) return [
    "Before you apply: name the last artifact you produced and the decision it directly drove.",
    "Most candidates describe requirements work without naming a single artifact. Do not be one of them.",
    "If you cannot defend your requirements when stakeholders push back, you will not pass.",
  ][p];

  if (/senior|lead|principal/.test(job.title.toLowerCase())) return [
    "Before you apply: what business outcome changed because of work you personally led?",
    "Most senior candidates lead with activity instead of impact. Do not be one of them.",
    "If you cannot show end-to-end ownership of an initiative, this level will be a stretch.",
  ][p];

  return [
    "Before you apply: name the last BA artifact you produced and the decision it drove.",
    "Most candidates cannot connect their work to a business outcome. Do not be one of them.",
    "If you cannot move from a vague business problem to a documented spec, you will not pass.",
  ][p];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpportunitiesClient({ initialJobs, isLoggedIn, savedJobIds = [], syncError, profile, user }: Props) {
  const router = useRouter();
  const { track } = useAnalytics();
  const [keyword,     setKeyword]     = useState("");
  const [workType,    setWorkType]    = useState("all");
  const [level,       setLevel]       = useState("all");
  const [province,    setProvince]    = useState("all");
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState<string | null>(null);
  const [savedIds,    setSavedIds]    = useState<Set<string>>(() => new Set(savedJobIds));
  const [savingId,    setSavingId]    = useState<string | null>(null);
  const [modal,              setModal]              = useState<PracticeModal | null>(null);
  const [selectedJob,        setSelectedJob]        = useState<JobListing | null>(null);
  const [initialCoachingOpen, setInitialCoachingOpen] = useState(true);
  const [mounted,            setMounted]            = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const res  = await fetch("/api/jobs/sync");
      const data = await res.json();
      if (!res.ok || data.error) setSyncMsg(`Sync failed: ${data.error ?? "unknown error"}`);
      else if (data.skipped) setSyncMsg(`Already synced ${data.minsAgo} minutes ago. Refresh to see latest.`);
      else { setSyncMsg(`Sync complete. ${data.upserted} jobs loaded.`); setTimeout(() => router.refresh(), 1200); }
    } catch (e) { setSyncMsg(`Sync failed: ${String(e)}`); }
    finally { setSyncing(false); }
  }, [router]);

  function handlePractice(job: JobListing) {
    const types = getPracticeTypes(job.prep_links ?? []);
    const params = new URLSearchParams({
      practicing: job.title,
      company:    job.company ?? "",
      types:      types.join(","),
    }).toString();

    if (isLoggedIn) {
      router.push(`/scenarios?${params}`);
    } else {
      try { sessionStorage.setItem("practiceContext", params); } catch {}
      setModal({ jobTitle: job.title, company: job.company ?? "", practiceParams: params });
    }
  }

  async function handleBookmark(jobId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { router.push("/auth/login"); return; }
    setSavingId(jobId);
    const isSaved = savedIds.has(jobId);
    try {
      await fetch("/api/workspace/save-job", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      setSavedIds(prev => {
        const next = new Set(prev);
        isSaved ? next.delete(jobId) : next.add(jobId);
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => initialJobs.filter(job => {
    const applyUrl = job.apply_url || job.url;
    if (!isDirectUrl(applyUrl)) return false;
    if (workType !== "all" && job.work_type !== workType) return false;
    if (level    !== "all" && job.level     !== level)    return false;
    if (province !== "all") {
      if (extractProvince(job.location) !== province) return false;
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      if (!job.title.toLowerCase().includes(k) &&
          !(job.company  ?? "").toLowerCase().includes(k) &&
          !(job.location ?? "").toLowerCase().includes(k)) return false;
    }
    return true;
  }), [initialJobs, keyword, workType, level, province]);

  const withSidebar = isLoggedIn && !!profile && !!user;

  return (
    <div style={{
      background: C.bg, fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased", color: C.text1,
      ...(withSidebar ? { display: "flex", height: "100vh", overflow: "hidden" } : { minHeight: "100vh" }),
    }}>

      {/* Global sidebar (logged in) or top nav (logged out) */}
      {withSidebar ? (
        <AppSidebar activeHref="/opportunities" profile={profile!} user={user!} />
      ) : (
        <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(9,9,11,0.92)", borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 16, fontWeight: 800, color: C.text1, letterSpacing: "-0.01em" }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "monospace" }}>BA</div>
              The<span style={{ color: C.teal }}>BA</span>Portal
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href="/auth/login"  style={{ fontSize: 13, color: C.text3, textDecoration: "none" }}>Sign in</Link>
              <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
            </div>
          </div>
        </nav>
      )}

      {/* Scrollable content */}
      <div style={withSidebar ? { flex: 1, overflowY: "auto" } : {}}>

      {/* ── Hero ── */}
      <div style={{ paddingTop: withSidebar ? 0 : 58, borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, #0c1118 0%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 32px 44px" }}>
          <h1 style={{ fontSize: "clamp(28px, 3.6vw, 46px)", fontWeight: 800, letterSpacing: "-0.03em", color: C.text1, lineHeight: 1.12, marginBottom: 14 }}>
            Curated BA jobs in Canada.
          </h1>
          <p style={{ fontSize: 16, color: C.text3, lineHeight: 1.65, marginBottom: 28, maxWidth: 540 }}>
            Not hundreds of noisy listings. Just the roles worth your time.
          </p>

          {/* Pre-apply tension box */}
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 16, padding: "20px 24px", borderRadius: 12, background: "rgba(31,191,159,0.06)", border: `1px solid ${C.tealBorder}`, marginBottom: 0 }}>
            <p style={{ fontSize: 14, color: C.text2, margin: 0, lineHeight: 1.65, maxWidth: 460 }}>
              Most BA candidates apply without understanding what this role actually tests.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href="#listings"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, background: C.teal, color: "#000", textDecoration: "none", letterSpacing: "-0.01em" }}
              >
                See how to win this role
              </a>
              <a
                href="#listings"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 500, background: "transparent", color: C.text3, textDecoration: "none", border: `1px solid ${C.border}` }}
              >
                Apply anyway
              </a>
            </div>
          </div>
          {syncError && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "#f87171", padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <AlertTriangle size={12} /> Sync error: {syncError}
            </div>
          )}
        </div>
      </div>

      {/* ── Listings ── */}
      <div id="listings" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 0" }}>

        {/* Filter bar — single compact row */}
        <style>{`
          .ba-select {
            appearance: none;
            background: ${C.card};
            border: 1px solid ${C.border};
            border-radius: 9px;
            color: ${C.text2};
            font-size: 13px;
            font-family: inherit;
            padding: 8px 32px 8px 12px;
            cursor: pointer;
            outline: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
          }
          .ba-select:focus { border-color: ${C.teal}; }
          .ba-card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 80px; }
          @media (max-width: 600px) { .ba-card-grid { grid-template-columns: 1fr; } }
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.text4, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search title, company, or city…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text1, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {/* Type */}
          <select className="ba-select" value={workType} onChange={e => setWorkType(e.target.value)}>
            <option value="all">All types</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          {/* Level */}
          <select className="ba-select" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="all">All levels</option>
            <option value="entry">Entry</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
          {/* Province */}
          <select className="ba-select" value={province} onChange={e => setProvince(e.target.value)}>
            <option value="all">All provinces</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Live count */}
          <span style={{ fontSize: 13, color: C.text4, whiteSpace: "nowrap", marginLeft: 4 }}>
            <span style={{ fontWeight: 700, color: C.teal }}>{filtered.length}</span> role{filtered.length !== 1 ? "s" : ""} live
          </span>
          {syncMsg && (
            <span style={{ fontSize: 12, color: syncMsg.includes("failed") ? "#f87171" : C.teal, fontFamily: "monospace" }}>
              {syncMsg}
            </span>
          )}
        </div>

        {/* Cards */}
        <style>{`@keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.65}}`}</style>
        {!mounted ? (
          /* ── Skeleton grid ── */
          <div className="ba-card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px" }}>
                <div style={{ height: 12, borderRadius: 6, background: "#E8EDF2", width: "38%", marginBottom: 12, animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ height: 20, borderRadius: 6, background: "#E8EDF2", width: "80%", marginBottom: 8, animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ height: 20, borderRadius: 6, background: "#E8EDF2", width: "58%", marginBottom: 14, animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ height: 12, borderRadius: 6, background: "#E8EDF2", width: "55%", marginBottom: 20, animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ height: 40, borderRadius: 6, background: "#E8EDF2", marginBottom: 20, animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ height: 40, borderRadius: 9, background: "#E8EDF2", animation: "shimmer 1.4s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <Briefcase size={32} style={{ margin: "0 auto 16px", display: "block", color: C.text4, opacity: 0.4 }} />
            {initialJobs.length === 0 ? (
              <>
                <p style={{ fontSize: 15, marginBottom: 6, color: C.text2 }}>
                  {syncError ? "Sync failed — jobs could not be loaded." : "No jobs loaded yet."}
                </p>
                <p style={{ fontSize: 13, color: C.text3, marginBottom: 20 }}>
                  {syncError ? "Check Vercel env vars." : "Pull in the latest listings."}
                </p>
                <button onClick={triggerSync} disabled={syncing}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", background: C.tealSoft, color: C.teal, border: `1px solid ${C.tealBorder}`, opacity: syncing ? 0.6 : 1 }}>
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
                  {syncing ? "Syncing…" : "Sync jobs now"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 15, color: C.text2, marginBottom: 20 }}>No roles match your filters.</p>
                <button onClick={() => { setKeyword(""); setWorkType("all"); setLevel("all"); setProvince("all"); }}
                  style={{ fontSize: 13, color: C.teal, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="ba-card-grid">
            {filtered.map((job, cardIdx) => {
              const fresh = isFresh(job.posted_at);
              const prov  = extractProvince(job.location);
              const apply = resolveApplyUrl(job);
              const tags  = generateTags(job.title, job.description);
              const blurb = extractCompanyBlurb(job.description);
              const reqs  = extractKeyRequirements(job.description);

              return (
                <div key={job.id}
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s, transform 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* Company + NEW badge + bookmark */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>{job.company ?? "Unknown"}</span>
                    {fresh && <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: "rgba(31,191,159,0.10)", border: "1px solid rgba(31,191,159,0.25)", borderRadius: 20, padding: "1px 7px" }}>NEW</span>}
                    <button
                      onClick={e => handleBookmark(job.id, e)}
                      disabled={savingId === job.id}
                      title={savedIds.has(job.id) ? "Remove from saved" : "Save job"}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: savingId === job.id ? "wait" : "pointer", padding: 4, color: savedIds.has(job.id) ? C.teal : "#CBD5E1", display: "flex", alignItems: "center", opacity: savingId === job.id ? 0.5 : 1 }}
                    >
                      <Bookmark size={16} fill={savedIds.has(job.id) ? C.teal : "none"} />
                    </button>
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8, lineHeight: 1.3 }}>
                    {job.title}
                  </h2>

                  {/* Location • Type */}
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    {job.location && <span>{formatLocation(job.location)}</span>}
                    {job.location && <span style={{ color: "#CBD5E1" }}>•</span>}
                    <span>{WORK_TYPE_LABELS[job.work_type]}</span>
                    <span style={{ color: "#CBD5E1" }}>•</span>
                    <span>{LEVEL_LABELS[job.level] ?? job.level}</span>
                  </div>

                  {/* Company blurb */}
                  {blurb && (
                    <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.55, margin: "0 0 10px", fontStyle: "italic" }}>
                      {blurb}
                    </p>
                  )}

                  {/* Key requirements */}
                  {reqs && (
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "0 0 14px" }}>
                      {reqs}
                    </p>
                  )}

                  {/* Skill tags */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", flexGrow: 1, alignContent: "flex-start" }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#F1F5F9", color: "#475569" }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Buttons — coaching primary, apply secondary */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Link
                      href={`/jobs/${job.id}`}
                      onClick={() => track("win_this_role_clicked", { job_id: job.id, job_title: job.title })}
                      style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 700, background: C.teal, color: "#000", textDecoration: "none", letterSpacing: "-0.01em" }}
                    >
                      See how to win this role
                    </Link>
                    <div>
                      <a
                        href={apply.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("apply_clicked", { job_id: job.id, job_title: job.title })}
                        style={{ display: "block", textAlign: "center", padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 500, background: "transparent", color: "#64748B", textDecoration: "none", border: "1px solid #E2E8F0" }}
                      >
                        {apply.label}
                      </a>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: "5px 0 0", textAlign: "center", lineHeight: 1.45 }}>
                        You are applying without seeing what this role actually tests.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA — logged-out users */}
        {!isLoggedIn && filtered.length > 0 && (
          <div style={{ marginBottom: 64, padding: "48px 40px", borderRadius: 20, background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.teal}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: C.tealSoft, filter: "blur(60px)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: "monospace" }}>
                // more than a job board
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 10, letterSpacing: "-0.02em" }}>
                Apply today. Practice before the interview.
              </h3>
              <p style={{ fontSize: 14, color: C.text3, marginBottom: 28, maxWidth: 460, lineHeight: 1.65 }}>
                Scenarios, stakeholder simulations, and real BA deliverables — so you walk in ready.
              </p>
              <Link href="/auth/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Start free — no credit card needed
              </Link>
            </div>
          </div>
        )}
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px", textAlign: "center", background: C.surface, marginTop: 16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: "12px", color: C.text4, textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>

      {/* ── Practice modal ── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "#18181b", border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setModal(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text4, padding: 4 }}>
              <X size={18} />
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: "monospace" }}>
              // simulation mode
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text1, marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Interview coming up?
            </h2>
            <p style={{ fontSize: 14, color: C.text3, marginBottom: 6, lineHeight: 1.6 }}>
              Run a real BA simulation and see how you&apos;d perform before the interview.
            </p>
            <div style={{ fontSize: 13, color: C.text4, marginBottom: 28, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, fontStyle: "italic" }}>
              {modal.jobTitle}{modal.company ? ` · ${modal.company}` : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/auth/signup"
                style={{ display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.01em" }}>
                Start free simulation
              </Link>
              <Link href="/auth/login"
                style={{ display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 12, background: "transparent", color: C.text2, fontSize: 14, fontWeight: 600, textDecoration: "none", border: `1px solid ${C.border}` }}>
                Sign in
              </Link>
            </div>
            <p style={{ fontSize: 12, color: C.text4, textAlign: "center", marginTop: 18 }}>
              Free to start. No credit card required.
            </p>
          </div>
        </div>
      )}

      {/* ── Job detail modal ── */}
      {selectedJob && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            style={{ width: "min(1100px, 100%)", height: "min(88vh, 860px)", background: "#18181b", border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.85)" }}
            onClick={e => e.stopPropagation()}
          >

            <JobDetailContent
              key={selectedJob.id}
              job={selectedJob}
              mode="modal"
              onClose={() => setSelectedJob(null)}
              isLoggedIn={isLoggedIn}
              initialCoachingOpen={initialCoachingOpen}
            />
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
