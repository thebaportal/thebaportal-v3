/**
 * Dynamic BA coaching engine — reads the actual job description.
 *
 * Extracts the most specific, high-signal phrases from the posting and
 * generates insights that quote those phrases directly. Every coaching note
 * is anchored to something the employer actually wrote — not generic patterns.
 *
 * Fallback: signal-based insights for jobs with thin or generic descriptions.
 */

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PrepLink { label: string; href: string }

export interface JobListing {
  id:                 string;
  title:              string;
  company:            string | null;
  location:           string | null;
  description:        string | null;
  apply_url:          string | null;
  url:                string | null;
  posted_at:          string;
  work_type:          "remote" | "hybrid" | "onsite";
  level:              "entry" | "junior" | "mid" | "senior";
  quality_score:      number;
  prep_links:         PrepLink[] | null;
  source_type:        string | null;
  source_name:        string | null;
  verified_apply_url: string | null;
  apply_url_status:   string | null;
}

export interface CoachingInsight { heading: string; body: string }
export interface CoachingQuestion { q: string; note: string }

export interface JobInsight {
  insights:       CoachingInsight[];
  advice:         string[];
  interviewFocus: string[];
  questions:      CoachingQuestion[];
}

// ── HTML stripping ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Scored line extraction ────────────────────────────────────────────────────

type LineTag = "system" | "years" | "ownership" | "deliverable" | "constraint" | "industry" | "required";

interface ScoredLine {
  text:  string;
  score: number;
  tags:  LineTag[];
}

const NAMED_SYSTEMS = /\b(SAP|Salesforce|Workday|ServiceNow|Oracle|Dynamics 365|MS Dynamics|Azure|AWS|Power BI|PowerBI|Tableau|Jira|Confluence|SharePoint|Epic|SQL|Python|Snowflake|MuleSoft|Guidewire|PeopleSoft)\b/i;

function extractTopLines(description: string): ScoredLine[] {
  const plain = stripHtml(description);

  const lines = plain
    .split(/[\n\r]+/)
    .map(l => l.replace(/^[\s•·●▪\-\*\d\.\)]+/, "").trim())
    .filter(l => l.length >= 20 && l.length <= 300);

  const scored: ScoredLine[] = lines.map(text => {
    const lower = text.toLowerCase();
    let score   = 0;
    const tags: LineTag[] = [];

    // Named enterprise systems — highest value
    if (NAMED_SYSTEMS.test(text)) {
      score += 12; tags.push("system");
    }
    // Years of experience with explicit BA/analyst context
    if (/\b(\d+)\+?\s*years?\s*(of\s*)?(business analysis|BA\s+|analyst|experience)/i.test(text)) {
      score += 11; tags.push("years");
    }
    // General experience requirement (slightly lower)
    if (/\b\d+\+?\s*years?\s*(of\s*)?experience/i.test(text) && !tags.includes("years")) {
      score += 9; tags.push("years");
    }
    // Regulatory / compliance — highest specificity
    if (/\b(hipaa|hitech|pipeda|sox|sarbanes|gdpr|osfi|fintrac|atip|phipa|privacy legislation|anti.money laundering|\baml\b|mifid|basel|crtc)\b/i.test(lower)) {
      score += 12; tags.push("constraint");
    }
    // Specific BA artifacts
    if (/\b(brd|frd|user stor|use case|acceptance criteria|process map|bpmn|swimlane|data model|traceability matrix|uat plan|test strategy|prd|functional spec|current state|future state|as.is|to.be)\b/i.test(lower)) {
      score += 9; tags.push("deliverable");
    }
    // Strong ownership verbs
    if (/\b(lead|own|drive|oversee|spearhead|champion|accountable for|responsible for|manage the|deliver the|execute)\b/i.test(lower)) {
      score += 8; tags.push("ownership");
    }
    // Industry domain context
    if (/\b(patient|clinical|ehr|underwriting|claims|actuarial|aml|osfi|basel|provincial|municipal|crown|ministry|k-12|curriculum|enrollment|ecommerce|merchandise|hydro|nuclear|carrier|wireless)\b/i.test(lower)) {
      score += 9; tags.push("industry");
    }
    // Hard requirement markers
    if (/\b(required|must have|mandatory|essential)\b/i.test(lower)) {
      score += 5; tags.push("required");
    }
    // Specific numbers / metrics bonus
    if (/\b\d{2,}\b|\b\d+%/.test(text)) score += 3;
    // Short, focused bullet bonus
    if (text.length >= 25 && text.length <= 110) score += 2;

    // Generic filler — penalise
    if (/\b(excellent|strong|good|great|dynamic|fast.paced|team player|self.starter|motivated|passionate|collaborative|adaptable)\b/i.test(lower)) {
      score -= 4;
    }
    // Hard boilerplate — heavily penalise
    if (/\b(equal opportunity|diversity|inclusion|benefits|competitive|apply online|resume|cover letter|work permit|authorized to work|criminal background|reference check)\b/i.test(lower)) {
      score -= 20;
    }
    // Section header heuristic (short, capitalised, no verb, no period)
    if (text.length < 28 && /^[A-Z]/.test(text) && !/[.!?,]/.test(text) && !/\b(is|are|will|can|must|should|have|has)\b/i.test(text)) {
      score -= 12;
    }

    return { text, score, tags };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function trimQuote(text: string, maxLen = 88): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen).replace(/\s+\S+$/, "");
  return cut + "…";
}

