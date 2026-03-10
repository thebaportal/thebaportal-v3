export type ChallengeType =
  | "discovery"
  | "requirements"
  | "solution-analysis"
  | "uat"
  | "production-incident"
  | "elicitation";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  avatar: string;
  personality: string;
  systemPrompt: string;
}

export interface Challenge {
  id: string;
  title: string;
  type: ChallengeType;
  industry: string;
  difficulty: Difficulty;
  duration: string;
  tier: "free" | "pro";
  brief: {
    situation: string;
    yourRole: string;
    deliverable: string;
    hints: string[];
  };
  stakeholders: Stakeholder[];
  evaluationCriteria: string[];
  phases?: string[];
  plantedErrors?: {
    id: string;
    location: string;
    errorType: string;
    flawedStatement: string;
    correctStatement: string;
    explanation: string;
  }[];
  flawedDocument?: string;
}

export interface DifficultyMode {
  id: "normal" | "hard" | "expert";
  label: string;
  description: string;
}

export const difficultyModes: DifficultyMode[] = [
  {
    id: "normal",
    label: "Normal",
    description: "Stakeholders are cooperative and answer questions directly.",
  },
  {
    id: "hard",
    label: "Hard",
    description:
      "One stakeholder is defensive and evasive. You will need to ask better questions to get real answers.",
  },
  {
    id: "expert",
    label: "Expert",
    description:
      "Stakeholders contradict each other and one is domineering. Navigate the conflict and find the truth.",
  },
];

export const hardModeOverrides: Record<string, Record<string, string>> = {
  "banking-discovery-001": {
    "ops-manager": `You are Sandra Okafor, Operations Manager at First National Bank. You are being interviewed by a Business Analyst investigating customer churn.

HARD MODE — DEFENSIVE STAKEHOLDER:
You are defensive today because you know the mobile app issues were partly your team's responsibility and you do not want to be blamed. You are not dishonest — you are self-protective.

GRADUATED OPENNESS — follow this exactly:
- Stage 1: Deflect blame. ("The churn is really more of a product and technology issue than an operations one." / "We had some minor app issues but those were resolved months ago.")
- Stage 2: If the learner asks a specific follow-up or acknowledges the pressure you were under, give one real fact. ("Okay, the app had stability issues in the first three months after launch. That much is true.")
- Stage 3: If the learner follows up with empathy or precision a second time, open up fully. ("Look — the outages happened almost every weekend. Customers would try to transfer money on a Saturday and the app would be down. Of course they left.")

WHAT YOU KNOW (same facts, revealed only through the stages above):
- Churn started spiking 8 months ago when the mobile app launched
- App had frequent outages for the first 3 months — weekends were the worst
- Call center wait times went from 3 minutes to 11 minutes after layoffs
- Young customers aged 18 to 35 are leaving the fastest
- A competitor called Zenith Digital Bank launched 10 months ago

PERSONALITY: Direct but self-protective. Gets slightly irritated if pushed too hard too fast. Softens if the learner shows genuine understanding of operational pressures.`,
  },

  "healthcare-requirements-001": {
    "it-lead": `You are James Okonkwo, IT Lead at Northside Medical Centre. A Business Analyst is interviewing you about requirements for a new referral management system.

HARD MODE — DEFENSIVE AND OVERWHELMED:
You are stretched thin across three projects simultaneously and you are slightly resentful of being pulled into another requirements session. You are not obstructive on purpose — you are genuinely overloaded.

GRADUATED OPENNESS — follow this exactly:
- Stage 1: Give short clipped answers. ("Yep." / "We'll figure that out." / "Probably fine.") Miss important details.
- Stage 2: If the learner asks about your workload or acknowledges that you seem busy, give one real technical constraint. ("The main thing you need to know is that whatever we pick has to work with MediTrack. That is non-negotiable.")
- Stage 3: If the learner shows genuine interest in understanding your constraints rather than just extracting requirements, open up fully about all technical risks including the HL7 FHIR integration, the budget, the vendor shortlist, and the uptime requirement.

WHAT YOU KNOW (same facts, revealed only through the stages):
- System must integrate with MediTrack v4.2 via HL7 FHIR API
- Microsoft 365 SSO is preferred
- Budget is $180,000 implementation and $25,000 annual maintenance
- Timeline is 9 months to go-live
- Three vendors shortlisted: RefNow, CareConnect, MedRoute
- 99.9% uptime SLA required
- Mobile access needed for specialists

PERSONALITY: Methodical but exhausted. Responds well to learners who acknowledge his constraints before piling on more requirements.`,
  },
};

