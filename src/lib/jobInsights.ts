/**
 * Dynamic BA coaching insight engine.
 *
 * Extracts specific signals from a job description (named systems, industry,
 * responsibilities, regulatory constraints) and generates insights that
 * reference those signals directly — so every insight feels written for
 * this specific role, not copy-pasted from a template.
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

// ── Signal extraction ─────────────────────────────────────────────────────────

interface JobSignals {
  systems:         string[];
  industry:        string | null;
  responsibilities: string[];
  constraints:     string[];
  company:         string;
  level:           "entry" | "mid" | "senior";
}

const SYSTEMS: [RegExp, string][] = [
  [/\bsap\b/i,                               "SAP"],
  [/\bsalesforce\b/i,                        "Salesforce"],
  [/\bworkday\b/i,                           "Workday"],
  [/\bazure\b/i,                             "Azure"],
  [/\bservicenow\b/i,                        "ServiceNow"],
  [/\boracle\b/i,                            "Oracle"],
  [/\bdynamics 365\b|\bms dynamics\b|\bcrm\b/i, "Microsoft Dynamics"],
  [/\bepic\b/i,                              "Epic"],
  [/\b(sis|student information system)\b/i,  "SIS"],
  [/\bpower bi\b/i,                          "Power BI"],
  [/\btableau\b/i,                           "Tableau"],
  [/\bjira\b/i,                              "Jira"],
  [/\bconfluence\b/i,                        "Confluence"],
  [/\bsharepoint\b/i,                        "SharePoint"],
  [/\baws\b/i,                               "AWS"],
  [/\bgoogle cloud\b|\bgcp\b/i,              "Google Cloud"],
  [/\bsql\b/i,                               "SQL"],
  [/\bpython\b/i,                            "Python"],
];

const INDUSTRIES: [RegExp, string][] = [
  [/\b(patient|clinical|hospital|health care|healthcare|ehr|nursing|physician|medical|diagnostic|pharma)\b/i, "healthcare"],
  [/\b(bank|banking|aml|anti.money|osfi|basel|brokerage|investment bank|capital markets|wealth management)\b/i, "finance"],
  [/\b(insurance|underwriting|claims|actuary|policyholder|reinsurance|broker)\b/i, "insurance"],
  [/\b(government|municipality|provincial|federal|ministry|crown corporation|public sector|atip|legislative)\b/i, "government"],
  [/\b(university|college|school board|k-12|education|student|academic|curriculum|faculty|campus)\b/i, "education"],
  [/\b(retail|e-commerce|ecommerce|consumer goods|merchandise|inventory|supply chain)\b/i, "retail"],
  [/\b(telecom|telecommunications|wireless|carrier|mobility|isp)\b/i, "telecom"],
  [/\b(energy|utilities|oil|gas|mining|hydro|nuclear|renewables)\b/i, "energy"],
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
  [/product roadmap|product backlog/i,                             "product management"],
  [/reporting|dashboard|analytics/i,                               "reporting and analytics"],
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
  [/regulatory compliance/i,        "regulatory compliance"],
];

function extractSignals(job: JobListing): JobSignals {
  const text = [job.title, job.description].filter(Boolean).join(" ");

  return {
    systems:          SYSTEMS.filter(([re])          => re.test(text)).map(([, n]) => n),
    industry:         INDUSTRIES.find(([re])          => re.test(text))?.[1] ?? null,
    responsibilities: RESPONSIBILITIES.filter(([re]) => re.test(text)).map(([, n]) => n),
    constraints:      CONSTRAINTS.filter(([re])       => re.test(text)).map(([, n]) => n),
    company:          job.company ?? "this company",
    level:            /\b(senior|sr\.?|lead|principal|staff)\b/i.test(text) ? "senior"
                    : /\b(junior|jr\.?|entry.level|associate|new.grad)\b/i.test(text) ? "entry"
                    : "mid",
  };
}

// ── Insight builders ─────────────────────────────────────────────────────────

function buildInsights(signals: JobSignals): CoachingInsight[] {
  const { systems, industry, responsibilities, constraints, company, level } = signals;
  const out: CoachingInsight[] = [];

  // 1. Named-system insight (highest specificity — always first)
  if (systems.length >= 2) {
    const [a, b] = systems;
    out.push({
      heading: `${a} and ${b} are not optional extras here`,
      body: `${company} named both ${a} and ${b} in the description. That tells me they have live infrastructure in both and need a BA who can bridge business requirements to system constraints — not just gather and hand over. In your interview, name the specific ${a} project, the phase you joined, and the deliverable you produced. "I've worked with ${a}" is not an answer.`,
    });
  } else if (systems.length === 1) {
    const sys = systems[0];
    out.push({
      heading: `${sys} is central to this role — not a background skill`,
      body: `${company} called out ${sys} directly. This is existing infrastructure they need someone to work within, not a tool they're evaluating. Name the project, the phase, and what you documented or drove when you talk about your ${sys} experience. Candidates who say "I'm familiar with ${sys}" without specifics don't make it past the technical screen.`,
    });
  }

  // 2. Industry-specific insight
  if (industry === "healthcare") {
    out.push({
      heading: "Clinical context changes how every requirement gets written",
      body: `Healthcare BA roles aren't just about documenting what users want — every requirement touches patient care workflow${constraints.includes("HIPAA") ? " and HIPAA compliance" : ""}. ${company} will test whether you understand that a missed requirement here is a clinical risk, not just a bug. Be ready to talk about a time regulatory or safety constraints changed the direction of a requirements deliverable.`,
    });
  } else if (industry === "finance") {
    out.push({
      heading: "Compliance shapes your requirements whether the JD says so or not",
      body: `Finance BA roles exist inside a regulatory framework by default${constraints.length > 0 ? ` — this one specifically mentions ${constraints.slice(0, 2).join(" and ")}` : ""}. ${company} will expect you to flag when a proposed solution creates compliance risk, not just document what the business asked for. If you've worked in regulated environments, establish that in the first ten minutes.`,
    });
  } else if (industry === "insurance") {
    out.push({
      heading: "Insurance domain knowledge is the hidden requirement here",
      body: `${company} is looking for someone who can work with underwriting, claims, or actuarial teams without needing the domain explained from scratch. Even if the JD doesn't say "insurance experience required," your examples need to show familiarity with policy lifecycle, claims workflow, or underwriting processes — or you'll be at a disadvantage against candidates who have it.`,
    });
  } else if (industry === "government") {
    out.push({
      heading: "Public sector BA work has a different rhythm — and they'll test for it",
      body: `Government and public sector BA roles move through longer approval cycles, have more stakeholders with overlapping mandates, and carry more political weight than private sector equivalents. ${company} will want someone who can navigate that without losing momentum. Generic agile answers will not land here — show you understand how decisions get made in a public accountability environment.`,
    });
  } else if (industry === "education") {
    out.push({
      heading: "Academic governance is messier than it looks on the org chart",
      body: `Education sector BA roles sit at the intersection of faculty, administration, IT, and students — four groups who all have priorities and none of whom have clear authority over the others. ${company} needs someone who can build consensus across that without formal power. Your stakeholder examples need to show that kind of ambiguity.`,
    });
  } else if (industry === "telecom") {
    out.push({
      heading: "Telecom BA work is technically demanding and politically complex",
      body: `Telecom environments typically have deep legacy infrastructure, multiple competing product lines, and regulatory requirements that overlap with the CRTC. ${company} will want a BA who can work across network, product, and compliance teams without losing the thread. Show you've navigated cross-functional complexity in a technically constrained environment.`,
    });
  }

  // 3. Responsibility-specific insights
  if (responsibilities.includes("UAT") && out.length < 3) {
    out.push({
      heading: "UAT ownership means the whole cycle — not just test cases",
      body: `The JD mentions UAT, which at ${company} likely means the BA owns coordination: planning the test cycles, managing business testers, tracking defects back to specific requirements, and making the go/no-go recommendation. If your UAT experience has been passive — writing test cases and watching someone else run them — that won't satisfy what they're describing.`,
    });
  }

  if (responsibilities.includes("data migration") && out.length < 3) {
    out.push({
      heading: "Data migration requirements are where the real work happens",
      body: `${company} is running or planning a data migration, which means your requirements need to cover data quality rules, transformation logic, validation criteria, and rollback conditions — not just functional features. The BA who can map legacy data to target state and document the edge cases is the one who survives go-live without a crisis. Name a migration you've worked on with specific detail.`,
    });
  }

  if (responsibilities.includes("process mapping") && out.length < 3) {
    out.push({
      heading: "Process mapping means the honest version — not the polished one",
      body: `${company} wants as-is to to-be documentation, which sounds simple until you're in a room with people who've been doing things the wrong way for years and don't want it written down. The BA who produces useful process maps is the one who captures the workarounds, exceptions, and manual fixes that nobody talks about in meetings.`,
    });
  }

  if (responsibilities.includes("change management") && out.length < 3) {
    out.push({
      heading: "Adoption is part of your deliverable here — not someone else's problem",
      body: `When a JD pairs BA responsibilities with change management, it usually means ${company} has seen implementations go live without stakeholder buy-in. They need someone who stays engaged after requirements sign-off: training support, communication planning, and handling the resistance that always shows up post-launch. Show what happened after you delivered.`,
    });
  }

  // 4. Constraints insight (if not already covered in industry insight)
  if (constraints.length > 0 && out.length < 3 && !out.some(i => i.body.includes(constraints[0]))) {
    out.push({
      heading: `${constraints[0]} compliance is not a footnote here`,
      body: `This role operates under ${constraints.join(" and ")}. Every requirement you write needs to be compliant — not just functional. ${company} will test whether you treat compliance as part of your requirements process or as a checkbox someone else handles. If you have direct experience in regulated environments, lead with it. Don't make them dig for it.`,
    });
  }

  // 5. Level-specific fallback
  if (out.length < 2 && level === "senior") {
    out.push({
      heading: "Senior means accountability for the outcome — not just the process",
      body: `${company} is hiring at a senior level, which means they're not looking for a task executor — they want someone who owns the business analysis function end to end. Every example you bring to the interview should end with what changed for the business, not what you delivered. If you can't name the outcome, the story isn't ready.`,
    });
  }

  // 6. Generic fallback if signals are thin
  if (out.length === 0) {
    out.push({
      heading: "Core BA fundamentals are the baseline — execution is the differentiator",
      body: `The description doesn't call out a specific system or niche, which usually means ${company} cares most about structured requirements work, clear stakeholder communication, and moving from ambiguous problems to documented solutions. Every example you bring needs to show all three. Not just one.`,
    });
    out.push({
      heading: "Your artifacts are your credibility",
      body: `For a generalist BA role like this, the interview will come down to whether you can name specific deliverables you personally produced and connect them to business decisions they drove. "I worked on requirements" is not an answer. "I produced a BRD that resolved a three-month disagreement between operations and IT and drove the system selection" is.`,
    });
  }

  return out.slice(0, 3);
}

function buildAdvice(signals: JobSignals): string[] {
  const { level, systems, industry, company } = signals;
  const advice: string[] = [];

  if (level === "senior") {
    advice.push(`Lead every answer with the business outcome, not the activity. At ${company}'s level, "I ran stakeholder workshops" is table stakes. "I ran workshops that resolved a three-month requirements impasse and unblocked a $2M implementation" is what gets you to the offer.`);
  } else if (level === "entry") {
    advice.push("Don't apologise for your experience level — reframe it. Academic projects, bootcamp work, and volunteer BA roles count if you talk about them with rigour. Name the artifact. Name the decision it drove. Name the stakeholders you worked with.");
  } else {
    advice.push(`Specificity is what separates shortlisted candidates from forgettable ones. Instead of "gathered requirements from stakeholders," say "ran three workshops with operations and IT to align on a claims redesign that reduced processing time by 30%." Names, numbers, outcomes.`);
  }

  if (systems.length > 0) {
    advice.push(`If your ${systems[0]} experience is real, lead with it — put it on the first page of your resume with a named project. If it's limited, be direct in the interview: "I've worked adjacent to ${systems[0]} and here's what I can do from day one." Overstating a named system fails in the technical screen and it's hard to recover from.`);
  } else if (industry) {
    advice.push(`Research ${company}'s ${industry} context before the interview. Know their products, their competitive pressures, and any recent public announcements. BA candidates who walk in understanding the domain get taken more seriously than those who treat the role as industry-agnostic.`);
  } else {
    advice.push("Prepare two strong STAR stories: one about navigating conflicting stakeholder priorities, and one about a BA deliverable that directly influenced a business decision. Those two stories cover 80% of BA interview questions at any level.");
  }

  return advice;
}

function buildInterviewFocus(signals: JobSignals): string[] {
  const { industry, systems, responsibilities, constraints, level } = signals;
  const focus: string[] = [];

  if (systems.length > 0)
    focus.push(`Your specific ${systems[0]} experience — project name, phase, deliverable, and decision it drove`);
  if (industry === "healthcare")
    focus.push("How you've navigated clinical or patient safety constraints in your requirements work");
  if (industry === "finance" || industry === "insurance")
    focus.push("Your experience in regulated environments and how compliance shapes your deliverables");
  if (industry === "government")
    focus.push("Your ability to work through long approval cycles and multi-stakeholder governance structures");
  if (responsibilities.includes("UAT"))
    focus.push("How you owned a UAT cycle — test planning, defect triage, and go/no-go recommendation");
  if (responsibilities.includes("stakeholder facilitation"))
    focus.push("How you facilitated workshops where stakeholders had fundamentally conflicting requirements");
  if (responsibilities.includes("process mapping"))
    focus.push("A specific as-is to to-be mapping where documenting the real current state was politically difficult");
  if (responsibilities.includes("data migration"))
    focus.push("Data migration requirements you've written — specifically transformation rules and edge case handling");
  if (responsibilities.includes("change management"))
    focus.push("What you did after delivery to ensure stakeholder adoption when resistance was real");
  if (level === "senior")
    focus.push("End-to-end initiative ownership — from business problem diagnosis through post-implementation review");
  if (constraints.length > 0)
    focus.push(`How ${constraints[0]} compliance requirements shaped your requirements process and deliverables`);

  // Always include these if short
  if (focus.length < 3) {
    focus.push("How you move from a vague business problem to a structured, signed-off set of requirements");
    focus.push("A time you pushed back on a stakeholder request — and what happened");
    focus.push("How you know when requirements are detailed enough to hand over");
  }

  return focus.slice(0, 4);
}

function buildQuestions(signals: JobSignals): CoachingQuestion[] {
  const { systems, industry, responsibilities, constraints } = signals;
  const questions: CoachingQuestion[] = [];

  if (systems.length > 0) {
    questions.push({
      q:    `Walk me through a project where you worked with ${systems[0]}. What was your specific role as the BA?`,
      note: `Name the project, the phase, and the specific deliverable. "I've worked with ${systems[0]}" is not an answer. They want to know what you produced inside it and what decision it drove.`,
    });
  }

  if (industry === "healthcare" || industry === "finance" || industry === "insurance" || constraints.length > 0) {
    questions.push({
      q:    "Tell me about a time a compliance or regulatory requirement changed the direction of a project you were working on.",
      note: "Show that you identified the constraint early, understood its implications, and changed your requirements approach because of it — not that you found out at the end and had to scramble.",
    });
  }

  if (responsibilities.includes("stakeholder facilitation")) {
    questions.push({
      q:    "Tell me about a time stakeholders fundamentally couldn't agree on what they needed. How did you move forward?",
      note: "Name the parties, the specific conflict, and the technique you used — structured workshop, decision matrix, escalation path. 'I facilitated discussion' is not an answer.",
    });
  }

  if (responsibilities.includes("UAT")) {
    questions.push({
      q:    "Walk me through how you planned and managed a UAT cycle. What did you own versus the testing team?",
      note: "They want to hear about entry criteria, defect triage back to requirements, and how you made the go/no-go call. Passive participation in testing will not impress here.",
    });
  }

  if (responsibilities.includes("process mapping")) {
    questions.push({
      q:    "Describe a process you mapped where the as-is didn't match what people told you it was.",
      note: "Lead with the gap between the stated and actual process. Any BA can draw a flowchart. The ones who add value find the hidden workarounds and document them honestly.",
    });
  }

  if (responsibilities.includes("data migration")) {
    questions.push({
      q:    "Walk me through how you approached requirements for a data migration. What did you document beyond functional specs?",
      note: "They want to hear about transformation rules, data quality thresholds, validation criteria, and rollback conditions. Requirements that stop at 'what the system should do' aren't enough for a migration.",
    });
  }

  // Always ensure 3 questions
  if (questions.length < 3) {
    questions.push({
      q:    "Walk me through your process for gathering and documenting requirements for a complex initiative.",
      note: "Structure is what they're listening for. Do you start with the business problem? Do you mention elicitation techniques, gap analysis, sign-off process? 'Working with the team' is not a process.",
    });
    questions.push({
      q:    "Give me an example of a BA deliverable you produced that directly influenced a business decision.",
      note: "Name the artifact. Name the decision. Name the outcome. This is the core of what BAs do. If you can't connect your work to a business change, that gap will show.",
    });
  }

  return questions.slice(0, 3);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateInsight(job: JobListing): JobInsight {
  const signals  = extractSignals(job);
  const insights = buildInsights(signals);
  const advice   = buildAdvice(signals);
  const focus    = buildInterviewFocus(signals);
  const questions = buildQuestions(signals);

  return {
    insights:       insights,
    advice:         advice,
    interviewFocus: focus,
    questions:      questions,
  };
}