// ── Signal extraction (for fallback + advice / focus / questions) ─────────────

interface JobSignals {
  systems:          string[];
  industry:         string | null;
  responsibilities: string[];
  constraints:      string[];
  company:          string;
  level:            "entry" | "mid" | "senior";
}

const SYSTEMS: [RegExp, string][] = [
  [/\bsap\b/i,                                     "SAP"],
  [/\bsalesforce\b/i,                              "Salesforce"],
  [/\bworkday\b/i,                                 "Workday"],
  [/\bazure\b/i,                                   "Azure"],
  [/\bservicenow\b/i,                              "ServiceNow"],
  [/\boracle\b/i,                                  "Oracle"],
  [/\bdynamics 365\b|\bms dynamics\b|\bcrm\b/i,   "Microsoft Dynamics"],
  [/\bepic\b/i,                                    "Epic"],
  [/\bpower bi\b|\bpowerbi\b/i,                   "Power BI"],
  [/\btableau\b/i,                                 "Tableau"],
  [/\bjira\b/i,                                    "Jira"],
  [/\bsharepoint\b/i,                              "SharePoint"],
  [/\baws\b/i,                                     "AWS"],
  [/\bsql\b/i,                                     "SQL"],
  [/\bpython\b/i,                                  "Python"],
];

const INDUSTRIES: [RegExp, string][] = [
  [/\b(patient|clinical|hospital|healthcare|ehr|nursing|physician|medical|pharma)\b/i,               "healthcare"],
  [/\b(bank|banking|aml|anti.money|osfi|basel|brokerage|investment bank|capital markets|wealth)\b/i, "finance"],
  [/\b(insurance|underwriting|claims|actuary|policyholder|reinsurance)\b/i,                          "insurance"],
  [/\b(government|municipality|provincial|federal|ministry|crown corporation|public sector|atip)\b/i,"government"],
  [/\b(university|college|school board|k-12|education|student|academic|curriculum)\b/i,              "education"],
  [/\b(retail|e-commerce|ecommerce|consumer goods|inventory|supply chain)\b/i,                       "retail"],
  [/\b(telecom|telecommunications|wireless|carrier|mobility|isp|crtc)\b/i,                           "telecom"],
  [/\b(energy|utilities|oil|gas|mining|hydro|nuclear|renewables)\b/i,                                "energy"],
];