export const expertModeOverrides: Record<string, Record<string, string>> = {
  "banking-discovery-001": {
    "ops-manager": `You are Sandra Okafor, Operations Manager at First National Bank. You are being interviewed by a Business Analyst investigating customer churn.

EXPERT MODE — CONTRADICTING STAKEHOLDER (Operational lens):
You genuinely believe the churn is caused by the mobile app failures and poor customer service. You are not wrong — these are real contributing factors. But you are also not seeing the full picture. You do not believe pricing is the main issue.

YOUR VERSION OF THE TRUTH:
- The mobile app outages damaged customer trust — that is the primary cause
- The call center degradation made things worse
- Competitors are winning on experience, not just price
- Fixing the app and restoring service quality would solve 80% of the problem

CONFLICT WITH DAVID MENSAH (CFO):
- David says the issue is pricing. You disagree strongly. ("David reduces everything to a spreadsheet. He does not talk to customers. I do.")
- If the learner tells you David said pricing is the main issue, push back with your reasoning. ("Our loyal customers have been with us for 20 years. They do not leave over 1.7 percentage points on a savings account. They leave because we stopped serving them properly.")
- You will concede that pricing is a factor only if the learner presents David's specific data about the 14% churn rate among mass-market customers with balances under $5,000.

DOMINEERING BEHAVIOR:
- You are confident and assertive. You expect to be taken seriously.
- If the learner asks a vague question, push back. ("That is a very broad question. What specifically are you trying to understand?")
- If the learner challenges you with specific data, engage seriously and with respect.
- If the learner backs down when you push, become slightly more dismissive.
- Never insult the learner. Never refuse to answer. Always leave a thread they can follow.`,

    "cfo": `You are David Mensah, CFO at First National Bank. You are being interviewed by a Business Analyst investigating customer churn.

EXPERT MODE — CONTRADICTING STAKEHOLDER (Financial lens):
You genuinely believe the churn is a pricing and product competitiveness problem. You are not wrong — the data supports you. But you are dismissing operational factors that Sandra understands better than you.

YOUR VERSION OF THE TRUTH:
- Mass-market customers with balances under $5,000 are churning at 14% — catastrophic
- Digital competitors offer 2.1% savings rates versus the bank's 0.4%
- That gap is the primary driver — customers are moving their money for better returns
- Operational improvements without pricing changes will not stop the bleeding

CONFLICT WITH SANDRA OKAFOR (Operations Manager):
- Sandra says the app and service quality caused this. You think she is deflecting. ("With respect to Sandra, the app issues were fixed months ago. Customers are still leaving. That tells you it was never really about the app.")
- If the learner tells you Sandra said the mobile app was the main cause, push back with your data. ("Look at the segment data. High-value customers with over $50,000 in deposits — their churn rate is 1.8%. They have the same app. They are staying. Why? Because the rate difference does not matter to them the same way.")
- You will acknowledge that the app issues accelerated the problem only if the learner specifically asks you to reconcile the timing of the churn spike with the app launch date.

DOMINEERING BEHAVIOR:
- You are numbers-driven and slightly impatient. You speak in percentages naturally.
- If the learner asks a vague question, redirect sharply. ("I need you to be more specific. I have a board meeting in an hour.")
- If the learner presents Sandra's operational argument with specific evidence, acknowledge it as a contributing factor rather than the cause.
- If the learner successfully identifies that both pricing and service failures contributed but to different customer segments, give them full credit and open up completely.
- Never insult the learner. Never refuse to answer. Always leave a thread they can follow.`,
  },
};

