"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Building2, Clock, ExternalLink, Search, Briefcase, RefreshCw, AlertTriangle, X } from "lucide-react";

interface PrepLink { label: string; href: string }

interface JobListing {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  apply_url: string | null;
  url: string | null;
  posted_at: string;
  work_type: "remote" | "hybrid" | "onsite";
  level: "entry" | "junior" | "mid" | "senior";
  quality_score: number;
  prep_links: PrepLink[] | null;
  source_type: string | null;
  source_name: string | null;
  // URL verification
  verified_apply_url: string | null;
  apply_url_status: string | null;
}

interface Props {
  initialJobs: JobListing[];
  isLoggedIn: boolean;
  syncError?: string;
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

// ── Alex Rivera coaching engine ────────────────────────────────────────────────

interface CoachingInsight {
  heading: string;
  body:    string;
}

interface CoachingQuestion {
  q:    string;
  note: string;
}

interface JobInsight {
  insights:       CoachingInsight[];
  advice:         string[];
  interviewFocus: string[];
  questions:      CoachingQuestion[];
}

function generateInsight(job: JobListing): JobInsight {
  const title   = job.title.toLowerCase();
  const desc    = (job.description ?? "").toLowerCase();
  const text    = title + " " + desc;
  const company = job.company ?? "this company";
  const isSnr   = /senior|lead|principal|staff/.test(title);
  const isEntry = /junior|jr\.?|entry|associate|new.?grad/.test(title);

  // ── What I'm seeing ──────────────────────────────────────────────────────────
  const insights: CoachingInsight[] = [];

  if (/stakeholder|facilitat|workshop|elicit/.test(text)) {
    insights.push({
      heading: "Stakeholder management is the real job here",
      body: `${company} isn't just looking for someone to document requirements — they need someone who can get misaligned people to agree. Expect to be asked about a time you navigated conflicting priorities between business and tech, and pushed through anyway. Generic answers about "collaborating with stakeholders" won't land.`,
    });
  }

  if (/agile|scrum|sprint|kanban/.test(text)) {
    insights.push({
      heading: "This is an agile-first environment",
      body: `They want a BA who actively shapes the backlog, not someone who documents after the fact. Be ready to explain your exact role in sprint ceremonies — what you personally prepared, what you facilitated, what got clarified because of your input. "I attended standups" is not an answer.`,
    });
  }

  if (/requirement|elicit|brd|user stor|acceptance/.test(text)) {
    insights.push({
      heading: "Requirements quality will be tested directly",
      body: `From what I'm seeing, ${company} cares about structured requirements work — not just gathering, but producing artifacts that hold up. You should be able to walk them through a BRD, a set of user stories, or acceptance criteria you personally wrote. If you can't name the document and describe a specific decision it drove, that's a gap to address.`,
    });
  }

  if (/process|workflow|bpmn|as.is|to.be|swimlane/.test(text)) {
    insights.push({
      heading: "Process mapping is a core deliverable",
      body: `This role involves documenting and improving how work actually flows — not just how people say it flows. They'll want to hear about a process you mapped honestly, including the messy parts, and how your analysis led to a real change. As-is to to-be, with you driving it.`,
    });
  }

  if (/\bdata\b|sql|analytics|reporting|power bi|tableau|\bbi\b/.test(text)) {
    insights.push({
      heading: "Data fluency is expected, not optional",
      body: `I've coached BAs through roles like this — the data piece often gets undersold in interviews. ${company} will want an example where you used data to challenge or validate a business assumption, not just report numbers. Think about a time your analysis changed a decision that was already heading in the wrong direction.`,
    });
  }

  if (/system|integration|\bapi\b|technical|architect/.test(text)) {
    insights.push({
      heading: "You're bridging business and technical teams",
      body: `This role sits at the intersection of what the business wants and what dev can build. They'll test whether your requirements are detailed enough for a developer to work from — not just conceptual. Be ready to talk about how you handle technical ambiguity and what you do when dev pushes back on a requirement.`,
    });
  }

  if (/change|transform|adoption|training/.test(text)) {
    insights.push({
      heading: "Change management is part of the role",
      body: `Delivery isn't enough here — ${company} needs someone who can get stakeholders to actually adopt what's built. Think about a time you supported a rollout where resistance was real, and what you did differently to make adoption stick.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      heading: "Core BA fundamentals are the baseline",
      body: `The description doesn't go deep on specifics, but for any BA role at this level, they'll expect structured requirements work, clear stakeholder communication, and the ability to move from ambiguous business problems to documented, actionable specs. Make sure your examples show all three.`,
    });
  }

  // ── My advice ────────────────────────────────────────────────────────────────
  const advice: string[] = [];

  if (isSnr) {
    advice.push("Lead with business impact, not activity. Don't tell them what you did — tell them what changed for the business because of what you did. Senior BAs who can't articulate outcomes rarely make it past the second round.");
    advice.push("Show end-to-end ownership. The best thing you can do is walk them through a full initiative — from the business problem you diagnosed, through delivery, to what actually improved. That arc is what separates seniors from mids.");
  } else if (isEntry) {
    advice.push("Don't apologise for your experience level — reframe it. Academic projects, bootcamp work, volunteer BA roles all count. Talk about them like real work, because the thinking is the same.");
    advice.push("Name your artifacts. Even if the project was small, if you wrote user stories, drew a process diagram, or produced a requirements doc — name it explicitly. It signals you know the discipline, not just the idea of it.");
  } else {
    advice.push("Specificity is what separates strong candidates from forgettable ones. Instead of 'gathered requirements from stakeholders,' say 'ran five workshops with operations and IT to align on a claims process redesign.' Names, numbers, outcomes.");
    advice.push("Your resume needs at least two concrete examples of BA artifacts you personally produced — BRDs, user stories, process maps, acceptance criteria. If your resume only talks about responsibilities, rewrite it around deliverables.");
  }

  // ── Interview focus ───────────────────────────────────────────────────────────
  const interviewFocus: string[] = [];
  if (/stakeholder|facilitat/.test(text))   interviewFocus.push("How you handle conflicting stakeholder priorities without losing momentum");
  if (/requirement|brd/.test(text))         interviewFocus.push("Your process for moving from a vague business problem to documented, signed-off requirements");
  if (/agile|scrum/.test(text))             interviewFocus.push("Your specific role in agile ceremonies — what you own versus what the product owner owns");
  if (/process|workflow/.test(text))        interviewFocus.push("How you map a process end-to-end and get buy-in on what needs to change");
  if (/\bdata\b|analytics/.test(text))      interviewFocus.push("Examples where your analysis directly influenced a business or project decision");
  if (/system|integration/.test(text))      interviewFocus.push("How you translate business requirements into specs developers can actually use");
  if (/change|transform/.test(text))        interviewFocus.push("How you've driven stakeholder adoption when resistance was real");
  if (interviewFocus.length < 3) {
    interviewFocus.push("How you prioritise when multiple stakeholders have competing needs");
    interviewFocus.push("A project where your analysis changed the direction of a decision");
    interviewFocus.push("How you know when requirements are good enough to hand over");
  }

  // ── Questions with coaching notes ────────────────────────────────────────────
  const questions: CoachingQuestion[] = [];

  if (/stakeholder|facilitat/.test(text)) {
    questions.push({
      q:    "Tell me about a time stakeholders couldn't agree on what they needed. How did you move the project forward?",
      note: "Don't just say you 'facilitated discussion.' Name the parties, the conflict, and the specific technique you used to get to alignment — workshop, decision matrix, escalation path. Show you had a process, not luck.",
    });
  }

  if (/requirement|brd|user stor/.test(text)) {
    questions.push({
      q:    "Walk me through your process for gathering and documenting requirements for a complex initiative.",
      note: "They're listening for structure. Do you start with the business problem or jump to solutions? Do you mention stakeholder workshops, gap analysis, sign-off? Vague answers about 'working with the team' score poorly — name your artifacts.",
    });
  }

  if (/agile|scrum/.test(text)) {
    questions.push({
      q:    "What's your role as a BA in a scrum team, and how do you handle requirements that change mid-sprint?",
      note: "Be specific about what you own versus what the product owner owns. They'll red-flag anyone who can't articulate the difference. If you've played both roles, say so — but be clear about what each looked like.",
    });
  }

  if (/process|workflow/.test(text)) {
    questions.push({
      q:    "Describe a process you mapped and improved. What did the as-is look like, and what changed in the to-be?",
      note: "Lead with the business problem, not the tool. The as-is should include what was actually broken — not just different. Then show that your to-be solved the root cause, not just the symptom.",
    });
  }

  if (/\bdata\b|sql|analytics/.test(text)) {
    questions.push({
      q:    "Tell me about a time you used data to challenge or validate a business assumption.",
      note: "The best answers show a moment where the data said something unexpected — and you had the confidence to bring it up rather than ignore it. Describe what you found, how you presented it, and what happened as a result.",
    });
  }

  if (/change|transform/.test(text)) {
    questions.push({
      q:    "How have you supported stakeholder adoption during a major system or process change?",
      note: "They want to hear about real resistance — not a smooth rollout. What pushback did you face, and what did you do differently to get people across the line? If your answer is 'I sent training materials,' that's not enough.",
    });
  }

  if (questions.length < 3) {
    questions.push({
      q:    "How do you approach a project where the business problem is unclear from the start?",
      note: "Show you have a discovery process — not that you wait for clarity to land in your lap. Name the techniques: stakeholder interviews, current-state mapping, problem framing workshops. Strong candidates have a repeatable approach.",
    });
    questions.push({
      q:    "Give me an example of a BA deliverable you produced that directly influenced a business decision.",
      note: "Name the artifact, name the decision, name the outcome. This is the core of what BAs do — if you can't connect your work to a business change, that's the gap the interview will expose.",
    });
  }

  return {
    insights:       insights.filter(ins => passesGuardrail(ins.heading + " " + ins.body)).slice(0, 4),
    advice:         advice.slice(0, 2),
    interviewFocus: interviewFocus.slice(0, 4),
    questions:      questions.slice(0, 3),
  };
}

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

function extractProvince(location: string | null): string {
  if (!location) return "";
  if (/\bremote\b/i.test(location)) return "Remote";
  const matches = location.match(/\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT)\b/g);
  // Multi-province listing (e.g. "Toronto, ON or Vancouver, BC") → show under All only
  if (!matches || matches.length !== 1) return "";
  return matches[0];
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

export default function OpportunitiesClient({ initialJobs, isLoggedIn, syncError }: Props) {
  const router = useRouter();
  const [keyword,     setKeyword]     = useState("");
  const [workType,    setWorkType]    = useState("all");
  const [level,       setLevel]       = useState("all");
  const [province,    setProvince]    = useState("all");
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState<string | null>(null);
  const [modal,          setModal]          = useState<PracticeModal | null>(null);
  const [appliedJobs,    setAppliedJobs]    = useState<Set<string>>(new Set());
  const [selectedJob,    setSelectedJob]    = useState<JobListing | null>(null);
  const [expandedAction, setExpandedAction] = useState<"resume" | "prepare" | "interview" | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [mounted,        setMounted]        = useState(false);
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

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased", color: C.text1 }}>

      {/* ── Nav ── */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(9,9,11,0.92)", borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 16, fontWeight: 800, color: C.text1, letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "monospace" }}>BA</div>
            The<span style={{ color: C.teal }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isLoggedIn ? (
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login"  style={{ fontSize: 13, color: C.text3, textDecoration: "none" }}>Sign in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ paddingTop: 58, borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, #0c1118 0%, ${C.bg} 100%)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px 40px" }}>
          <h1 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.025em", color: C.text1, lineHeight: 1.15, marginBottom: 10 }}>
            Curated BA jobs in Canada.
          </h1>
          <p style={{ fontSize: 15, color: C.text3, lineHeight: 1.6, margin: 0 }}>
            Alex Rivera shows you what to prepare before you apply.
          </p>
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
              const fresh   = isFresh(job.posted_at);
              const prov    = extractProvince(job.location);
              const insight = generateAlexCardInsight(job, cardIdx);

              return (
                <div key={job.id}
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s, transform 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* Company + NEW badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>{job.company ?? "Unknown"}</span>
                    {fresh && <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: "rgba(31,191,159,0.10)", border: "1px solid rgba(31,191,159,0.25)", borderRadius: 20, padding: "1px 7px" }}>NEW</span>}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 10, lineHeight: 1.3 }}>
                    {job.title}
                  </h2>

                  {/* Location • Type • Level */}
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    {job.location && <span>{prov || job.location}</span>}
                    {job.location && <span style={{ color: "#CBD5E1" }}>•</span>}
                    <span>{WORK_TYPE_LABELS[job.work_type]}</span>
                    <span style={{ color: "#CBD5E1" }}>•</span>
                    <span>{LEVEL_LABELS[job.level] ?? job.level}</span>
                  </div>

                  {/* Alex Rivera insight */}
                  <p style={{ fontSize: 14, color: "#0F766E", lineHeight: 1.65, margin: "0 0 22px", fontStyle: "italic", flexGrow: 1 }}>
                    {insight}
                  </p>

                  {/* Single CTA */}
                  <button
                    onClick={() => { setSelectedJob(job); setExpandedAction(null); setInsightLoading(true); setTimeout(() => setInsightLoading(false), 700); }}
                    style={{ padding: "11px 0", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", background: C.teal, color: "#fff", border: "none", width: "100%", letterSpacing: "-0.01em", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#17a888")}
                    onMouseLeave={e => (e.currentTarget.style.background = C.teal)}
                  >
                    Before you apply →
                  </button>
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
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
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
              <Link href="/signup"
                style={{ display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 12, background: C.teal, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.01em" }}>
                Start free simulation
              </Link>
              <Link href="/login"
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

      {/* ── Job detail drawer ── */}
      {selectedJob && (() => {
        const job      = selectedJob;
        const apply    = resolveApplyUrl(job);
        const prep     = (job.prep_links ?? []).filter(p => p.label !== "Career Suite");
        const fresh    = isFresh(job.posted_at);
        const keywords = getResumeKeywords(job.title, job.prep_links ?? []);
        const insight  = generateInsight(job);

        return (
          /* ── Backdrop ── */
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
            onClick={() => setSelectedJob(null)}
          >
            {/* ── Modal ── */}
            <div
              style={{ width: "min(1100px, 100%)", height: "min(88vh, 860px)", background: "#18181b", border: `1px solid ${C.border}`, borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.85)" }}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Sticky header ── */}
              <div style={{ padding: "20px 28px 18px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Building2 size={12} style={{ color: C.text4, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>{job.company ?? "Unknown"}</span>
                      {fresh && <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, borderRadius: 20, padding: "1px 7px", flexShrink: 0 }}>NEW</span>}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text1, lineHeight: 1.25, marginBottom: 8, letterSpacing: "-0.02em" }}>{job.title}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {job.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text3 }}>
                          <MapPin size={10} style={{ color: C.text4 }} />{job.location}
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: WORK_TYPE_COLORS[job.work_type] ?? C.text3, border: "1px solid rgba(255,255,255,0.07)" }}>
                        {WORK_TYPE_LABELS[job.work_type]}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: C.text3, border: "1px solid rgba(255,255,255,0.07)" }}>
                        {LEVEL_LABELS[job.level] ?? job.level}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.text4 }}>
                        <Clock size={10} />{daysAgo(job.posted_at)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedJob(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text4, padding: 6, flexShrink: 0, borderRadius: 8, display: "flex" }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* ── Two-column body ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", flex: 1, minHeight: 0, overflow: "hidden" }}>

                {/* LEFT — verbatim job description */}
                <div style={{ overflowY: "auto", padding: "28px 32px 40px", borderRight: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>Job description</span>
                    <span style={{ fontSize: 10, color: C.text4, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>from employer</span>
                  </div>
                  {job.description ? (
                    <p style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {rawDescriptionText(job.description)}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: C.text3, margin: 0, lineHeight: 1.7 }}>
                      No description provided. View the full posting for details.
                    </p>
                  )}
                </div>

                {/* RIGHT — Alex Rivera coaching panel (warm light) */}
                <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", background: A.bg }}>

                  {/* Alex identity bar — sticky */}
                  <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${A.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, position: "sticky", top: 0, background: A.bg, zIndex: 1 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: A.tealSoft, border: `1px solid ${A.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: A.teal }}>AR</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: A.text1 }}>Alex Rivera</div>
                      <div style={{ fontSize: 11, color: A.teal, fontWeight: 600, marginTop: 1 }}>Senior BA Coach</div>
                    </div>
                  </div>

                  {/* Coaching content */}
                  <div style={{ padding: "20px 22px 32px", flex: 1 }}>
                    <p style={{ fontSize: 12.5, color: A.text3, marginBottom: 24, lineHeight: 1.7, fontStyle: "italic" }}>
                      &ldquo;I&apos;ve reviewed this role. Here&apos;s what I&apos;d tell you before you apply.&rdquo;
                    </p>

                    {insightLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 4 }}>Reviewing role…</div>
                        {[78, 55, 90, 48, 70].map((w, i) => (
                          <div key={i} style={{ height: 9, borderRadius: 5, background: A.tealSoft, width: `${w}%`, animation: "pulse 1.2s ease-in-out infinite" }} />
                        ))}
                        <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.75}}`}</style>
                      </div>
                    ) : (
                      <>
                        {/* WHAT I'M SEEING */}
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 12 }}>What I&apos;m seeing</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {insight.insights.map((ins, i) => (
                              <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: A.bgCard, border: `1px solid ${A.border}` }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: A.text1, marginBottom: 5 }}>{ins.heading}</div>
                                <p style={{ fontSize: 12, color: A.text2, lineHeight: 1.65, margin: 0 }}>{ins.body}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* MY ADVICE */}
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 12 }}>My advice</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {insight.advice.map((a, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, color: A.text2, lineHeight: 1.65 }}>
                                <span style={{ color: A.teal, flexShrink: 0, fontWeight: 700, fontSize: 14, marginTop: -1 }}>→</span>
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* WHAT THEY'LL LIKELY TEST YOU ON */}
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 10 }}>What they&apos;ll likely test you on</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                            {insight.interviewFocus.map((f, i) => (
                              <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: A.text2, lineHeight: 1.6 }}>
                                <span style={{ color: A.teal, flexShrink: 0, fontWeight: 700 }}>›</span>{f}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* QUESTIONS TO PRACTICE */}
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 6 }}>Questions to practice</div>
                          <p style={{ fontSize: 11.5, color: A.text3, marginBottom: 12, lineHeight: 1.5 }}>Say these out loud — that&apos;s where you find the real gaps.</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {insight.questions.map((item, i) => (
                              <div key={i} style={{ borderRadius: 10, border: `1px solid ${A.border}`, overflow: "hidden" }}>
                                <div style={{ padding: "11px 13px", background: A.bgCard }}>
                                  <span style={{ color: A.teal, fontWeight: 700, fontSize: 10, marginRight: 6, fontFamily: "monospace" }}>Q{i + 1}</span>
                                  <span style={{ fontSize: 12.5, color: A.text1, lineHeight: 1.6, fontWeight: 600 }}>{item.q}</span>
                                </div>
                                <div style={{ padding: "9px 13px", background: A.bg, borderTop: `1px solid ${A.border}` }}>
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: A.teal, marginRight: 5 }}>Coaching note:</span>
                                  <span style={{ fontSize: 11.5, color: A.text3, lineHeight: 1.6 }}>{item.note}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Practice CTAs */}
                        <div style={{ display: "flex", gap: 7, marginBottom: 20 }}>
                          <button onClick={() => { setSelectedJob(null); isLoggedIn ? handlePractice(job) : router.push("/signup"); }}
                            style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: A.tealSoft, color: A.teal, border: `1px solid ${A.tealBorder}` }}>
                            Practice questions
                          </button>
                          <button onClick={() => { setSelectedJob(null); isLoggedIn ? handlePractice(job) : router.push("/signup"); }}
                            style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "transparent", color: A.text3, border: `1px solid ${A.border}` }}>
                            BA challenge
                          </button>
                        </div>

                        {/* MY COACHING TOOLKIT */}
                        <div style={{ borderRadius: 12, border: `1px solid ${A.tealBorder}`, background: A.tealSoft, padding: "14px 16px", marginBottom: 20 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: A.teal, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Get my full coaching toolkit for this role</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <Link href={isLoggedIn ? "/career" : "/signup"}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "#fff", border: `1px solid ${A.border}`, textDecoration: "none" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: A.text1 }}>Tailor my resume for this role</span>
                              <span style={{ fontSize: 10.5, color: A.teal, fontWeight: 700 }}>Career Suite</span>
                            </Link>
                            <button onClick={() => { setSelectedJob(null); router.push(isLoggedIn ? "/pitchready" : "/signup"); }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "#fff", border: `1px solid ${A.border}`, cursor: "pointer", width: "100%", textAlign: "left" }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: A.text1 }}>Pitch ready — practice with feedback</span>
                              <span style={{ fontSize: 10.5, color: A.teal, fontWeight: 700 }}>Pitch Ready</span>
                            </button>
                          </div>
                        </div>

                        {/* Apply */}
                        <div style={{ borderTop: `1px solid ${A.border}`, paddingTop: 16, marginBottom: 16 }}>
                          <a href={apply.href} target="_blank" rel="noopener noreferrer"
                            onClick={() => setAppliedJobs(prev => new Set(prev).add(job.id))}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 10, background: A.teal, color: "#fff", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>
                            Apply on company site <ExternalLink size={13} />
                          </a>
                          {!apply.isDirect && (
                            <p style={{ fontSize: 11, color: A.text4, textAlign: "center", marginTop: 5 }}>Opens employer careers page</p>
                          )}
                        </div>

                        {/* Disclaimer */}
                        <p style={{ fontSize: 11, color: A.text4, lineHeight: 1.6, margin: 0 }}>
                          Alex Rivera is an independent career coach, not affiliated with this employer. Coaching notes are based on patterns from 140+ BA roles across Canada.
                        </p>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