const RESPONSIBILITIES: [RegExp, string][] = [
  [/\buat\b|user acceptance test/i,                                "UAT"],
  [/process mapping|as.is.{0,20}to.be|current state.{0,20}future state/i, "process mapping"],
  [/stakeholder workshop|facilitat/i,                              "stakeholder facilitation"],
  [/data migration/i,                                              "data migration"],
  [/system implementation|system deployment|system rollout/i,      "system implementation"],
  [/change management|ocm\b/i,                                     "change management"],
  [/requirements elicitation/i,                                    "requirements elicitation"],
  [/data governance/i,                                             "data governance"],
  [/vendor management/i,                                           "vendor management"],
  [/test plan|testing strategy/i,                                  "test planning"],
];

const CONSTRAINTS: [RegExp, string][] = [
  [/hipaa|hitech/i,                 "HIPAA"],
  [/pipeda/i,                       "PIPEDA"],
  [/\bsox\b|sarbanes.oxley/i,       "SOX"],
  [/\bgdpr\b/i,                     "GDPR"],
  [/\bosfi\b/i,                     "OSFI"],
  [/fintrac/i,                      "FINTRAC"],
  [/patient safety/i,               "patient safety standards"],
  [/\batip\b/i,                     "ATIP"],
  [/privacy legislation|privacy law/i, "privacy legislation"],
];

function extractSignals(job: JobListing): JobSignals {
  const text = [job.title, job.description].filter(Boolean).join(" ");
  return {
    systems:          SYSTEMS.filter(([re]) => re.test(text)).map(([, n]) => n),
    industry:         INDUSTRIES.find(([re]) => re.test(text))?.[1] ?? null,
    responsibilities: RESPONSIBILITIES.filter(([re]) => re.test(text)).map(([, n]) => n),
    constraints:      CONSTRAINTS.filter(([re]) => re.test(text)).map(([, n]) => n),
    company:          job.company ?? "this company",
    level:            /\b(senior|sr\.?|lead|principal|staff)\b/i.test(text) ? "senior"
                    : /\b(junior|jr\.?|entry.level|associate|new.?grad)\b/i.test(text) ? "entry"
                    : "mid",
  };
}

// ── Quote-based insight builders ──────────────────────────────────────────────

function buildQuoteInsights(topLines: ScoredLine[], signals: JobSignals): CoachingInsight[] {
  const { company } = signals;
  const insights: CoachingInsight[] = [];
  const usedCategories = new Set<string>();

  for (const line of topLines) {
    if (insights.length >= 3) break;
    const primaryTag = line.tags[0];
    if (!primaryTag || usedCategories.has(primaryTag)) continue;

    const q = trimQuote(line.text);

    if (primaryTag === "system") {
      const sysMatch = line.text.match(NAMED_SYSTEMS);
      const sys = sysMatch?.[0] ?? "this system";
      insights.push({
        heading: `${sys} is live infrastructure here — not a training opportunity`,
        body: `They wrote: "${q}" — that's an active environment they need someone to produce inside from day one. ${company} isn't evaluating ${sys} and they won't train you on it. In the interview, name the project, the phase you were in, and the specific deliverable you produced. "I've used ${sys}" without a story gets screened out.`,
      });
      usedCategories.add("system");

    } else if (primaryTag === "years") {
      const yearsMatch = line.text.match(/\b(\d+)\+?\s*years?/i);
      const yrs = yearsMatch?.[1] ?? "several";
      const isRequired = line.tags.includes("required");
      insights.push({
        heading: isRequired
          ? `${yrs}+ years is the hard floor — not a guideline`
          : `The experience bar is specific — know exactly where you sit`,
        body: `They said: "${q}." ${isRequired ? "Required means required." : "That specificity is deliberate."} If you hit the bar: don't just state the number — show what you've done across those years, the complexity of the initiatives, the industries. If you're below it: walk in with a direct answer for why the quality of your work earns you the conversation anyway.`,
      });
      usedCategories.add("years");

    } else if (primaryTag === "constraint") {
      const constraintMatch = line.text.match(/\b(HIPAA|HITECH|PIPEDA|SOX|GDPR|OSFI|FINTRAC|ATIP|PHIPA|AML)\b/i);
      const constraint = constraintMatch?.[0]?.toUpperCase() ?? "regulatory compliance";
      insights.push({
        heading: `${constraint} shapes every requirement — this isn't a footnote`,
        body: `They wrote: "${q}" — that's compliance baked into the role, not a check at the end. ${company} needs a BA who flags regulatory risk as part of their process, not who passes it to a separate team. If you've worked in regulated environments: establish it in the first ten minutes. If you haven't: have a direct answer ready.`,
      });
      usedCategories.add("constraint");

    } else if (primaryTag === "ownership") {
      const verb = line.text.match(/\b(Lead|Own|Drive|Oversee|Spearhead|Champion|Accountable|Responsible|Deliver|Execute)\b/i)?.[0] ?? "Lead";
      insights.push({
        heading: `They wrote "${verb}" for a reason — this isn't a support role`,
        body: `"${q}" — ${company} didn't say "support" or "assist." Every example you bring to the interview needs to end with what you personally drove to completion. Supporting cast stories won't land here. What did you close? What changed because of what you did?`,
      });
      usedCategories.add("ownership");

    } else if (primaryTag === "deliverable") {
      insights.push({
        heading: `They named a specific artifact — that's the interview question`,
        body: `"${q}" — when a JD names a deliverable, the interviewer will ask you to walk them through one you've produced. Not "I've done requirements gathering." Name the document, describe the problem it solved, name the decision it drove. Have that story ready before you walk in.`,
      });
      usedCategories.add("deliverable");

    } else if (primaryTag === "industry") {
      insights.push({
        heading: `Domain fluency isn't assumed — this line says it's expected`,
        body: `"${q}" — ${company} operates in a context where the business domain shapes every requirement you write. Even if the JD doesn't say "industry experience required," this line tells you the depth they expect. Your examples need to show you've worked where the domain mattered, not just where the process existed.`,
      });
      usedCategories.add("industry");
    }
  }

  return insights;
}