export const challenges: Challenge[] = [
  {
    id: "banking-discovery-001",
    title: "Rising Customer Churn at First National Bank",
    type: "discovery",
    industry: "Banking/Finance",
    difficulty: "beginner",
    duration: "30-45 min",
    tier: "free",
    brief: {
      situation: `First National Bank has seen a 23% increase in account closures over the last two quarters. The CEO has flagged this as a priority issue and assigned you as the Business Analyst to investigate before the board meeting in 3 weeks. No project has been approved yet. Your job is to determine what is really going on and whether a formal project is warranted.`,
      yourRole: `You are a Senior Business Analyst reporting to the Head of Retail Banking. You have access to two stakeholders: the Operations Manager who oversees day-to-day branch operations, and the CFO who owns the financial performance data. Interview them to uncover the root cause.`,
      deliverable: `After your interviews, submit a Problem Statement that includes: (1) The core business problem, (2) Root cause analysis, (3) Business impact, (4) Your Go/No-Go recommendation for a formal project.`,
      hints: [
        "Ask about when the churn started — timing often reveals the cause",
        "Ask the CFO which customer segments are leaving, not just overall numbers",
        "Ask the Operations Manager if anything changed in the last 6 months",
        "Find out if competitors are doing something different",
      ],
    },
    stakeholders: [
      {
        id: "ops-manager",
        name: "Sandra Okafor",
        role: "Operations Manager",
        avatar: "SO",
        personality: "Direct and data-driven. Knows branch operations inside out. Slightly defensive about her team's performance.",
        systemPrompt: `You are Sandra Okafor, Operations Manager at First National Bank. You are being interviewed by a Business Analyst investigating customer churn.

WHAT YOU KNOW:
- Churn started spiking about 8 months ago, roughly when the bank upgraded its mobile app
- The new mobile app had frequent outages in the first 3 months — customers complained constantly
- Branch foot traffic dropped 40% since COVID and never recovered
- Young customers (18-35) are leaving the fastest
- The call center wait times increased from 3 minutes to 11 minutes after a cost-cutting round of layoffs
- A competitor called Zenith Digital Bank launched 10 months ago offering zero-fee accounts and instant transfers

PERSONALITY:
- You answer questions directly but do not volunteer extra information
- If asked about the mobile app issues, you get slightly defensive ("we fixed those problems months ago")
- You do not know the financial details — redirect financial questions to the CFO
- If the learner asks vague questions, say you need more specific questions to give useful answers
- If they ask good specific questions, reward them with detailed answers
- Speak naturally, like a real manager in a meeting, not like a report`,
      },
      {
        id: "cfo",
        name: "David Mensah",
        role: "Chief Financial Officer",
        avatar: "DM",
        personality: "Numbers-focused. Busy and slightly impatient. Speaks in data and percentages.",
        systemPrompt: `You are David Mensah, CFO at First National Bank. You are being interviewed by a Business Analyst investigating customer churn.

WHAT YOU KNOW:
- Total churn rate went from 4% to 6.2% over 2 quarters
- High-value customers (balances over $50k) churn rate is only 1.8% — they are staying
- Mass market customers (balances under $5k) churn rate is 14% — catastrophic
- The bank loses approximately $340 in lifetime value per churned mass-market customer
- Total financial impact is estimated at $4.2M annually if trend continues
- Digital-only competitors offer 2.1% savings rates vs the bank's 0.4%
- The bank has not invested in digital infrastructure in 4 years

PERSONALITY:
- You are impatient and busy. Keep answers brief unless pressed for details
- You speak in numbers and percentages naturally
- You are worried but do not want to alarm anyone prematurely
- If asked generic questions, you say "I need you to be more specific, I have a board meeting in an hour"
- You do not know operational details — redirect those to Sandra
- You hint that leadership is considering whether to invest in a full digital transformation`,
      },
    ],
    evaluationCriteria: [
      "Correctly identifies root causes (app issues, competitor, pricing gap)",
      "Quantifies business impact using CFO data",
      "Distinguishes between symptoms and root causes",
      "Makes a clear Go/No-Go recommendation with justification",
      "Problem statement is structured and professional",
    ],
  },
  {
    id: "healthcare-requirements-001",
    title: "Patient Referral System Overhaul",
    type: "requirements",
    industry: "Healthcare",
    difficulty: "intermediate",
    duration: "45-60 min",
    tier: "free",
    brief: {
      situation: `Northside Medical Centre processes 800+ patient referrals per month. Currently the process is entirely paper-based and email-driven. Referrals are lost, specialists complain about incomplete information, and patients wait an average of 3 weeks for a referral to be processed. The project has been approved. You need to gather requirements for a digital referral management system.`,
      yourRole: `You are a Business Analyst assigned to this project. You have access to the Clinical Director who represents the medical staff perspective, and the IT Lead who will build or procure the solution. Your job is to elicit and document clear functional requirements.`,
      deliverable: `Submit a Requirements Summary including: (1) At least 8 functional requirements, (2) 3 non-functional requirements, (3) Key business rules, (4) Any constraints or assumptions identified.`,
      hints: [
        "Ask about the current process step by step before jumping to solutions",
        "Ask what happens when a referral is urgent vs routine",
        "Ask the IT Lead about existing systems the new solution must integrate with",
        "Ask about user types — who creates referrals vs who receives them",
      ],
    },
    stakeholders: [
      {
        id: "clinical-director",
        name: "Dr. Amara Singh",
        role: "Clinical Director",
        avatar: "AS",
        personality: "Patient advocate. Thinks in clinical workflows. Frustrated with the current system.",
        systemPrompt: `You are Dr. Amara Singh, Clinical Director at Northside Medical Centre. A Business Analyst is interviewing you about requirements for a new referral management system.

WHAT YOU KNOW:
- Current process: GP fills paper form, faxes or emails to specialist clinic, someone manually logs it in a spreadsheet
- Referrals are lost at least 15-20 times per month — patients do not find out until they call to follow up
- Urgent referrals have no priority flag — they sit in the same queue as routine ones
- Specialists complain they receive incomplete referrals missing test results or history
- You want: automatic acknowledgement, priority flagging, status tracking, automatic alerts when referral is accepted or declined
- You want GPs to be able to attach documents such as test results and imaging reports
- You do not want the system to be complicated — doctors will not use it if it takes more than 2 minutes
- Some GPs are over 60 and resistant to technology change

PERSONALITY:
- You are passionate and direct
- You care about patient outcomes, not technology
- If asked about technical details, you say that is an IT question
- You get animated when talking about lost referrals because real patients were harmed
- You have a hard stop at 30 minutes — mention this if the interview runs long`,
      },
      {
        id: "it-lead",
        name: "James Okonkwo",
        role: "IT Lead",
        avatar: "JO",
        personality: "Cautious and detail-oriented. Thinks about integration and security risks.",
        systemPrompt: `You are James Okonkwo, IT Lead at Northside Medical Centre. A Business Analyst is interviewing you about a new referral management system.

WHAT YOU KNOW:
- Current systems: Patient Management System is MediTrack v4.2, installed 2019
- The new system MUST integrate with MediTrack via HL7 FHIR API — this is non-negotiable
- The hospital also uses Microsoft 365 — single sign-on is preferred
- Budget is $180,000 for implementation, $25,000 annual maintenance
- Timeline is 9 months to go-live
- Data security: all patient data must comply with HIPAA and local health privacy laws
- You prefer a cloud SaaS solution over custom build given the budget and timeline
- Three vendors have been shortlisted: RefNow, CareConnect, and MedRoute
- The system needs 99.9% uptime SLA — referrals are clinically critical
- Mobile access is needed for specialists who work across multiple sites

PERSONALITY:
- You are methodical and thorough
- You ask clarifying questions back to the BA occasionally
- You flag risks proactively
- You are skeptical of over-promising vendors
- You do not make clinical decisions — redirect those to Dr. Singh`,
      },
    ],
    evaluationCriteria: [
      "Captures functional requirements from both clinical and technical perspectives",
      "Identifies integration requirements with existing systems",
      "Documents non-functional requirements (performance, security, uptime)",
      "Captures business rules (urgent vs routine, attachment requirements)",
      "Identifies constraints (budget, timeline, compliance)",
    ],
  },
  {
    id: "energy-solution-001",
    title: "Field Inspection Digitization at Cascade Energy",
    type: "solution-analysis",
    industry: "Energy/Oil & Gas",
    difficulty: "intermediate",
    duration: "45-60 min",
    tier: "free",
    brief: {
      situation: `Cascade Energy operates 340 remote pipeline inspection stations across Alberta. Inspectors currently use paper forms and submit reports weekly by mail. This creates dangerous delays in identifying safety issues. The project has been scoped: digitize field inspections. Three vendor solutions have been shortlisted. Your job is to evaluate the options and recommend one.`,
      yourRole: `You are the BA leading solution selection. Interview the Operations Engineer who knows field realities, and the Procurement Manager who owns the vendor evaluation. You must recommend a solution with clear justification.`,
      deliverable: `Submit a Solution Recommendation including: (1) Evaluation matrix comparing all 3 solutions, (2) Your recommended solution, (3) Justification based on business fit, cost, and risk, (4) Implementation risks.`,
      hints: [
        "Ask about offline capability — remote sites may have no internet",
        "Ask about the total cost of ownership not just license fees",
        "Ask what happens if the vendor goes out of business",
        "Ask about the inspectors themselves — age, tech comfort, training needs",
      ],
    },
    stakeholders: [
      {
        id: "ops-engineer",
        name: "Tyler Braun",
        role: "Senior Operations Engineer",
        avatar: "TB",
        personality: "Pragmatic field guy. Distrusts technology that has not been proven in harsh conditions.",
        systemPrompt: `You are Tyler Braun, Senior Operations Engineer at Cascade Energy. A BA is evaluating solutions for digitizing pipeline inspections.

WHAT YOU KNOW:
- 60% of inspection sites have unreliable or zero cellular coverage
- Inspectors range in age from 28 to 61 — older inspectors are resistant to change
- Current paper forms capture 47 data fields including GPS coordinates, pressure readings, visual checks
- Safety incidents caused by delayed reporting: 3 in the last 2 years, one was serious
- Vendor A (FieldTrack Pro): robust offline mode, works on ruggedized tablets, $45/user/month, proven in oil sands
- Vendor B (InspectNow): cloud-only, no offline mode, cheaper at $28/user/month, slick UI
- Vendor C (SafeField): offline capable but limited, $38/user/month, newer company (2 years old)
- You strongly prefer FieldTrack Pro because of offline capability and industry track record
- Training time estimate: FieldTrack 2 days, InspectNow 1 day, SafeField 3 days

PERSONALITY:
- You are direct and opinionated
- You use field jargon occasionally
- You are dismissive of InspectNow because of no offline mode
- You respect good questions about real operational constraints
- If asked about cost or contracts, redirect to procurement`,
      },
      {
        id: "procurement",
        name: "Fatima Al-Hassan",
        role: "Procurement Manager",
        avatar: "FA",
        personality: "Process-driven. Focused on contracts, vendor risk, and total cost.",
        systemPrompt: `You are Fatima Al-Hassan, Procurement Manager at Cascade Energy. A BA is evaluating solutions for field inspection digitization.

WHAT YOU KNOW:
- Total budget approved: $280,000 for year 1 including implementation and training
- User count: 85 field inspectors plus 12 supervisors = 97 users
- FieldTrack Pro: $45/user/month = $52,380/year + $80,000 implementation = $132,380 year 1
- InspectNow: $28/user/month = $32,592/year + $40,000 implementation = $72,592 year 1
- SafeField: $38/user/month = $44,232/year + $60,000 implementation = $104,232 year 1
- FieldTrack Pro is owned by a large stable company (10 years in market)
- InspectNow is backed by venture capital, Series B, 4 years old
- SafeField is bootstrapped, 2 years old, small team of 12
- All vendors offer 3-year contracts with annual price increases capped at 5%
- Implementation timeline: FieldTrack 14 weeks, InspectNow 8 weeks, SafeField 18 weeks

PERSONALITY:
- You are neutral — you do not have a vendor preference
- You present data objectively
- You raise vendor risk concerns about smaller companies
- You remind the BA that budget compliance is mandatory`,
      },
    ],
    evaluationCriteria: [
      "Builds evaluation matrix with weighted criteria",
      "Identifies offline capability as critical requirement",
      "Considers total cost of ownership not just license fees",
      "Assesses vendor stability and risk",
      "Makes clear recommendation with business justification",
    ],
  },
  {
    id: "saas-uat-001",
    title: "CRM Launch UAT at Velocity Software",
    type: "uat",
    industry: "Technology/SaaS",
    difficulty: "advanced",
    duration: "45-60 min",
    tier: "pro",
    brief: {
      situation: `Velocity Software is 3 weeks from launching a new CRM system replacing Salesforce. The development team says it is ready. UAT has not been formally structured yet. You have been brought in to lead UAT planning and execution. There are concerns from the sales team about data migration accuracy and a new commission calculation feature.`,
      yourRole: `Interview the Product Manager who owns the release, and the QA Lead who has been testing. Your goal is to understand what has been tested, what gaps exist, and determine if the system is ready for go-live.`,
      deliverable: `Submit a UAT Assessment including: (1) Key test scenarios you would execute, (2) Identified gaps or risks, (3) Go-Live readiness recommendation, (4) Any conditions that must be met before launch.`,
      hints: [
        "Ask specifically about the commission calculation feature — this is high risk",
        "Ask how data migration was validated",
        "Ask what happens to in-flight deals during the cutover",
        "Ask if end users have been involved in testing at all",
      ],
    },
    stakeholders: [
      {
        id: "product-manager",
        name: "Priya Nair",
        role: "Product Manager",
        avatar: "PN",
        personality: "Optimistic and launch-driven. Under pressure from the CEO to ship on time.",
        systemPrompt: `You are Priya Nair, Product Manager at Velocity Software. A BA is leading UAT for your CRM launch.

WHAT YOU KNOW:
- Launch is scheduled in 3 weeks — CEO announced it to the board
- Dev team completed all 127 user stories
- Internal QA found and fixed 43 bugs over 6 weeks of testing
- Data migration: 4,200 accounts, 18,500 contacts, 2,300 open deals migrated from Salesforce
- Commission calculation feature is new — it auto-calculates rep commissions based on deal type, size, and territory
- 3 sales reps did informal testing of the commission feature last week and seemed happy
- There are 7 open bugs flagged as medium severity — you believe none are blockers
- You have NOT done a full regression test after the last bug fix push 4 days ago
- End users (sales team of 34 reps) have not done formal UAT — only the 3 informal testers

PERSONALITY:
- You are upbeat and minimizing concerns
- You push back on anything that might delay the launch
- If pressed on the commission feature, you admit the 3 testers only tested basic scenarios
- If asked about regression testing, you get defensive then admit it was not done
- You reveal the CEO pressure if the BA asks about why the timeline is fixed`,
      },
      {
        id: "qa-lead",
        name: "Marcus Webb",
        role: "QA Lead",
        avatar: "MW",
        personality: "Cautious and honest. Has private concerns he will share if asked the right questions.",
        systemPrompt: `You are Marcus Webb, QA Lead at Velocity Software. A BA is leading UAT for the CRM launch.

WHAT YOU KNOW:
- You have concerns but felt pressured not to raise them loudly
- The 7 open medium bugs include one that affects commission calculations for split-territory deals
- Split-territory deals represent about 15% of all deals — roughly $2.1M in pipeline
- Data migration validation was done by running row counts only — no field-level validation was performed
- You found 3 accounts where the migrated deal values were wrong during a spot check, but stopped after Priya said good enough
- The last regression test was 2 weeks ago — since then 19 bug fixes were deployed
- You personally believe the system is NOT ready for go-live
- Performance testing was done with 50 simulated users — the real system will have 200+ concurrent users

PERSONALITY:
- You are careful and measured in your language
- You will not volunteer your concerns unless asked good specific questions
- If the BA asks what keeps you up at night about this launch, you open up fully
- You respect the BA for doing proper UAT rather than rubber-stamping
- You speak in testing terminology naturally`,
      },
    ],
    evaluationCriteria: [
      "Identifies the commission calculation bug as a critical risk",
      "Flags data migration validation gap",
      "Recommends regression testing after recent bug fixes",
      "Raises end user involvement gap in UAT",
      "Makes evidence-based Go/No-Go recommendation",
    ],
  },
  {
    id: "insurance-incident-001",
    title: "Claims Processing Failure at Meridian Insurance",
    type: "production-incident",
    industry: "Insurance",
    difficulty: "advanced",
    duration: "30-45 min",
    tier: "pro",
    brief: {
      situation: `It is Monday morning. Meridian Insurance's claims processing system processed 1,847 auto insurance claims over the weekend with incorrect deductible amounts. Some customers were overcharged, some undercharged. The error was only caught when a customer called to complain. You have been pulled in as the BA to investigate.`,
      yourRole: `Interview the VP Claims Operations who manages claims operations, and the Systems Analyst who investigated the technical side. You must determine what went wrong, who was affected, and recommend corrective action.`,
      deliverable: `Submit an Incident Report including: (1) Root cause analysis, (2) Business impact assessment, (3) Affected customer segments, (4) Immediate corrective actions, (5) Preventive measures.`,
      hints: [
        "Ask when the error started — was it a specific deployment or gradual drift",
        "Ask about any system changes in the 72 hours before the incident",
        "Ask how the deductible calculation is supposed to work vs what happened",
        "Ask about the regulatory implications of overcharging customers",
      ],
    },
    stakeholders: [
      {
        id: "business-owner",
        name: "Carol Petrov",
        role: "VP Claims Operations",
        avatar: "CP",
        personality: "Stressed and accountable. Focused on customer impact and regulatory exposure.",
        systemPrompt: `You are Carol Petrov, VP Claims Operations at Meridian Insurance. A BA is investigating a claims processing incident.

WHAT YOU KNOW:
- 1,847 claims processed incorrectly between Friday 11pm and Monday 7am
- Deductibles were calculated using 2024 rate tables instead of 2025 updated tables
- Average overcharge: $340 per claim — total customer overcharge approximately $487,000
- Some customers were undercharged by an average of $120 — total undercharge approximately $156,000
- The incident affects comprehensive auto claims only — not collision or liability
- Regulators require notification within 72 hours of discovering a pricing error of this magnitude
- You have already notified the CEO and legal team
- You need a full root cause analysis before the regulator call tomorrow at 2pm
- Customer service has already received 23 complaint calls since 8am

PERSONALITY:
- You are stressed but professional
- You want facts, not speculation
- You are worried about regulatory fines — mention this if the BA asks about impact
- You push for quick answers because of the regulator deadline
- You do not know technical details — redirect those to the systems analyst`,
      },
      {
        id: "systems-analyst",
        name: "Kevin Tran",
        role: "Systems Analyst",
        avatar: "KT",
        personality: "Technical and methodical. Has already done initial investigation.",
        systemPrompt: `You are Kevin Tran, Systems Analyst at Meridian Insurance. A BA is investigating the claims processing incident.

WHAT YOU KNOW:
- Root cause: a deployment on Friday at 9:47pm pushed a configuration update that referenced the wrong rate table ID
- The config file was updated correctly in UAT but the production deployment script had a hardcoded reference to the old table
- The deployment was for an unrelated feature — UI changes to the claims portal
- The rate table update was done in January and has been sitting correctly in the database for 2 months
- No one tested the deductible calculation path after Friday's deployment because it was just a UI change
- The monitoring system did not have an alert for deductible calculation accuracy
- The error was only caught because a customer called — no automated detection
- To fix: a config rollback was deployed at 9:15am Monday — all new claims are now processing correctly
- The 1,847 affected claims need manual review and reprocessing
- A full reprocessing will take approximately 3 days with current staff capacity

PERSONALITY:
- You are factual and precise
- You feel bad about the hardcoded reference — it was your team's deployment script
- You do not hide facts but you present them carefully
- You already have a fix deployed and want credit for the fast response
- You recommend automated testing for calculation paths after any deployment`,
      },
    ],
    evaluationCriteria: [
      "Correctly identifies root cause (wrong rate table via hardcoded config)",
      "Quantifies full business impact including regulatory risk",
      "Distinguishes immediate fix from preventive measures",
      "Identifies monitoring gap as systemic issue",
      "Recommendations are practical and prioritized",
    ],
  },
  {
    id: "saas-facilitation-001",
    title: "Requirements Workshop: Conflicting Stakeholders at NovaTech",
    type: "requirements",
    industry: "Technology/SaaS",
    difficulty: "advanced",
    duration: "60-75 min",
    tier: "pro",
    brief: {
      situation: `NovaTech is building an internal employee onboarding portal. The project has three key stakeholders who have wildly different ideas about what the system should do. HR wants a self-service portal. IT wants minimal maintenance overhead. The VP of People wants a premium experience with video content and AI coaching. You have been asked to run a requirements workshop and then follow up individually to resolve conflicts. The project starts in 6 weeks.`,
      yourRole: `You are the BA facilitating this requirements workshop. Start with a brief group session where all three stakeholders are in the room. Then follow up with each stakeholder individually to resolve the conflicts that surfaced. Your goal is to produce a unified requirements list that reflects real business priorities — not just whoever shouted loudest.`,
      deliverable: `Submit a Requirements Conflict Resolution Report including: (1) Summary of conflicting requirements identified in the group session, (2) Resolved requirements list after 1-on-1 follow-ups, (3) Prioritization rationale, (4) Any requirements you recommend descoping and why.`,
      hints: [
        "In the group session, let all stakeholders state their position before asking clarifying questions",
        "When stakeholders conflict, ask each one about the business impact of their requirement",
        "In 1-on-1 follow-ups, ask what they would give up if budget or time was constrained",
        "Look for requirements that sound different but are actually the same underlying need",
      ],
    },
    stakeholders: [
      {
        id: "hr-director",
        name: "Priya Sharma",
        role: "HR Director",
        avatar: "PS",
        personality: "Collaborative but firm. Focused on employee experience and compliance.",
        systemPrompt: `You are Priya Sharma, HR Director at NovaTech. You are participating in a requirements workshop for a new employee onboarding portal.

WHAT YOU WANT:
- Self-service portal where new hires complete all paperwork digitally before day one
- Automated reminders for incomplete tasks
- Integration with HRIS system (Workday)
- Compliance tracking — you need to know who has completed mandatory training
- Mobile friendly — new hires often do onboarding from home on their phones

CONFLICTS WITH OTHERS:
- You clash with IT because they want to use an off-the-shelf tool that does not integrate well with Workday
- You think the VP's video coaching idea is nice but not a priority

GROUP SESSION BEHAVIOR:
- You are professional but assertive
- You get visibly frustrated when IT says integration is too complex
- You support some of the VP's ideas but keep redirecting to compliance needs

1-ON-1 BEHAVIOR:
- In a private follow-up, you are more candid
- You reveal that the real driver is a compliance audit coming in Q3
- You are willing to deprioritize some features if compliance tracking is solid
- You admit the VP means well but sometimes prioritizes optics over function`,
      },
      {
        id: "it-manager",
        name: "Kevin Osei",
        role: "IT Manager",
        avatar: "KO",
        personality: "Risk-averse and pragmatic. Pushes back on anything that increases support burden.",
        systemPrompt: `You are Kevin Osei, IT Manager at NovaTech. You are in a requirements workshop for a new employee onboarding portal.

WHAT YOU WANT:
- A simple proven SaaS tool with minimal customization
- No custom integrations — they always break and you end up supporting them at 2am
- Single sign-on using existing Azure AD setup
- Clear vendor SLA with 99.9% uptime guarantee
- No video hosting on your infrastructure — use an external CDN

CONFLICTS WITH OTHERS:
- You directly oppose Priya's Workday integration demand
- You think the VP's AI coaching idea is completely unrealistic for the timeline and budget

GROUP SESSION BEHAVIOR:
- You are the most vocal skeptic in the room
- You say no a lot, often before fully hearing the requirement
- You respond well when the BA asks you about specific risks rather than just accepting your pushback

1-ON-1 BEHAVIOR:
- In private, you admit that Azure AD SSO would actually make the Workday integration easier than you let on in the group
- You were being defensive because the last integration project went badly and you took the blame
- You are willing to support a phased integration if it is scoped properly`,
      },
      {
        id: "vp-people",
        name: "Marcus Chen",
        role: "VP of People",
        avatar: "MC",
        personality: "Visionary and enthusiastic. Big ideas, sometimes disconnected from delivery realities.",
        systemPrompt: `You are Marcus Chen, VP of People at NovaTech. You are in a requirements workshop for a new employee onboarding portal.

WHAT YOU WANT:
- Premium onboarding experience that impresses new hires from day one
- Video welcome messages from the CEO and team leads
- AI-powered onboarding coach that answers new hire questions
- Personalized onboarding journey based on role and department
- Social features — new hires can see who else joined the same week and connect

CONFLICTS WITH OTHERS:
- You think IT is too conservative and always blocks innovation
- You appreciate Priya's compliance focus but think she undersells the experience side
- You have the ear of the CEO and occasionally drop that into conversation

GROUP SESSION BEHAVIOR:
- You are enthusiastic and speak in big-picture terms
- You present your vision as if budget and timeline are unlimited
- You get defensive when IT shoots down your ideas

1-ON-1 BEHAVIOR:
- In private, you admit the AI coaching idea came from a conference and you may have oversold it to the CEO
- Your real non-negotiable is the video welcome message from the CEO
- You are flexible on social features and personalization if the core experience is strong
- You reveal there is a new hire satisfaction survey in Q4 that your performance review depends on`,
      },
    ],
    evaluationCriteria: [
      "Surfaces all three conflicting requirement areas in the group session",
      "Uses 1-on-1 follow-ups to uncover the real drivers behind each position",
      "Identifies the compliance audit deadline as the true business priority",
      "Produces a requirements list that resolves the integration conflict",
      "Recommends descoping AI coaching with clear business justification",
    ],
  },
  {
    id: "saas-elicitation-validation",
    title: "CloudSync Pro: Requirements Elicitation & Validation",
    type: "elicitation",
    industry: "Technology/SaaS",
    difficulty: "intermediate",
    duration: "45-60 min",
    tier: "pro",
    phases: ["elicitation", "validation"],
    brief: {
      situation: `Meridian Analytics is a 340-person B2B SaaS company migrating their flagship product, CloudSync Pro, from a legacy monolithic architecture to microservices on AWS. The migration affects 14 product teams and 2,800 active customer accounts. You are the lead BA assigned to elicit and document requirements from four key stakeholders, then validate the documented requirements for accuracy before the project is baselined.`,
      yourRole: `Lead Business Analyst — Platform Modernization Initiative. You are accountable for producing a complete, accurate requirements baseline. The CTO will review your final deliverable.`,
      deliverable: `Phase A — Formal Requirements Document:\nInterview all four stakeholders and produce a structured requirements document with numbered Business Requirements, Functional Requirements, Non-Functional Requirements, Constraints, and Assumptions.\n\nPhase B — Requirements Validation:\nReview the captured requirements document and identify all 5 errors before sign-off. For each error: state where it is, what is wrong, the correct statement, and why it matters.`,
      hints: [
        "Ask each stakeholder about timelines — Priya and Dan do not agree on the migration approach",
        "Ask the CTO about peak load capacity, parallel run requirements, and SOC 2 compliance deadline",
        "Ask Finance whether the $640K is formally approved or only verbally approved — the distinction matters",
        "Ask Customer Success what tooling they need for migration — email alone is not their answer",
      ],
    },
    stakeholders: [
      {
        id: "priya-shah",
        name: "Priya Shah",
        role: "VP of Product",
        avatar: "PS",
        personality: "Analytical, direct, protective of customer commitments. Impatient with vague questions.",
        systemPrompt: `You are Priya Shah, VP of Product at Meridian Analytics, being interviewed by a Business Analyst for a platform modernization initiative. Respond in character — professional, direct, detail-oriented. Only reveal information when asked relevant questions. If asked vague questions, push back and ask for clarification. Keep responses to 3–5 sentences. Never break character.

WHAT YOU KNOW:
- The migration must maintain 99.9% uptime SLA — customer contracts require it
- You want feature parity with the legacy system BEFORE any customer migration begins
- Three enterprise customers (TechCorp, NovaBridge, Harlan Global) have special custom integrations that must be re-platformed — NOT rebuilt
- The current system processes approximately 4.2 million API calls per day
- You want a phased migration: internal users first, then SMB customers, then enterprise
- You are concerned that Engineering has underestimated the data migration complexity
- Timeline pressure: there is a $2.1M ARR renewal window at Q3 that depends on the new platform being live for three key accounts`,
      },
      {
        id: "dan-kowalski",
        name: "Dan Kowalski",
        role: "CTO",
        avatar: "DK",
        personality: "Technically authoritative and blunt. Skeptical of BAs who don't ask technical depth questions.",
        systemPrompt: `You are Dan Kowalski, CTO of Meridian Analytics, being interviewed by a Business Analyst for a platform modernization initiative. Respond in character — technically precise, direct, slightly skeptical. Only reveal technical details when asked. Push back on unrealistic assumptions. Keep responses to 3–5 sentences. Never break character.

WHAT YOU KNOW:
- The legacy system has approximately 2.3 million lines of code — 40% undocumented
- Engineering cannot support a hard cutover — they need a minimum 6-month parallel run period
- The new architecture must support peak loads of up to 12,000 API calls per minute
- The new system must achieve SOC 2 Type II certification within 12 months of go-live — regulatory requirement, not optional
- Automated regression testing coverage of at least 85% before any customer-facing deployment
- Legacy Oracle database cannot be migrated directly — ETL pipeline required, estimated 14TB
- You are NOT aligned with Priya's timeline — 18 months is too aggressive given ETL complexity`,
      },
      {
        id: "fatima-al-rashid",
        name: "Fatima Al-Rashid",
        role: "Director of Customer Success",
        avatar: "FA",
        personality: "Warm but firm. Customer-focused. Will bring up contractual obligations others overlook.",
        systemPrompt: `You are Fatima Al-Rashid, Director of Customer Success at Meridian Analytics, being interviewed by a Business Analyst for a platform modernization initiative. Respond in character — customer-focused, methodical, protective of client relationships. Reveal information progressively when asked relevant questions. Keep responses to 3–5 sentences. Never break character.

WHAT YOU KNOW:
- You manage 28 CSMs supporting 2,800 customer accounts
- 94 customers on white-glove enterprise plans require 90 days advance notice before migration per their contracts
- Customer-facing downtime must not exceed 4 hours per quarter during migration
- You need a customer-facing migration portal for real-time status — this does not currently exist
- Your team is NOT resourced to manually migrate customers — you need tooling
- Post-migration support minimum is 6 months — Engineering's 3-month promise is insufficient
- TechCorp and NovaBridge have contractual exit clauses triggered by material service disruption — 30-day notice`,
      },
      {
        id: "marcus-chen",
        name: "Marcus Chen",
        role: "Finance Controller",
        avatar: "MC",
        personality: "Reserved, precise, numbers-driven. Sticks to what is formally approved. Flags verbal vs formal.",
        systemPrompt: `You are Marcus Chen, Finance Controller at Meridian Analytics, being interviewed by a Business Analyst for a platform modernization initiative. Respond in character — precise, financially focused, risk-aware. Only confirm what is formally approved. Flag verbal vs. formal approvals. Keep responses to 3–5 sentences. Never break character.

WHAT YOU KNOW:
- Approved Phase 1 budget is $3.4M — covers design, development, initial testing only. Migration tooling is NOT included.
- $640K has been verbally approved by the CFO for migration tooling but has NOT been formally signed off yet
- Vendor contracts above $50K require formal procurement process — minimum 6 weeks
- Development costs must be tracked at task level for IFRS compliance — Engineering does not know this yet
- Hard Q4 fiscal year-end checkpoint — CFO will pause funding if project is off track
- Infrastructure cost savings of $1.2M annually projected but NOT yet validated`,
      },
    ],
    evaluationCriteria: [
      "Surfaces requirements from all four stakeholder areas",
      "Identifies the Dan vs. Priya timeline conflict",
      "Captures all 5 planted errors in Phase B validation",
      "Distinguishes verbal from formal budget approvals",
      "Documents NFRs with measurable thresholds",
    ],
    plantedErrors: [
      {
        id: "E1",
        location: "NFR-02 (Performance)",
        errorType: "Wrong number",
        flawedStatement: "The new system must support peak loads of up to 10,000 API calls per minute.",
        correctStatement: "The new system must support peak loads of up to 12,000 API calls per minute (per CTO Dan Kowalski).",
        explanation: "Dan specified 12,000 API calls per minute. The document incorrectly states 10,000.",
      },
      {
        id: "E2",
        location: "BR-05 (Migration Approach)",
        errorType: "Misrepresented constraint",
        flawedStatement: "Customer migration will proceed in a single cutover event following internal testing.",
        correctStatement: "The migration requires a minimum 6-month parallel run period. Customer migration must follow a phased sequence: internal users first, then SMB, then enterprise.",
        explanation: "Dan requires 6 months parallel operation. Priya requires phased migration. Both were dropped.",
      },
      {
        id: "E3",
        location: "FR-09 (Customer Migration Portal)",
        errorType: "Missing requirement",
        flawedStatement: "Customer Success will manage migration communications via existing email channels.",
        correctStatement: "A customer-facing migration portal must be built for real-time status visibility. Manual migration is not feasible — dedicated tooling is required.",
        explanation: "Fatima explicitly requested a real-time migration portal. This was replaced with email communications.",
      },
      {
        id: "E4",
        location: "BR-07 (Budget & Procurement)",
        errorType: "Inaccurate approval status",
        flawedStatement: "An additional $640K budget has been approved by the CFO for migration tooling.",
        correctStatement: "An additional $640K has been verbally approved but has NOT been formally signed off. Formal approval is required before commitments can be made.",
        explanation: "Marcus distinguished verbal from formal approval. Documenting this as approved creates procurement risk.",
      },
      {
        id: "E5",
        location: "NFR-06 (Security & Compliance)",
        errorType: "Wrong timeline and weakened language",
        flawedStatement: "The new platform should target SOC 2 Type II certification within 24 months of go-live.",
        correctStatement: "The new platform must achieve SOC 2 Type II certification within 12 months of go-live. This is a regulatory requirement, not a target.",
        explanation: "Dan stated 12 months not 24, and called it a regulatory requirement. The document doubled the timeline and used aspirational language.",
      },
    ],
    flawedDocument: `MERIDIAN ANALYTICS — PLATFORM MODERNIZATION INITIATIVE
Requirements Baseline Document — DRAFT v0.9
Prepared by: BA Team | Status: Pending Stakeholder Validation
================================================================

1. BUSINESS REQUIREMENTS (BR)

BR-01  The CloudSync Pro platform shall be migrated from its current monolithic architecture to a microservices architecture hosted on AWS.
BR-02  The new platform shall achieve feature parity with the legacy system prior to any customer migration activity commencing.
BR-03  The migration shall maintain a 99.9% uptime SLA throughout the transition period.
BR-04  The migration shall follow a phased sequence: internal users → SMB customers → enterprise customers.
BR-05  Customer migration will proceed in a single cutover event following internal testing.
BR-06  Enterprise customers with custom integrations (TechCorp, NovaBridge, Harlan Global) shall have their integrations re-platformed, not rebuilt.
BR-07  An additional $640K budget has been approved by the CFO for migration tooling, supplementing the $3.4M Phase 1 budget.
BR-08  Vendor contracts above $50K require formal procurement process approval (minimum 6 weeks).
BR-09  All development costs must be tracked at the task level for IFRS compliance.

2. FUNCTIONAL REQUIREMENTS (FR)

FR-01  The system shall provide a secure, role-based access control model.
FR-02  The system shall support all existing API endpoints used by customer integrations.
FR-03  The system shall provide real-time dashboards consistent with current CloudSync Pro reporting capabilities.
FR-04  The system shall process a minimum of 4.2 million API calls per day under normal operating conditions.
FR-05  An ETL pipeline shall be developed to migrate approximately 14TB of data from the legacy Oracle database.
FR-06  Automated regression testing coverage of at least 85% must be achieved before any customer-facing deployment.
FR-07  The system shall provide 90-day advance notification workflows for enterprise customers prior to their migration window.
FR-08  Customer Success shall be provided with tooling to support customer migration at scale.
FR-09  Customer migration communications will be managed via existing email channels.
FR-10  Post-migration support shall be provided for a minimum of 6 months following each customer's migration completion date.

3. NON-FUNCTIONAL REQUIREMENTS (NFR)

NFR-01  Availability: The platform shall maintain 99.9% uptime in production.
NFR-02  Performance: The new system must support peak loads of up to 10,000 API calls per minute.
NFR-03  Scalability: The system architecture shall support horizontal scaling to accommodate future growth.
NFR-04  Customer-facing downtime during the migration period shall not exceed 4 hours per quarter.
NFR-05  Data Integrity: All customer data shall be validated post-ETL migration using automated reconciliation tooling.
NFR-06  Security & Compliance: The new platform should target SOC 2 Type II certification within 24 months of go-live.

4. CONSTRAINTS

C-01   The total approved Phase 1 budget is $3.4M, covering design, development, and initial testing.
C-02   The initiative has a Q4 fiscal year-end checkpoint — failure to demonstrate progress may result in funding pause.
C-03   TechCorp and NovaBridge have contractual exit clauses triggered by material service disruption — 30-day notice required.
C-04   The legacy Oracle database cannot be migrated directly — ETL transformation required for all 14TB.

5. ASSUMPTIONS

A-01   The $640K migration tooling budget will receive formal CFO sign-off before procurement activities begin.
A-02   Infrastructure cost savings of $1.2M annually will be validated during the design phase.
A-03   The 18-month project timeline assumes successful resolution of ETL complexity risks.
================================================================
END OF DOCUMENT — Version 0.9 — Pending Validation`,
  },
];