// ── Signal-based fallback (when description is thin or generic) ───────────────

function buildSignalInsights(signals: JobSignals): CoachingInsight[] {
  const { systems, industry, responsibilities, constraints, company, level } = signals;
  const out: CoachingInsight[] = [];

  if (systems.length >= 2) {
    const [a, b] = systems;
    out.push({
      heading: `${a} and ${b} are both named — show you know both`,
      body: `${company} listed both ${a} and ${b}. That's active infrastructure in both systems — they need a BA who can bridge requirements across both without getting lost. Name specific projects, phases, and deliverables for each. "I've worked with ${a}" without a story won't get you through.`,
    });
  } else if (systems.length === 1) {
    const sys = systems[0];
    out.push({
      heading: `${sys} is central to this role`,
      body: `${company} called out ${sys} specifically. This is existing infrastructure — not a tool they're evaluating. Name the project, the phase, and the deliverable you produced inside it. Candidates who say "familiar with ${sys}" without specifics don't make the shortlist.`,
    });
  }

  if (industry === "healthcare" && out.length < 3) {
    out.push({
      heading: "Clinical context changes how every requirement gets written",
      body: `Healthcare BA roles aren't just about documenting what users want — every requirement touches patient care workflow${constraints.includes("HIPAA") ? " and HIPAA compliance" : ""}. ${company} will test whether you understand that a missed requirement here is a clinical risk, not just a bug.`,
    });
  } else if (industry === "finance" && out.length < 3) {
    out.push({
      heading: "Compliance shapes your requirements whether the JD says so or not",
      body: `Finance BA roles exist inside a regulatory framework by default${constraints.length > 0 ? ` — this one specifically mentions ${constraints.slice(0, 2).join(" and ")}` : ""}. ${company} will expect you to flag when a proposed solution creates compliance risk, not just document what the business asked for.`,
    });
  } else if (industry === "insurance" && out.length < 3) {
    out.push({
      heading: "Insurance domain knowledge is the hidden requirement here",
      body: `${company} is looking for someone who can work with underwriting, claims, or actuarial teams without needing the domain explained from scratch. Your examples need to show familiarity with policy lifecycle, claims workflow, or underwriting processes.`,
    });
  } else if (industry === "government" && out.length < 3) {
    out.push({
      heading: "Public sector BA work has a different rhythm — they'll test for it",
      body: `Government BA roles move through longer approval cycles, carry more political weight, and involve accountability structures that private sector roles don't have. ${company} wants someone who understands how decisions actually get made in a public environment.`,
    });
  }

  if (responsibilities.includes("UAT") && out.length < 3) {
    out.push({
      heading: "UAT ownership means the whole cycle — not just test cases",
      body: `${company} needs a BA who owns UAT coordination: planning cycles, managing business testers, tracking defects back to requirements, and making the go/no-go call. Passive test participation won't satisfy what they're describing here.`,
    });
  }
  if (responsibilities.includes("data migration") && out.length < 3) {
    out.push({
      heading: "Data migration requirements are where the real work happens",
      body: `${company} is running or planning a migration. Your requirements need to cover data quality rules, transformation logic, validation criteria, and rollback conditions — not just functional features. Name a specific migration and what you documented beyond the basics.`,
    });
  }
  if (responsibilities.includes("process mapping") && out.length < 3) {
    out.push({
      heading: "Process mapping means the honest version — not the polished one",
      body: `${company} wants as-is to to-be. The BA who produces useful process maps is the one who captures the workarounds and exceptions nobody talks about in meetings — not just the clean happy path that gets presented to management.`,
    });
  }
  if (responsibilities.includes("change management") && out.length < 3) {
    out.push({
      heading: "Adoption is part of your deliverable here",
      body: `When a JD pairs BA with change management, ${company} has likely seen implementations go live without buy-in. They need someone who stays engaged after sign-off: training support, communication planning, managing resistance. Show what happened after you delivered.`,
    });
  }

  if (level === "senior" && out.length < 3) {
    out.push({
      heading: "Senior means accountability for the outcome — not just the process",
      body: `${company} is hiring at a senior level. They're not looking for a task executor — they want someone who owns business analysis end to end. Every example should end with what changed for the business, not what you delivered. If you can't name the outcome, the story isn't ready.`,
    });
  }

  if (out.length === 0) {
    out.push({
      heading: "Core BA fundamentals are the baseline — execution is the differentiator",
      body: `${company} cares most about structured requirements work, clear stakeholder communication, and moving from ambiguous problems to documented, signed-off solutions. Every example you bring needs to show all three.`,
    });
    out.push({
      heading: "Your artifacts are your credibility",
      body: `The interview comes down to whether you can name specific deliverables you personally produced and connect them to business decisions they drove. "I worked on requirements" is not an answer. "I produced a BRD that resolved a three-month impasse between operations and IT and drove the system selection" is.`,
    });
  }

  return out.slice(0, 3);
}

// ── Advice ────────────────────────────────────────────────────────────────────

function buildAdvice(signals: JobSignals): string[] {
  const { level, systems, industry, company } = signals;
  const advice: string[] = [];

  if (level === "senior") {
    advice.push(`Lead every answer with the business outcome. At ${company}'s level, "I ran stakeholder workshops" is table stakes. "I ran workshops that resolved a three-month requirements impasse and unblocked a $2M implementation" is what gets you to the offer.`);
  } else if (level === "entry") {
    advice.push("Don't apologise for your experience level — reframe it. Academic projects, bootcamp work, and volunteer BA roles count if you talk about them with rigour. Name the artifact. Name the decision it drove. Name the stakeholders you worked with.");
  } else {
    advice.push(`Specificity is what separates shortlisted candidates from forgettable ones. Instead of "gathered requirements from stakeholders," say "ran three workshops with operations and IT to align on a claims redesign that reduced processing time by 30%." Names, numbers, outcomes.`);
  }

  if (systems.length > 0) {
    advice.push(`If your ${systems[0]} experience is real: lead with it — put it on the first page of your resume with a named project. If it's limited: be direct in the interview. "I've worked adjacent to ${systems[0]} and here's what I can produce from day one." Overstating a named system fails in the technical screen and it's hard to recover.`);
  } else if (industry) {
    advice.push(`Research ${company}'s ${industry} context before the interview. Know their products, their competitive pressures, and any recent announcements. BA candidates who walk in understanding the domain get taken more seriously than those who treat the role as industry-agnostic.`);
  } else {
    advice.push("Prepare two strong STAR stories: one about navigating conflicting stakeholder priorities, and one about a BA deliverable that directly influenced a business decision. Those two stories cover 80% of BA interview questions at any level.");
  }

  return advice;
}

// ── Interview focus ───────────────────────────────────────────────────────────

function buildInterviewFocus(signals: JobSignals, topLines: ScoredLine[]): string[] {
  const { industry, systems, responsibilities, constraints, level } = signals;
  const focus: string[] = [];

  const topSys = topLines.find(l => l.tags.includes("system"));
  if (topSys) {
    const sysMatch = topSys.text.match(NAMED_SYSTEMS);
    const sys      = sysMatch?.[0] ?? systems[0];
    if (sys) focus.push(`Your ${sys} experience — project name, phase, and the specific deliverable you produced inside it`);
  } else if (systems.length > 0) {
    focus.push(`Your ${systems[0]} experience — project name, phase, deliverable, and decision it drove`);
  }

  const topYears = topLines.find(l => l.tags.includes("years"));
  if (topYears) {
    const m = topYears.text.match(/\b(\d+)\+?\s*years?/i);
    if (m) focus.push(`How your ${m[1]}+ years of experience maps specifically to what this role requires — not just tenure, but depth`);
  }

  if (industry === "healthcare") focus.push("How you've navigated clinical or patient safety constraints in your requirements work");
  if (industry === "finance" || industry === "insurance") focus.push("Your experience in regulated environments and how compliance shapes your deliverables");
  if (industry === "government") focus.push("Your ability to navigate long approval cycles and multi-stakeholder governance structures");
  if (responsibilities.includes("UAT")) focus.push("How you owned a UAT cycle end to end — test planning, defect triage, and the go/no-go recommendation");
  if (responsibilities.includes("stakeholder facilitation")) focus.push("How you facilitated workshops where stakeholders had fundamentally conflicting requirements");
  if (responsibilities.includes("process mapping")) focus.push("A specific as-is to to-be mapping where documenting the real current state was politically difficult");
  if (responsibilities.includes("data migration")) focus.push("Data migration requirements you've written — specifically transformation rules and edge case handling");
  if (level === "senior") focus.push("End-to-end initiative ownership — from diagnosing the business problem through post-implementation review");
  if (constraints.length > 0) focus.push(`How ${constraints[0]} compliance requirements shaped your requirements process and deliverables`);

  if (focus.length < 3) {
    focus.push("How you move from a vague business problem to a structured, signed-off set of requirements");
    focus.push("A time you pushed back on a stakeholder request — and what happened");
    focus.push("How you know when requirements are detailed enough to hand over");
  }

  return focus.slice(0, 4);
}

// ── Practice questions ────────────────────────────────────────────────────────

function buildQuestions(signals: JobSignals, topLines: ScoredLine[]): CoachingQuestion[] {
  const { systems, industry, responsibilities, constraints } = signals;
  const questions: CoachingQuestion[] = [];

  // Quote-derived system question (most specific)
  const topSys = topLines.find(l => l.tags.includes("system"));
  if (topSys) {
    const sysMatch = topSys.text.match(NAMED_SYSTEMS);
    const sys      = sysMatch?.[0] ?? systems[0];
    if (sys) {
      questions.push({
        q:    `Walk me through a project where you worked directly with ${sys}. What was your role as the BA and what did you produce?`,
        note: `Name the project, the phase, and the specific deliverable. "Experience with ${sys}" on a resume means nothing without a story. They want to know what you produced inside it and what business decision it influenced.`,
      });
    }
  } else if (systems.length > 0) {
    questions.push({
      q:    `Walk me through a project where you worked with ${systems[0]}. What did you personally produce?`,
      note: `Name the project, the phase, and the specific deliverable — not just that you "used" it. What was the outcome?`,
    });
  }

  // Ownership-derived question
  const topOwnership = topLines.find(l => l.tags.includes("ownership"));
  if (topOwnership && questions.length < 3) {
    const verb = topOwnership.text.match(/\b(Lead|Own|Drive|Deliver|Manage|Oversee|Spearhead)\b/i)?.[0]?.toLowerCase() ?? "lead";
    questions.push({
      q:    `Tell me about an initiative you ${verb} as the BA. What did you own from start to finish?`,
      note: `They used a strong ownership verb in the JD — they're listening for end-to-end accountability. Not "I contributed to." What did you personally close? What changed because of what you did?`,
    });
  }

  // Regulated environment question
  if ((industry === "healthcare" || industry === "finance" || industry === "insurance" || constraints.length > 0) && questions.length < 3) {
    questions.push({
      q:    "Tell me about a time a compliance or regulatory requirement changed the direction of a project you were working on.",
      note: "Show that you identified the constraint early, understood its implications, and changed your requirements approach because of it — not that you found out at the end and had to scramble.",
    });
  }

  // Responsibility-specific questions
  if (responsibilities.includes("stakeholder facilitation") && questions.length < 3) {
    questions.push({
      q:    "Tell me about a time stakeholders fundamentally couldn't agree on what they needed. How did you move forward?",
      note: "Name the parties, the specific conflict, and the technique you used — structured workshop, decision matrix, escalation path. 'I facilitated discussion' is not an answer.",
    });
  }
  if (responsibilities.includes("UAT") && questions.length < 3) {
    questions.push({
      q:    "Walk me through how you planned and managed a UAT cycle. What did you own versus the testing team?",
      note: "They want to hear about entry criteria, defect triage back to requirements, and how you made the go/no-go call. Passive participation in testing won't impress here.",
    });
  }
  if (responsibilities.includes("data migration") && questions.length < 3) {
    questions.push({
      q:    "Walk me through how you approached requirements for a data migration. What did you document beyond functional specs?",
      note: "They want to hear about transformation rules, data quality thresholds, validation criteria, and rollback conditions. Stopping at 'what the system should do' isn't enough for a migration.",
    });
  }
  if (responsibilities.includes("process mapping") && questions.length < 3) {
    questions.push({
      q:    "Describe a process you mapped where the as-is didn't match what people told you it was.",
      note: "Lead with the gap between the stated and actual process. Any BA can draw a flowchart. The ones who add value find the hidden workarounds and document them honestly.",
    });
  }

  // Fallback to always ensure 3 questions
  if (questions.length < 3) {
    questions.push({
      q:    "Walk me through your process for gathering and documenting requirements for a complex initiative.",
      note: "Structure is what they're listening for. Do you start with the business problem? Do you mention elicitation techniques, gap analysis, sign-off process? 'Working with the team' is not a process.",
    });
    questions.push({
      q:    "Give me an example of a BA deliverable you produced that directly influenced a business decision.",
      note: "Name the artifact. Name the decision. Name the outcome. This is the core of what BAs do. If you can't connect your work to a business change, that gap will show in the interview.",
    });
  }

  return questions.slice(0, 3);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateInsight(job: JobListing): JobInsight {
  const signals  = extractSignals(job);
  const topLines = job.description ? extractTopLines(job.description) : [];

  // Quote-based insights from the actual JD, filled by signal-based fallbacks
  const quoteInsights  = buildQuoteInsights(topLines, signals);
  const signalInsights = buildSignalInsights(signals);

  const usedHeadings = new Set(quoteInsights.map(i => i.heading));
  const merged = [...quoteInsights];
  for (const si of signalInsights) {
    if (merged.length >= 3) break;
    if (!usedHeadings.has(si.heading)) merged.push(si);
  }

  return {
    insights:       merged.slice(0, 3),
    advice:         buildAdvice(signals),
    interviewFocus: buildInterviewFocus(signals, topLines),
    questions:      buildQuestions(signals, topLines),
  };
}
