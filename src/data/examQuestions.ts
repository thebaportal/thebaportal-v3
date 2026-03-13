export type BABOKArea = "planning" | "elicitation" | "lifecycle" | "strategy" | "analysis" | "evaluation";
export type Difficulty = "ecba" | "ccba" | "cbap";

export interface ExamQuestion {
  id: string;
  area: BABOKArea;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  babokRef: string;
  technique: string;
}

export const AREA_LABELS: Record<BABOKArea, string> = {
  planning: "Business Analysis Planning and Monitoring",
  elicitation: "Elicitation and Collaboration",
  lifecycle: "Requirements Life Cycle Management",
  strategy: "Strategy Analysis",
  analysis: "Requirements Analysis and Design Definition",
  evaluation: "Solution Evaluation",
};

export const AREA_SHORT: Record<BABOKArea, string> = {
  planning: "Planning",
  elicitation: "Elicitation",
  lifecycle: "Lifecycle Mgmt",
  strategy: "Strategy",
  analysis: "Analysis & Design",
  evaluation: "Solution Eval",
};

export const QUESTIONS: ExamQuestion[] = [

  // ── PLANNING AND MONITORING ──────────────────────────────────────────────────

  { id: "p-1", area: "planning", difficulty: "ecba",
    question: "What is the primary purpose of a BA plan?",
    options: ["To give the project manager a status reporting format", "To define how BA activities will be performed, monitored, and what they will produce", "To document the agreed requirements before development begins", "To create a timeline for the engineering team"],
    correctIndex: 1, babokRef: "BABOK v3 Section 3.1", technique: "Business analysis planning",
    explanation: "A BA plan is not a project plan. It explains how analysis will happen on this specific initiative — methods, deliverables, stakeholder engagement, and risks. Its value lies in the conversations it creates when stakeholders read it." },

  { id: "p-2", area: "planning", difficulty: "ecba",
    question: "Which factor MOST influences the choice between a predictive and an adaptive BA approach?",
    options: ["The budget allocated to the BA", "The seniority of the project sponsor", "The level of uncertainty and rate of change in requirements", "The size of the development team"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.1", technique: "Adaptive and predictive approaches",
    explanation: "High uncertainty and frequent change favour adaptive approaches where requirements emerge iteratively. Stable, well-understood requirements favour predictive approaches with upfront definition. This is the single most important contextual factor." },

  { id: "p-3", area: "planning", difficulty: "ecba",
    question: "A stakeholder engagement approach must primarily address which of the following?",
    options: ["The org chart showing all project team members", "How each stakeholder will be involved, what they need from the BA, and how their input will be captured", "A list of stakeholder names and job titles", "The meeting schedule for the project"],
    correctIndex: 1, babokRef: "BABOK v3 Section 3.2", technique: "Stakeholder engagement",
    explanation: "Listing names is not engagement planning. The engagement approach must address involvement level, communication preferences, and the mechanism for capturing each stakeholder's input. Without this, key knowledge goes uncollected." },

  { id: "p-4", area: "planning", difficulty: "ccba",
    question: "During BA planning, a BA discovers two key stakeholders have opposing views on project scope. What should she do FIRST?",
    options: ["Escalate immediately to the project sponsor", "Proceed with the more senior stakeholder's view to maintain momentum", "Document the conflict as a risk and plan facilitation activities to resolve it", "Remove the conflicting stakeholder from the engagement list"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.2", technique: "Risk analysis and management",
    explanation: "Stakeholder conflicts are a predictable BA risk. Documenting them and planning for resolution is the correct first step. Premature escalation or ignoring one view both lead to worse outcomes." },

  { id: "p-5", area: "planning", difficulty: "ecba",
    question: "What does the 'governance approach' refer to in BA planning?",
    options: ["Reporting BA status to senior management each week", "Creating a project governance board for the initiative", "Defining who has decision-making authority over requirements", "Setting up the document management system for the project"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.3", technique: "Decision analysis",
    explanation: "Governance defines the process for making decisions about requirements — who reviews them, who approves changes, and who has authority to accept or reject them. Without clear governance, requirements drift without accountability." },

  { id: "p-6", area: "planning", difficulty: "ccba",
    question: "A stakeholder becomes unavailable for six weeks mid-project. What is the BEST course of action for the BA?",
    options: ["Pause all BA activities until the stakeholder returns", "Continue with the remaining stakeholders and brief the absent one afterwards", "Identify whether a proxy can provide input or whether the gap can be managed with lower risk", "Remove the stakeholder from the engagement plan"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.2", technique: "Risk analysis and management",
    explanation: "BA plans must adapt to constraints. A proxy or interim input mechanism maintains progress without excluding a critical perspective. Simply continuing without the stakeholder creates gaps that surface later." },

  { id: "p-7", area: "planning", difficulty: "ecba",
    question: "What is the purpose of an information management approach in a BA plan?",
    options: ["Setting up the project's IT infrastructure", "Defining how BA information will be stored, accessed, and controlled throughout the initiative", "Creating the project communication plan for all team members", "Training stakeholders on document management systems"],
    correctIndex: 1, babokRef: "BABOK v3 Section 3.4", technique: "Information management",
    explanation: "The information management approach ensures BA artefacts — requirements documents, models, research findings — are organised, accessible to the right people, and controlled so versions are clear. This prevents the chaos of undocumented changes." },

  { id: "p-8", area: "planning", difficulty: "cbap",
    question: "A BA working on a complex enterprise transformation faces continuously emerging requirements and a changing stakeholder landscape. Which approach is most appropriate?",
    options: ["A fully predictive approach with a comprehensive upfront BA plan", "An adaptive approach with iterative planning and continuous stakeholder engagement", "Deferring all planning until the stakeholder landscape stabilises", "Front-loading all elicitation in the first month, then switching to predictive delivery"],
    correctIndex: 1, babokRef: "BABOK v3 Section 3.1", technique: "Adaptive approach",
    explanation: "Complex, high-change environments demand adaptive BA work. Continuous stakeholder engagement and iterative planning allow the BA to respond as new requirements emerge. A static upfront plan becomes obsolete quickly in this context." },

  { id: "p-9", area: "planning", difficulty: "ecba",
    question: "Which of the following would NOT typically appear in a BA plan?",
    options: ["Elicitation activities to be conducted", "Deliverables to be produced and their review process", "The technical architecture of the proposed solution", "Risks that could affect the BA work"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.1", technique: "Business analysis planning",
    explanation: "Technical architecture is the responsibility of solution architects and technical teams. The BA plan covers how analysis will be conducted, what it will produce, and what could go wrong — not how the solution will be built." },

  { id: "p-10", area: "planning", difficulty: "ccba",
    question: "Midway through elicitation, a BA discovers the initial scope was too narrow and additional stakeholders are needed. What should she do?",
    options: ["Complete elicitation with the current stakeholder set to avoid scope creep", "Ask the project manager to handle the stakeholder expansion", "Add the new stakeholders without updating the plan to save time", "Update the BA plan to reflect the expanded scope and stakeholder set"],
    correctIndex: 3, babokRef: "BABOK v3 Section 3.6", technique: "Performance improvement",
    explanation: "The BA plan is a living document. When the situation changes, the plan must be updated. Working from a plan that no longer reflects reality creates analysis gaps that surface at the worst possible time." },

  { id: "p-11", area: "planning", difficulty: "ecba",
    question: "What is the key difference between a BA plan and a project plan?",
    options: ["They are the same document produced by different people", "A BA plan is created after the project plan is approved", "A BA plan covers how analysis will be conducted; a project plan covers all project delivery activities", "A project plan focuses on quality; a BA plan focuses on schedule"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.1", technique: "Business analysis planning",
    explanation: "The BA plan is specifically about how the BA will perform their work — which methods, what deliverables, who to engage, what risks exist. The project plan is broader, covering all aspects of delivery including development, testing, and deployment." },

  { id: "p-12", area: "planning", difficulty: "ccba",
    question: "A BA is asked to measure and improve her own performance. Which BABOK task specifically addresses this?",
    options: ["Plan Business Analysis Approach", "Plan Stakeholder Engagement", "Identify Business Analysis Performance Improvements", "Define Requirements Architecture"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.6", technique: "Metrics and KPIs",
    explanation: "BABOK includes a dedicated task for evaluating and improving BA practices. It covers identifying what worked, what did not, and how approaches can be refined. This makes continuous improvement an explicit BA responsibility." },

  { id: "p-13", area: "planning", difficulty: "ecba",
    question: "In the context of a BA approach, 'cadence' refers to:",
    options: ["The speed at which requirements are documented", "The frequency and rhythm of BA activities such as reviews, elicitation sessions, and deliverable production", "The complexity level of requirements language used", "The order in which stakeholders are interviewed"],
    correctIndex: 1, babokRef: "BABOK v3 Section 3.1", technique: "Adaptive approach",
    explanation: "Cadence is a planning concept — how often key activities repeat. A BA working in an agile context plans their cadence to fit the sprint cycle. In a waterfall context, cadence defines how regularly milestones and reviews occur." },

  { id: "p-14", area: "planning", difficulty: "cbap",
    question: "A BA is responsible for analysis across three interdependent projects in a programme. What is the MOST important consideration when creating the BA plan?",
    options: ["Using identical elicitation techniques across all three projects", "Creating a separate BA plan for each project independently", "Ensuring requirements traceability links are maintained across all three projects only", "Identifying and managing dependencies between the three projects' requirements and sequencing analysis activities accordingly"],
    correctIndex: 3, babokRef: "BABOK v3 Section 3.1", technique: "Dependency analysis",
    explanation: "At programme level, the critical BA challenge is cross-project dependencies. Requirements from one project may constrain or enable another. The BA plan must address how analysis sequencing accounts for these interdependencies." },

  { id: "p-15", area: "planning", difficulty: "ccba",
    question: "Which metrics are MOST relevant for assessing the health of BA work on a project?",
    options: ["The number of pages in the requirements document", "The number of elicitation sessions conducted and hours spent", "The number of change requests and defects traced back to requirements gaps", "The project manager's assessment of the BA's performance"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.6", technique: "Metrics and KPIs",
    explanation: "Quality metrics for BA work focus on outcomes. Requirements gaps that cause defects or change requests are the clearest indicator of BA quality. Volume metrics like page count or session count measure activity, not impact." },

  { id: "p-16", area: "planning", difficulty: "ecba",
    question: "What is the purpose of identifying BA performance improvement opportunities?",
    options: ["To demonstrate the BA's value to management during appraisals", "To create a training plan for junior BAs on the team", "To satisfy BABOK compliance requirements for certified practitioners", "To assess and improve BA practices, methods, and performance on an ongoing basis"],
    correctIndex: 3, babokRef: "BABOK v3 Section 3.6", technique: "Retrospectives",
    explanation: "This BABOK task is forward-looking — it is about continuous improvement of how BA work is done. Reflecting on what worked and what did not makes each subsequent project more effective." },

  { id: "p-17", area: "planning", difficulty: "ccba",
    question: "In an agile context, how does BA work typically differ from a traditional predictive approach?",
    options: ["There is no BA role in agile projects — the product owner handles all requirements", "BA work is completed in a single sprint at the start of the project", "BA work is integrated into sprint cycles with continuous elicitation and backlog refinement rather than upfront discovery", "Requirements documentation is eliminated in agile projects"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.1", technique: "Agile approaches",
    explanation: "Agile BA work is iterative. Requirements are progressively elaborated in backlogs, refined in sprint planning, and validated continuously. The BA adapts their approach to fit the team's cadence rather than working in a separate analysis phase." },

  { id: "p-18", area: "planning", difficulty: "ecba",
    question: "A 'stakeholder engagement approach' BEST describes which of the following?",
    options: ["A list of all meetings the BA plans to attend during the project", "The stakeholder's formal agreement to participate in requirements sessions", "A plan for how the BA will involve each stakeholder in analysis activities throughout the initiative", "An analysis of each stakeholder's technical knowledge and skills"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.2", technique: "Stakeholder engagement",
    explanation: "The engagement approach defines who is involved, how, and when. It ensures every relevant stakeholder has a mechanism to contribute their knowledge, review outputs, and make decisions — not just attend meetings." },

  { id: "p-19", area: "planning", difficulty: "cbap",
    question: "A BA is asked to develop an organisation-wide BA framework. What should this framework primarily address?",
    options: ["The IT tools used for requirements documentation across the organisation", "The reporting structure and career ladder for the BA team", "The hiring criteria and interview process for business analysts", "Minimum quality standards, methods, templates, and governance for BA activities that allow appropriate adaptation per project"],
    correctIndex: 3, babokRef: "BABOK v3 Section 3", technique: "Organisational modelling",
    explanation: "A BA framework provides guardrails for consistent, high-quality BA work across projects. It must be flexible enough to adapt to project context while ensuring minimum standards. Prescribing tools or reporting lines is secondary." },

  { id: "p-20", area: "planning", difficulty: "ccba",
    question: "Why should a BA document assumptions explicitly in the BA plan?",
    options: ["To demonstrate thoroughness to senior management during reviews", "To satisfy a mandatory BABOK requirement for certified practitioners", "Because undocumented assumptions that prove false cause rework with no mechanism for early detection", "To transfer risk ownership to the project manager"],
    correctIndex: 2, babokRef: "BABOK v3 Section 3.5", technique: "Assumptions analysis",
    explanation: "Assumptions underpin decisions. If an assumption is wrong and was never documented, no trigger exists to revisit the decisions made on it. Documenting assumptions creates a review mechanism — when the assumption is tested, the BA knows which decisions to revisit." },

  // ── ELICITATION AND COLLABORATION ────────────────────────────────────────────

  { id: "e-1", area: "elicitation", difficulty: "ecba",
    question: "What is the PRIMARY purpose of elicitation in business analysis?",
    options: ["To document exactly what stakeholders say in meetings", "To draw out, explore, and identify information about stakeholder needs, concerns, and the environment", "To validate requirements with the development team before coding begins", "To confirm the project scope with the project sponsor"],
    correctIndex: 1, babokRef: "BABOK v3 Section 4", technique: "Elicitation preparation",
    explanation: "Elicitation is active, not passive. It draws out information that stakeholders may not readily articulate, including unstated assumptions and tacit knowledge. Simply recording what people say in meetings misses the analytical purpose of the activity." },

  { id: "e-2", area: "elicitation", difficulty: "ecba",
    question: "Which elicitation technique is MOST effective for surfacing tacit knowledge?",
    options: ["Survey", "Interview", "Observation", "Brainstorming"],
    correctIndex: 2, babokRef: "BABOK v3 Section 10.25", technique: "Observation",
    explanation: "Tacit knowledge is what people do but cannot easily say. Observation reveals actual behaviour — the timing constraints, workarounds, and informal processes that stakeholders never think to mention because they are too embedded in daily routine." },

  { id: "e-3", area: "elicitation", difficulty: "ecba",
    question: "A stakeholder keeps offering solutions during an interview instead of describing needs. What is the BEST BA response?",
    options: ["Document the solutions as requirements since they come from a senior stakeholder", "Stop the interview and reschedule after briefing the stakeholder on the process", "Ask the project manager to intervene before the next session", "Acknowledge the input and redirect: help me understand what problem that solution would solve for you"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.20", technique: "Interviews",
    explanation: "Solutions framed as requirements are common. Redirecting to the underlying need without confrontation maintains the relationship and recovers the analysis. Documenting the solution as a requirement produces a product that may not solve the actual problem." },

  { id: "e-4", area: "elicitation", difficulty: "ccba",
    question: "What is the difference between stated and unstated requirements?",
    options: ["Stated requirements are written; unstated requirements are verbal", "Stated are from business stakeholders; unstated are from technical stakeholders", "Stated requirements are explicitly communicated; unstated requirements are assumed to be present without being mentioned", "Stated requirements are confirmed; unstated requirements are still under discussion"],
    correctIndex: 2, babokRef: "BABOK v3 Section 4", technique: "Requirements classification",
    explanation: "Unstated requirements are things stakeholders assume will be provided without saying so — security for a banking app, data backup for any enterprise system. Discovering and documenting them is a core elicitation responsibility." },

  { id: "e-5", area: "elicitation", difficulty: "ecba",
    question: "Which technique is BEST for reaching a large number of geographically dispersed stakeholders efficiently?",
    options: ["Observation", "Focus group", "Survey", "Prototyping"],
    correctIndex: 2, babokRef: "BABOK v3 Section 10.37", technique: "Survey or questionnaire",
    explanation: "Surveys scale across geographies and can be completed asynchronously. They are strong for quantifying priorities and patterns but weak on nuance. For large, dispersed groups where in-person sessions are impractical, they are the most efficient primary technique." },

  { id: "e-6", area: "elicitation", difficulty: "ccba",
    question: "During a requirements workshop, two senior stakeholders debate an important point that is outside the workshop's scope. What should the BA facilitator do?",
    options: ["Let the debate run — it may surface valuable requirements", "Side with the more senior stakeholder to resolve the issue quickly", "End the workshop and reschedule once the issue is resolved elsewhere", "Acknowledge both views, add the item to the parking lot with an owner, and redirect the group to the agenda"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.43", technique: "Workshops",
    explanation: "The parking lot captures important items visibly so they are not lost without derailing the session. Taking sides damages facilitation neutrality. Ending the workshop wastes everyone's time for what is a manageable situation." },

  { id: "e-7", area: "elicitation", difficulty: "ecba",
    question: "What is the purpose of confirming elicitation results?",
    options: ["To get stakeholder sign-off on the final requirements document", "To present requirements to the development team for feasibility review", "To verify that the information captured during elicitation is accurate and complete before analysis begins", "To compare requirements across different stakeholders for consistency"],
    correctIndex: 2, babokRef: "BABOK v3 Section 4.3", technique: "Reviews",
    explanation: "Confirming elicitation results is a quality check on raw captured information — it happens before analysis, not after. The BA verifies that what was captured reflects what the stakeholder actually said and intended, avoiding misunderstandings entering the requirements process." },

  { id: "e-8", area: "elicitation", difficulty: "cbap",
    question: "A BA is eliciting requirements from sophisticated financial professionals who find group workshops inefficient. Which approach is MOST appropriate?",
    options: ["Insist on workshops since they are the most comprehensive elicitation technique", "Use surveys only to minimise disruption to their time", "Ask a user representative to elicit from their peers and brief the BA on findings", "Conduct individual structured interviews with each user, supplemented by a prototype review session once initial requirements are drafted"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.20, 10.30", technique: "Interviews, Prototyping",
    explanation: "Elicitation technique selection must fit stakeholder constraints and preferences. Sophisticated users give richer input in focused individual sessions. A prototype review later unlocks requirements that are impossible to articulate verbally but immediately recognisable when seen." },

  { id: "e-9", area: "elicitation", difficulty: "ecba",
    question: "What is the key difference between an interview and a focus group as elicitation techniques?",
    options: ["Interviews are formal; focus groups are informal", "Focus groups are used for technical requirements; interviews for business requirements", "Interviews are face-to-face; focus groups can be remote", "Interviews involve one participant at a time; focus groups involve multiple participants to capture diverse perspectives and observe group dynamics"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.11", technique: "Focus groups",
    explanation: "The key distinction is participant count and the dynamic it creates. Focus groups can surface requirements through discussion and peer reaction that would not emerge in a one-on-one setting, particularly for consumer-facing products." },

  { id: "e-10", area: "elicitation", difficulty: "ccba",
    question: "A BA notices stakeholders give different answers when interviewed alone versus in a group. What does this most likely indicate?",
    options: ["The stakeholders are being dishonest in group settings", "The individual interviews were conducted with leading questions", "Group dynamics and power relationships are influencing what stakeholders feel comfortable expressing publicly", "The requirements are not well-defined enough to elicit consistent responses"],
    correctIndex: 2, babokRef: "BABOK v3 Section 10.43", technique: "Interviews, Workshops",
    explanation: "Power dynamics in groups suppress honest input — especially when senior stakeholders are present. Recognising this phenomenon is a core elicitation skill. Individual sessions often produce more candid, accurate information on politically sensitive topics." },

  { id: "e-11", area: "elicitation", difficulty: "ecba",
    question: "What is brainstorming BEST used for in elicitation?",
    options: ["Identifying and validating requirements with precision before analysis begins", "Documenting requirements in a structured format for review", "Confirming technical feasibility of proposed requirements", "Generating a wide range of ideas and possibilities without immediate evaluation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.8", technique: "Brainstorming",
    explanation: "Brainstorming is divergent — it generates broadly without evaluating. It is valuable for exploring solution options or problem framing but is not a primary requirements capture technique. Its strength is breadth, not precision." },

  { id: "e-12", area: "elicitation", difficulty: "ccba",
    question: "A stakeholder who seemed disengaged during elicitation becomes highly critical during requirements review. What is the MOST likely cause?",
    options: ["The requirements document contains technical errors", "The stakeholder has changed their priorities since the elicitation sessions", "The review process is too formal and intimidating", "Insufficient early engagement means the requirements do not reflect their needs and they are seeing the gap for the first time"],
    correctIndex: 3, babokRef: "BABOK v3 Section 4.2", technique: "Stakeholder engagement",
    explanation: "Late resistance usually signals an early engagement failure. If a stakeholder's needs were not properly elicited, the review is where they first see the gap — an expensive discovery point. The right fix is earlier, deeper engagement." },

  { id: "e-13", area: "elicitation", difficulty: "ecba",
    question: "What does 'elicitation preparation' primarily involve?",
    options: ["Writing the requirements document before meeting stakeholders to test hypotheses", "Creating the project plan for the elicitation phase", "Training stakeholders on how requirements elicitation works", "Identifying who to engage, what information to seek, what questions to ask, and what outputs are expected from each session"],
    correctIndex: 3, babokRef: "BABOK v3 Section 4.1", technique: "Elicitation preparation",
    explanation: "Preparation is where the real work happens before a session. A well-prepared elicitation session with clear objectives and targeted questions consistently produces far better results than an improvised meeting. The time is always recovered." },

  { id: "e-14", area: "elicitation", difficulty: "cbap",
    question: "A BA has limited access to a high-value expert stakeholder. Which approach MAXIMISES value from constrained access?",
    options: ["Conduct one long workshop to capture everything in a single session", "Ask the stakeholder to document their own requirements and review them afterwards", "Rely exclusively on document analysis to reduce dependency on the stakeholder's time", "Prepare highly structured questions focused on the highest-value unknowns and follow up async with targeted written questions"],
    correctIndex: 3, babokRef: "BABOK v3 Section 4.1", technique: "Interviews",
    explanation: "Time-constrained expert stakeholders require high-preparation, high-yield sessions. Every minute must be spent on knowledge only they hold. Async follow-up maximises extraction without consuming more live time. Coming unprepared is the fastest way to lose a scarce resource." },

  { id: "e-15", area: "elicitation", difficulty: "ecba",
    question: "When is document analysis MOST valuable as an elicitation technique?",
    options: ["Only when no stakeholders are available to interview", "After all other elicitation is complete to validate the findings", "Document analysis is not a recognised elicitation technique in BABOK", "Before stakeholder interviews — reviewing existing artefacts enables more informed and credible questions"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.10", technique: "Document analysis",
    explanation: "Document analysis is most powerful as preparation. Arriving at a stakeholder interview having read the relevant policies, reports, and prior project docs enables the BA to ask precise questions and skip basics, building credibility and unlocking deeper knowledge." },

  { id: "e-16", area: "elicitation", difficulty: "ecba",
    question: "What is the key output of a completed elicitation activity?",
    options: ["A stakeholder sign-off confirming the session was productive", "A formal requirements document ready for review", "A project status report for the programme manager", "Elicitation outputs — raw captured information including notes, models, and observations, not yet analysed into requirements"],
    correctIndex: 3, babokRef: "BABOK v3 Section 4.2", technique: "Elicitation outputs",
    explanation: "Elicitation outputs are raw material — not requirements. The distinction matters because information captured in a session still needs to be analysed, structured, and validated before it becomes a formal requirement. Treating raw notes as requirements is a common quality failure." },

  { id: "e-17", area: "elicitation", difficulty: "ccba",
    question: "Which combination of elicitation techniques is MOST useful for understanding how an organisation's processes actually work before requirements are defined?",
    options: ["Brainstorming followed by a prototyping session", "Survey followed by a focus group", "Document analysis combined with observation", "Interview followed by a requirements workshop"],
    correctIndex: 2, babokRef: "BABOK v3 Section 10.10, 10.25", technique: "Document analysis, Observation",
    explanation: "Document analysis reveals the official process; observation reveals what practitioners actually do. Both are needed because the gap between documented and actual processes is often where the most important requirements live." },

  { id: "e-18", area: "elicitation", difficulty: "ecba",
    question: "Confirming elicitation results is BEST described as:",
    options: ["Getting formal stakeholder approval on the requirements document", "Presenting requirements to the development team for feasibility review", "Checking that the elicitation notes accurately reflect what the stakeholder said and intended, before analysis begins", "Comparing outputs from multiple stakeholders to identify contradictions"],
    correctIndex: 2, babokRef: "BABOK v3 Section 4.3", technique: "Reviews",
    explanation: "Confirmation is a pre-analysis quality check. The BA verifies with the stakeholder that the captured information is accurate — this is different from approving requirements, which happens later. Catching a misunderstanding here costs far less than finding it in a review." },

  { id: "e-19", area: "elicitation", difficulty: "cbap",
    question: "A BA is working on a digital transformation where the future state is conceptual and unfamiliar to stakeholders, making it hard for them to articulate requirements. What is the MOST effective elicitation approach?",
    options: ["Ask the IT team to define requirements and present them to stakeholders for reaction", "Commission a consultant to define the future state on behalf of the business", "Ask stakeholders to write down their ideal scenario privately before meeting", "Use facilitated workshops with process modelling or prototyping to make the future state tangible enough for stakeholders to react to"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.43, 10.30", technique: "Workshops, Prototyping",
    explanation: "When the future state is unfamiliar, people cannot articulate requirements for something they have never seen. Making it tangible through models or prototypes enables reaction-based elicitation — stakeholders are excellent at saying yes, no, not quite even when they cannot articulate from scratch." },

  { id: "e-20", area: "elicitation", difficulty: "ccba",
    question: "A stakeholder's requirements directly contradict a documented business rule. What should the BA do?",
    options: ["Use the stakeholder's requirements and flag the business rule as outdated", "Use the business rule and note the stakeholder's view as an exception", "Ask the technical team to determine which is technically easier to implement", "Document both, flag the conflict explicitly, and facilitate a resolution with the appropriate business authority"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.7", technique: "Business rules analysis",
    explanation: "Neither the requirement nor the rule should be discarded without explicit review. The conflict may reveal an outdated rule, a misunderstood requirement, or a legitimate tension. The BA facilitates resolution — the decision belongs to the business authority." },

  // ── REQUIREMENTS LIFE CYCLE MANAGEMENT ──────────────────────────────────────

  { id: "lc-1", area: "lifecycle", difficulty: "ecba",
    question: "What is requirements traceability?",
    options: ["Tracking the delivery progress of requirements through the project timeline", "A tool for managing requirement version numbers and document history", "The process of prioritising requirements in order of business value", "The ability to link each requirement to its source, to related requirements, and to the deliverables that implement it"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.1", technique: "Traceability matrix",
    explanation: "Traceability creates a web of relationships. It enables impact analysis (what else changes if this requirement changes?), coverage verification (is every business need addressed?), and audit trails. Without it, change management is guesswork." },

  { id: "lc-2", area: "lifecycle", difficulty: "ecba",
    question: "A stakeholder requests a change to a confirmed requirement. What should the BA do FIRST?",
    options: ["Implement the change immediately and update the requirements document", "Refuse the change to protect scope stability", "Ask the project manager to decide whether to approve it", "Assess the impact of the change on other requirements, the solution design, and the project timeline"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.4", technique: "Impact analysis",
    explanation: "Changes are not automatically approved or rejected. Impact assessment comes first — understanding what the change costs and what else it affects gives decision-makers the information they need. Without this, approvals are uninformed." },

  { id: "lc-3", area: "lifecycle", difficulty: "ecba",
    question: "What is the difference between requirements verification and requirements validation?",
    options: ["Verification is done by the BA; validation is done by testers", "Verification happens after development; validation happens before", "There is no meaningful difference in professional practice", "Verification checks that requirements are well-formed; validation checks that requirements will actually deliver value to stakeholders"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Reviews, Acceptance criteria",
    explanation: "Verification asks 'are we building the requirements right?' — checking completeness, clarity, and consistency. Validation asks 'are we building the right requirements?' — checking that requirements address the actual stakeholder need and business objective. Both are required." },

  { id: "lc-4", area: "lifecycle", difficulty: "ccba",
    question: "Which prioritisation technique is MOST appropriate when multiple stakeholders have conflicting views on importance?",
    options: ["Alphabetical ordering of requirements for neutrality", "Asking the project sponsor to assign all priorities unilaterally", "Arbitrary BA judgement based on domain experience", "MoSCoW analysis facilitated with all relevant stakeholders present"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.29", technique: "MoSCoW",
    explanation: "MoSCoW provides a shared framework that forces explicit discussion about must-haves versus nice-to-haves. Facilitating it with stakeholders creates collective ownership of the output — critical when conflicting views need to be reconciled." },

  { id: "lc-5", area: "lifecycle", difficulty: "ecba",
    question: "What is a requirements baseline?",
    options: ["The minimum acceptable quality level for any requirement", "The first draft of the requirements document before stakeholder review", "The set of requirements that all stakeholders have reviewed at least once", "A snapshot of approved requirements at a specific point in time, used as the reference for assessing changes"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.2", technique: "Baseline management",
    explanation: "A baseline is a fixed reference point. Once requirements are baselined, every change is tracked against that reference. This enables controlled change management rather than informal scope drift where nobody is sure what was originally agreed." },

  { id: "lc-6", area: "lifecycle", difficulty: "ccba",
    question: "During development, the engineering team finds that one confirmed functional requirement is technically infeasible as written. What is the BA's MOST appropriate response?",
    options: ["Remove the requirement from the document immediately", "Mark it as rejected and proceed with remaining requirements", "Escalate to the project sponsor to decide whether to cancel the project", "Work with the team to understand the constraint, explore alternative approaches that meet the underlying need, and update requirements accordingly"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.4", technique: "Feasibility analysis",
    explanation: "Infeasibility is not an automatic rejection — it is a design constraint. The BA's job is to find alternative ways to meet the underlying business need within technical constraints. Requirements evolve to reflect new understanding; the business objective remains constant." },

  { id: "lc-7", area: "lifecycle", difficulty: "ecba",
    question: "Which of the following BEST characterises a well-formed requirement?",
    options: ["It is written in the passive voice for formal documentation", "It is approved by the project manager before being shared with developers", "It describes the technical solution in sufficient detail for development", "It is specific, measurable, achievable, and traceable to a business objective"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Requirements quality attributes",
    explanation: "A well-formed requirement is specific (unambiguous), measurable (testable), achievable (feasible), and traceable (linked to a business need). Vague requirements or requirements that describe a solution rather than a need create downstream problems in design and testing." },

  { id: "lc-8", area: "lifecycle", difficulty: "ccba",
    question: "Requirements reuse PRIMARILY aims to achieve:",
    options: ["Copying requirements from previous projects without modification for speed", "Reusing requirements templates to ensure consistent documentation format", "Repeating requirements across multiple sections of the same document", "Maintaining approved, validated requirements in a knowledge base so they can be adapted for future initiatives"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.2", technique: "Organisational knowledge management",
    explanation: "Requirements reuse means capturing validated requirements in a library so future projects can reference or adapt them. This improves quality (reused requirements have been tested), reduces effort, and builds organisational BA knowledge over time." },

  { id: "lc-9", area: "lifecycle", difficulty: "ecba",
    question: "Why is it important to maintain requirements after they are baselined?",
    options: ["Because requirements documents need to be reviewed annually per governance policy", "It is not important — baselining means requirements are frozen", "To give stakeholders something to review during project closure meetings", "Because requirements evolve as decisions are made and understanding deepens, and documentation must reflect the current agreed state"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.2", technique: "Requirements management",
    explanation: "Requirements documents that reflect the initial state rather than current agreed state are a liability. Development teams build what is documented. Outdated requirements create a disconnect between what was agreed and what gets built." },

  { id: "lc-10", area: "lifecycle", difficulty: "cbap",
    question: "A BA is working on a programme where requirements from one project constrain solution options in another. How should this be managed?",
    options: ["Treat each project's requirements independently to reduce complexity", "Defer the dependent project until the constraining project is complete", "Assign one BA per project with no cross-project coordination", "Create a cross-project traceability framework that links dependent requirements and flags impact when changes occur in either project"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.1", technique: "Traceability matrix",
    explanation: "Programme-level BA work requires cross-project requirements management. A traceability framework spanning projects enables impact analysis and prevents one project's changes from silently breaking another's requirements or creating contradictions." },

  { id: "lc-11", area: "lifecycle", difficulty: "ecba",
    question: "In MoSCoW prioritisation, 'W' (Will not have) means:",
    options: ["The requirement will never be built under any circumstances", "The requirement was formally rejected by the project sponsor", "The requirement is awaiting approval from the business owner", "The requirement is explicitly out of scope for this delivery iteration but may be considered for a future release"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.29", technique: "MoSCoW",
    explanation: "'Will not have' is a scope management statement, not a permanent rejection. It explicitly preserves the item for future consideration without creating scope creep in the current iteration. This distinction is frequently misunderstood." },

  { id: "lc-12", area: "lifecycle", difficulty: "ccba",
    question: "What does formally approving requirements accomplish?",
    options: ["It signals that requirements are ready for system testing", "It transfers responsibility for the requirements to the development team", "It freezes requirements permanently with no possibility of change", "It confirms that stakeholders have reviewed and agreed to the requirements, creating a basis for development and controlled change management"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Structured walkthrough",
    explanation: "Formal approval creates shared commitment and a baseline against which changes can be assessed. It does not freeze requirements — it creates a controlled process for evolving them. Without approval, there is no stable foundation for development." },

  { id: "lc-13", area: "lifecycle", difficulty: "ecba",
    question: "What is the main risk of not managing requirements traceability?",
    options: ["The requirements document will become too long to review effectively", "The project manager will be unable to track delivery progress", "Stakeholders will not be able to find their specific requirements", "Changes to one requirement may cause undetected gaps or conflicts in related requirements or the solution"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.1", technique: "Impact analysis",
    explanation: "Without traceability, change impact is invisible. A change to one requirement can break dependent requirements or leave parts of the solution without coverage — problems that surface late in development at high cost." },

  { id: "lc-14", area: "lifecycle", difficulty: "cbap",
    question: "A significant change request arrives after requirements have been baselined and development has started. What is the MOST appropriate process?",
    options: ["Implement the change immediately to maintain stakeholder satisfaction and momentum", "Reject the change automatically because the baseline is set", "Negotiate with the stakeholder to reduce the change enough to avoid formal change control", "Perform a formal impact assessment covering requirements, architecture, cost, timeline, and risk; present findings to the decision authority for approval"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.4", technique: "Change control process",
    explanation: "Post-baseline changes require formal change control. The BA provides the impact analysis; the decision authority determines whether to proceed. Neither automatic approval nor automatic rejection is appropriate — the decision must be informed." },

  { id: "lc-15", area: "lifecycle", difficulty: "ccba",
    question: "Which situation MOST likely indicates that the requirements prioritisation process has failed?",
    options: ["Not all requirements could be delivered in the first release", "Some requirements were deferred to a later release after discussion", "Stakeholders disagreed during the prioritisation session", "All requirements were classified as must-have by the end of the session"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.29", technique: "MoSCoW",
    explanation: "When everything is a must-have, meaningful prioritisation did not happen. Real must-haves are the minimum set without which the product cannot launch. Inflation of this category makes it useless for decision-making when the timeline is compressed." },

  { id: "lc-16", area: "lifecycle", difficulty: "ecba",
    question: "What is a 'requirements attribute'?",
    options: ["A quality characteristic of a well-written requirement", "A technical specification attached to a requirement for the development team", "The requirement's position in the document hierarchy", "Metadata associated with a requirement such as its priority, status, source, or risk level"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.2", technique: "Requirements management",
    explanation: "Attributes are metadata that make requirements manageable. Priority determines what to build first. Status shows where a requirement is in the lifecycle. Source identifies ownership. Risk indicates likelihood of change. Together they enable structured requirements management." },

  { id: "lc-17", area: "lifecycle", difficulty: "ccba",
    question: "During development, a stakeholder discovers the feature being implemented does not match their current understanding. What does this MOST likely indicate?",
    options: ["The development team made implementation errors", "The project manager did not communicate the requirements to the team correctly", "The stakeholder changed their mind since requirements were approved", "A requirements management failure — the agreed requirements were not maintained or communicated as understanding evolved"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.2", technique: "Requirements management",
    explanation: "When what is being built diverges from stakeholder understanding, it usually means requirements were not maintained to reflect evolved agreements. Effective requirements management ensures the document always reflects the current agreed position." },

  { id: "lc-18", area: "lifecycle", difficulty: "ecba",
    question: "What is the MOST important criterion for approving a requirements change during development?",
    options: ["The change was requested by a senior stakeholder with high influence", "The BA agrees the change improves the requirements set", "The change is technically feasible within current architecture", "The impact on scope, cost, timeline, and related requirements has been assessed and the decision authority has approved with full information"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.4", technique: "Change control process",
    explanation: "Informed approval is the key. A feasible change from a senior stakeholder can still be the wrong decision if its true cost is not understood. The BA's role is to make the cost visible; the authority makes the decision." },

  { id: "lc-19", area: "lifecycle", difficulty: "cbap",
    question: "A product in iterative development: pilot user feedback reveals that release 1 requirements were inadequate. What is the appropriate BA response?",
    options: ["Treat feedback as out of scope — requirements were formally approved", "Roll back the pilot and restart requirements definition from scratch", "Ask development to fix the implementation to better match the original requirements", "Update requirements to reflect new understanding and manage the changes through the appropriate process, scheduling them for the correct release"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.4", technique: "Requirements lifecycle management",
    explanation: "Iterative development is designed to incorporate learning. User feedback revealing requirements inadequacy is a valid, valuable input to the requirements lifecycle — not a failure. The appropriate response is structured update, not rollback." },

  { id: "lc-20", area: "lifecycle", difficulty: "ccba",
    question: "What does it mean for a requirement to be 'conflicted'?",
    options: ["Two different stakeholders wrote the requirement with different interpretations", "The requirement is technically difficult to implement within the current architecture", "Stakeholders disagree about the requirement's relative priority", "The requirement directly or indirectly contradicts another requirement in the set"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Requirements quality assessment",
    explanation: "Conflicting requirements describe mutually exclusive behaviours or states. If both are implemented, one will violate the other. Identifying and resolving conflicts before development is a fundamental quality task." },

  // ── STRATEGY ANALYSIS ────────────────────────────────────────────────────────

  { id: "s-1", area: "strategy", difficulty: "ecba",
    question: "What is the purpose of current state analysis?",
    options: ["To document existing IT systems in sufficient technical detail for migration", "To create a baseline project plan for the initiative", "To analyse the organisation's financial performance for the business case", "To understand the existing environment — people, processes, technology, and context — as the foundation for identifying what needs to change"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1", technique: "Current state description",
    explanation: "Current state analysis creates a shared understanding of where the organisation is now. Without it, a future state definition has no grounding and a change strategy has no starting point. It is the essential foundation for all subsequent strategy work." },

  { id: "s-2", area: "strategy", difficulty: "ecba",
    question: "What is a 'business need' in the context of strategy analysis?",
    options: ["A requirement raised by a senior stakeholder for a specific feature", "A technical capability requested by the IT department", "A list of features the business unit wants built in the next release", "A problem or opportunity that, if addressed, would deliver meaningful value to the organisation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1", technique: "Business needs assessment",
    explanation: "A business need is not a requirement — it is the problem or opportunity that requirements are designed to address. Identifying the true business need before defining requirements is the most important step in strategy analysis. Without it, solutions solve the wrong problem." },

  { id: "s-3", area: "strategy", difficulty: "ecba",
    question: "Which technique is MOST useful for identifying the root cause of a business problem?",
    options: ["SWOT analysis", "Root cause analysis using the 5 Whys or fishbone diagram", "PEST analysis", "Cost-benefit analysis"],
    correctIndex: 1, babokRef: "BABOK v3 Section 10.34", technique: "Root cause analysis",
    explanation: "Root cause analysis is specifically designed to find underlying causes rather than symptoms. Solutions that address symptoms without identifying the root cause are common and expensive failures. The 5 Whys forces the analyst to go deeper than the obvious." },

  { id: "s-4", area: "strategy", difficulty: "ccba",
    question: "A BA is asked to define the future state for a customer service transformation. What should she do FIRST?",
    options: ["Design the new system architecture with the IT team", "Create a feature list for the new solution based on industry benchmarks", "Present future state options to the executive team for early selection", "Ensure the current state is fully understood and the business need is clearly defined"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1, 6.2", technique: "Current state description",
    explanation: "The future state must be grounded in current state understanding and a clear business need. Future state definitions built without this foundation often solve the wrong problem, duplicate existing capability, or create change that does not address the real gap." },

  { id: "s-5", area: "strategy", difficulty: "ecba",
    question: "What is the primary purpose of a business case?",
    options: ["To describe the technical requirements of the proposed solution in detail", "To provide a project plan and timeline for delivery", "To confirm stakeholder agreement on the project scope before work begins", "To justify an investment by articulating the value it will deliver, the costs involved, and the risks"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1", technique: "Business case",
    explanation: "A business case answers the fundamental investment question: should we do this? It quantifies value, estimates cost, and assesses risk in enough detail to support a go or no-go decision. Without it, investment decisions are made on instinct." },

  { id: "s-6", area: "strategy", difficulty: "ccba",
    question: "Three solution options have been identified for improving customer satisfaction. How should the BA approach the selection recommendation?",
    options: ["Select the most technically sophisticated option for future-proofing", "Select the cheapest option to demonstrate cost consciousness", "Let the technology team choose based on their architectural preferences", "Evaluate each option against the defined business need and desired future state using agreed criteria, then present the analysis to the decision authority"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.4", technique: "Decision analysis",
    explanation: "Solution selection should be criteria-driven and value-based, not preference-based. The BA structures the analysis and presents it clearly — the decision authority makes the final call. This separates analytical rigor from authority." },

  { id: "s-7", area: "strategy", difficulty: "ecba",
    question: "What does 'organisational readiness' refer to in the context of change strategy?",
    options: ["Whether the IT team is ready to build the new system on schedule", "Whether the project budget has been formally approved by the board", "Whether all requirements have been documented and reviewed", "The extent to which the people, processes, and culture of the organisation are prepared to adopt and sustain a change"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.3", technique: "Readiness assessment",
    explanation: "The best solution can fail if the organisation is not ready to adopt it. Organisational readiness assesses culture, capability, and motivation to change. Factors that determine whether a solution actually delivers value, not just whether it functions technically." },

  { id: "s-8", area: "strategy", difficulty: "cbap",
    question: "A BA is reviewing a proposed future state requiring significant process change across three business units. What risk should she specifically surface?",
    options: ["The risk that the IT team will not deliver on time", "The risk that the project budget will be exceeded if scope grows", "The risk that requirements will change after the baseline is set", "The risk that the business units will resist the change, reducing adoption and preventing value realisation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.3", technique: "Risk analysis and management",
    explanation: "Change resistance is the most common reason transformations fail to deliver their intended value. A BA who surfaces this risk explicitly — backed by specific evidence from stakeholder analysis — enables the programme to plan appropriate change management activities before resistance becomes entrenched." },

  { id: "s-9", area: "strategy", difficulty: "ecba",
    question: "What is gap analysis?",
    options: ["An assessment of missing documentation in the requirements set", "An analysis of the gaps in stakeholder knowledge identified during elicitation", "A review of missing features in the current system compared to competitors", "A comparison between the current state and the desired future state to identify what needs to change"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.2", technique: "Gap analysis",
    explanation: "Gap analysis identifies the differences between current state and future state. Those gaps define the scope of change — and therefore the scope of requirements needed to bridge them. It is a direct input to solution scope definition." },

  { id: "s-10", area: "strategy", difficulty: "ccba",
    question: "A change strategy BEST describes:",
    options: ["A high-level plan for IT system delivery", "A document describing what the new solution will do", "A stakeholder communication plan for the initiative", "A description of how the organisation will move from current to future state, including the sequence and approach for managing change"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.4", technique: "Roadmapping",
    explanation: "The change strategy defines the path, not just the destination. It considers sequencing, dependencies, organisational readiness, and risk — not just what will change but how and in what order change will be managed to realise value." },

  { id: "s-11", area: "strategy", difficulty: "ecba",
    question: "A SWOT analysis in strategy analysis is used to:",
    options: ["Define the technical architecture options for the proposed solution", "Prioritise requirements in order of their business value", "Map stakeholders to their level of influence and interest in the initiative", "Assess the organisation's internal strengths and weaknesses alongside external opportunities and threats"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.40", technique: "SWOT analysis",
    explanation: "SWOT surfaces the strategic context — internal capabilities and limitations alongside external factors — that informs which changes are feasible and which opportunities are worth pursuing. It is used early in strategy analysis to frame the problem and solution space." },

  { id: "s-12", area: "strategy", difficulty: "ccba",
    question: "An organisation is choosing between building a new capability internally or acquiring it through a vendor. Which BA approach BEST structures this decision?",
    options: ["Process modelling to understand the current workflow", "Requirements workshops to capture stakeholder preferences", "Observation sessions with current users", "Vendor assessment combined with a cost-benefit analysis evaluating each option against defined selection criteria"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.5", technique: "Cost-benefit analysis, Vendor assessment",
    explanation: "Make versus buy decisions require structured financial and capability evaluation. Vendor assessment defines what to evaluate; cost-benefit analysis quantifies the financial impact. Together they provide an objective basis for what is otherwise often a politically loaded decision." },

  { id: "s-13", area: "strategy", difficulty: "ecba",
    question: "What is the MOST important input when defining the future state?",
    options: ["The technology roadmap from the IT department", "The requirements from a similar previous project", "The budget allocated for the current initiative", "A clear definition of the business need and a thorough understanding of the current state"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.2", technique: "Future state description",
    explanation: "The future state is defined in relation to the business need (what outcome is required) and the current state (where the organisation is starting from). Without both, the future state is either unrealistic or solves the wrong problem." },

  { id: "s-14", area: "strategy", difficulty: "cbap",
    question: "An enterprise wants to improve customer onboarding. Multiple business units have slightly different processes. What approach should the BA recommend?",
    options: ["Document each business unit's process separately and treat them as independent initiatives", "Standardise all processes to a single model regardless of legitimate variation", "Let each business unit define its own future state independently", "Identify common elements across all processes, define a target state accommodating necessary variation, and design a change strategy accounting for different readiness levels in each unit"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.2, 6.4", technique: "Process modelling, Gap analysis",
    explanation: "Enterprise-wide change requires recognising both common ground and legitimate variation. Forcing identical processes ignores context. Leaving each unit independent creates fragmentation. The optimal design finds the common standard with managed variation where it genuinely matters." },

  { id: "s-15", area: "strategy", difficulty: "ccba",
    question: "Why is risk assessment an essential part of strategy analysis?",
    options: ["To satisfy project governance and audit requirements", "To justify the BA's work to senior management during reviews", "To identify which requirements are most likely to change during development", "Because the feasibility and value of a change strategy depends on the risks that could prevent the future state from being achieved"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.3", technique: "Risk analysis and management",
    explanation: "A change strategy is only as good as its likelihood of delivering the future state. Risk assessment identifies what could prevent value realisation — enabling the strategy to mitigate those risks or choose a different path. Strategy without risk assessment is planning without reality." },

  { id: "s-16", area: "strategy", difficulty: "ecba",
    question: "What is the difference between a business goal and a business objective?",
    options: ["They are the same concept expressed at different levels of the organisation", "Business goals are for executives; business objectives are for operational managers", "Business objectives are defined first; business goals follow from them", "A business goal is a broad qualitative direction; a business objective is a specific measurable target supporting that goal"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1", technique: "Business model analysis",
    explanation: "Goals provide direction: improve customer satisfaction. Objectives provide measurement: achieve an NPS of 60 or above by year end. Both are needed — the goal anchors strategic intent, the objective enables evaluation of whether the intent has been realised." },

  { id: "s-17", area: "strategy", difficulty: "ccba",
    question: "An organisation is entering a new market. A BA is asked to assess the external environment. Which technique is MOST appropriate?",
    options: ["Root cause analysis to understand barriers to entry", "Use case modelling to describe the target customer interactions", "Process flow mapping to document the current go-to-market process", "PEST analysis examining Political, Economic, Social, and Technological factors in the target market"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.26", technique: "PEST analysis",
    explanation: "PEST analysis is specifically designed for macro-environmental assessment. It systematically examines the external factors that will shape the feasibility and approach for the new market entry — the type of structured external analysis a strategy decision requires." },

  { id: "s-18", area: "strategy", difficulty: "ecba",
    question: "What do 'transition requirements' refer to?",
    options: ["Requirements that change frequently during development", "Requirements from the previous version of the system being replaced", "Requirements for the solution in its final steady state", "Requirements for what is needed to move from the current to the future state — such as data migration, training, and interim processes"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.4", technique: "Transition requirements",
    explanation: "Transition requirements define what is needed to make the change happen — not what the final solution must do. Training, data migration, parallel running, and cutover procedures are classic examples. They are often missed entirely, causing go-live failures." },

  { id: "s-19", area: "strategy", difficulty: "cbap",
    question: "An enterprise transformation programme has a defined future state but multiple paths to achieve it. How should the BA support change strategy selection?",
    options: ["Recommend the fastest path to deliver the most immediate stakeholder value", "Recommend the cheapest path to demonstrate financial discipline", "Let the programme manager choose the delivery approach", "Evaluate each path against defined success criteria, risks, and organisational readiness; present the analysis to the decision authority"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.4", technique: "Decision analysis, Readiness assessment",
    explanation: "Change strategy selection requires structured evaluation. Speed and cost are factors, but so are organisational readiness, sequencing risk, and alignment with success criteria. The BA's role is to provide the analytical framework; the decision authority makes the call." },

  { id: "s-20", area: "strategy", difficulty: "ccba",
    question: "An organisation wants to reduce customer churn by 20% in 12 months. A BA is tasked with analysing the current state. What is the MOST important thing to establish first?",
    options: ["The technical capabilities of the current CRM platform", "What competitors are doing to retain customers in the same market", "The budget available for a retention initiative", "The root causes of why customers are currently leaving"],
    correctIndex: 3, babokRef: "BABOK v3 Section 6.1", technique: "Root cause analysis",
    explanation: "Without understanding why customers churn, any solution risks addressing symptoms rather than causes. This is the critical error in most retention initiatives — jumping to solutions before understanding the actual problem through rigorous current state analysis." },

  // ── REQUIREMENTS ANALYSIS AND DESIGN DEFINITION ─────────────────────────────

  { id: "a-1", area: "analysis", difficulty: "ecba",
    question: "What is the difference between a functional requirement and a non-functional requirement?",
    options: ["Functional requirements come from business stakeholders; non-functional from technical stakeholders", "Functional requirements are mandatory; non-functional are optional enhancements", "There is no meaningful difference in professional practice", "Functional requirements describe what the system does; non-functional requirements describe how well it does it"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7", technique: "Requirements classification",
    explanation: "Functional requirements define behaviour — what the system does. Non-functional requirements define quality attributes — response time, security, scalability, reliability. Both are essential. A system that does the right things badly is not an acceptable solution." },

  { id: "a-2", area: "analysis", difficulty: "ecba",
    question: "What is a use case?",
    options: ["An example of how a requirement might be used to justify the project", "A case study of how a similar organisation solved the same problem", "A test case used to validate requirements during UAT", "A description of the interactions between an actor and a system to accomplish a specific goal"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.47", technique: "Use cases and scenarios",
    explanation: "A use case captures how a user interacts with the system to achieve a goal — including the main success scenario and alternative paths. It describes the interaction from the user's perspective, not the system's internal behaviour." },

  { id: "a-3", area: "analysis", difficulty: "ecba",
    question: "In a user story (As a [role], I want [feature], so that [benefit]) what does the 'so that' clause provide?",
    options: ["The technical implementation detail for developers", "The priority level assigned to the story in the backlog", "The acceptance criteria for verifying the story is complete", "The business value and rationale, linking the feature to a user outcome"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.47", technique: "User stories",
    explanation: "The 'so that' clause connects the feature to value. It keeps development focused on the outcome, not just the output. A story without it is a feature request with no justification. When cut comes to cut, stories with clear value are preserved; stories without context are dropped." },

  { id: "a-4", area: "analysis", difficulty: "ccba",
    question: "What is the purpose of a data model in requirements analysis?",
    options: ["To design the database schema for the development team", "To specify the data migration plan from the legacy system", "To document the data governance policy and ownership", "To describe the data entities the solution needs to manage, their attributes, and their relationships"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.35", technique: "Data modelling",
    explanation: "A BA-level data model describes what data the solution needs to know about, not how to store it. It ensures all required data entities are identified and their relationships understood before design begins — preventing the costly discovery of missing entities in development." },

  { id: "a-5", area: "analysis", difficulty: "ecba",
    question: "Which notation is most widely used for modelling business processes in BA practice?",
    options: ["UML class diagrams", "Entity-relationship diagrams", "Data flow diagrams", "BPMN — Business Process Model and Notation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.6", technique: "Business process modelling",
    explanation: "BPMN is the industry-standard notation for business process modelling. It is readable by both business and technical stakeholders, provides rigorous representation of flows, decisions, and lane responsibilities, and is supported by most modelling tools." },

  { id: "a-6", area: "analysis", difficulty: "ccba",
    question: "A requirements model has gaps — some process paths are not modelled. What is the MOST significant risk?",
    options: ["The model will appear unprofessional during stakeholder reviews", "The model will be too large to review in a reasonable timeframe", "Stakeholders will not be able to understand the model without training", "Development teams will implement the modelled paths but unmodelled paths will not be designed, creating gaps that surface as production defects"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.6", technique: "Business process modelling",
    explanation: "Developers build what is specified. Unmodelled paths — particularly error and exception paths — become production defects or gaps that users discover at go-live. Complete process models including all paths, not just the happy path, are a fundamental quality requirement." },

  { id: "a-7", area: "analysis", difficulty: "ecba",
    question: "What is requirements architecture?",
    options: ["The technical infrastructure needed to manage requirements documentation", "The visual layout and formatting conventions of the requirements document", "The process for reviewing and approving requirements before development", "The structure and relationships among requirements, showing how they form a coherent whole addressing the business need"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7.2", technique: "Requirements architecture",
    explanation: "Requirements architecture ensures requirements are not a disconnected list. They form a coherent framework linking business needs through stakeholder requirements to functional and non-functional requirements, with each level supporting the ones above. Without this structure, completeness is impossible to verify." },

  { id: "a-8", area: "analysis", difficulty: "ccba",
    question: "A requirement states: 'The system shall be fast.' What is fundamentally wrong with this?",
    options: ["Requirements should use 'must' not 'shall' for clarity", "Performance is a technical concern and should not be in the requirements document", "This is acceptable for a high-level draft requirement pending detailed elaboration", "It is not specific or measurable — 'fast' has no success criterion and cannot be objectively tested"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Requirements quality attributes",
    explanation: "A requirement without a measurable success criterion is a wish, not a requirement. 'The system shall return search results in under 2 seconds for 95% of queries under normal load' is testable. 'Fast' is not. Even draft requirements should contain measurable intent." },

  { id: "a-9", area: "analysis", difficulty: "ecba",
    question: "What is the purpose of defining acceptance criteria?",
    options: ["To give the QA team a specific testing script to follow", "To document what the solution will explicitly not do", "To set the minimum standards for documentation quality on the project", "To define the conditions under which a requirement is considered satisfied, enabling objective verification"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Acceptance and evaluation criteria",
    explanation: "Acceptance criteria define what 'done' looks like for a requirement. Without them, done is subjective and disputes arise at delivery. They translate requirements into verifiable conditions that both business and technical stakeholders can agree on before development starts." },

  { id: "a-10", area: "analysis", difficulty: "cbap",
    question: "A complex enterprise system has hundreds of requirements. What approach BEST ensures they form a coherent whole?",
    options: ["Reviewing each requirement individually for quality attributes", "Conducting a final stakeholder sign-off session covering all requirements at once", "Grouping requirements alphabetically or by feature for navigation", "Building a requirements architecture that links requirements through multiple abstraction levels, tracing each to a business objective and forward to design components"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7.2", technique: "Requirements architecture",
    explanation: "Coherence in large requirement sets requires architectural thinking. Reviewing individual requirements for quality does not reveal inter-requirement contradictions or gaps in coverage. Architecture creates the framework showing how all requirements combine to deliver the business objective." },

  { id: "a-11", area: "analysis", difficulty: "ecba",
    question: "Interface analysis is used to:",
    options: ["Design the visual layout and user interface screens", "Review technical API documentation for the development team", "Analyse stakeholder communication and interaction preferences", "Identify and document the inputs and outputs between the solution and external systems, users, or organisations"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.21", technique: "Interface analysis",
    explanation: "Interface analysis identifies the boundaries of the solution — what it receives from and sends to external entities. This is critical for scoping and for ensuring all data exchanges are accounted for in requirements. Missed interfaces are one of the most common sources of integration failures." },

  { id: "a-12", area: "analysis", difficulty: "ccba",
    question: "What is the MOST important quality check before declaring requirements ready for design?",
    options: ["Every requirement has a priority level assigned to it", "All stakeholders have formally signed the requirements document", "The development team has reviewed and acknowledged the requirements", "Requirements are complete, consistent, unambiguous, and traceable to business objectives"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Requirements quality attributes",
    explanation: "Sign-off without quality is false confidence. Requirements readiness for design requires completeness (no gaps), consistency (no contradictions), unambiguity (one interpretation only), and traceability (each requirement linked to a business need). Only then can design be reliable." },

  { id: "a-13", area: "analysis", difficulty: "ecba",
    question: "What is the difference between a business rule and a functional requirement?",
    options: ["Business rules are documented in IT systems; requirements are in requirements documents", "Business rules are for business stakeholders; requirements are written for developers", "There is no meaningful difference — they are interchangeable in practice", "A business rule is a policy that constrains a business operation; a functional requirement describes what the solution must do"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.7", technique: "Business rules analysis",
    explanation: "Business rules (customers under 18 cannot open a credit account) constrain how the business operates. Functional requirements describe what the solution must do to accommodate or enforce those rules. They are related but distinct — conflating them creates poorly structured requirements." },

  { id: "a-14", area: "analysis", difficulty: "cbap",
    question: "A BA is defining requirements architecture for a programme with three interdependent projects. What is the MOST important structural consideration?",
    options: ["Using the same requirements template across all three projects for consistency", "Consolidating all requirements into a single unified document", "Creating one independent requirements document per project", "Defining clear abstraction layers — programme-level business requirements, project-level stakeholder requirements, solution requirements — with explicit traceability across projects"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7.2", technique: "Requirements architecture",
    explanation: "At programme level, requirements exist at multiple levels of abstraction. Programme-level requirements drive project-level requirements, which drive solution requirements. Cross-project traceability ensures no programme requirement is stranded and that dependencies are visible." },

  { id: "a-15", area: "analysis", difficulty: "ccba",
    question: "What BEST distinguishes a design option from a requirement?",
    options: ["Design options are created by architects; requirements are created by BAs", "Design options always come after requirements are formally approved", "There is no meaningful distinction in agile projects", "A requirement states what the solution must do; a design option describes one potential way to meet that requirement"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7.5", technique: "Design options analysis",
    explanation: "Keeping requirements and design options separate preserves solution flexibility. A requirement defined independently of any specific design means the best solution can be selected on merit. Requirements that prescribe a design limit options unnecessarily." },

  { id: "a-16", area: "analysis", difficulty: "ecba",
    question: "A decision table is used in requirements analysis to:",
    options: ["Map requirements to their corresponding test cases for the QA team", "Prioritise requirements by business value across stakeholder groups", "Document stakeholder decisions made during requirements workshops", "Represent complex business logic with multiple conditions and corresponding actions in a structured, exhaustive format"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.9", technique: "Decision analysis",
    explanation: "Decision tables capture complex if-then logic systematically. They are particularly useful for business rules where multiple conditions combine in various ways. A decision table makes gaps and contradictions in the logic visible in a way that prose cannot." },

  { id: "a-17", area: "analysis", difficulty: "ccba",
    question: "A state diagram is MOST useful for modelling:",
    options: ["The sequence of activities in a business process from start to finish", "The data entities in the system and their relationships", "The sequence of interactions between a user and the system", "The different states an entity can be in and the events that cause transitions between those states"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.47", technique: "State modelling",
    explanation: "State diagrams model entity lifecycle. For a loan application: draft → submitted → under review → approved or rejected → disbursed → repaid. Each state and transition has specific rules and triggers. Missing a state is a requirements gap with real operational consequences." },

  { id: "a-18", area: "analysis", difficulty: "ecba",
    question: "What is a wireframe used for in requirements analysis?",
    options: ["To model the database structure for the development team", "To document technical API specifications and integration points", "To map the business process and workflow for stakeholder review", "To provide a visual representation of a user interface that validates requirements and stimulates stakeholder feedback"],
    correctIndex: 3, babokRef: "BABOK v3 Section 10.30", technique: "Prototyping",
    explanation: "Wireframes are BA tools for making requirements tangible. They stimulate feedback and validate understanding — stakeholders react to something visual far more precisely than to text. A wireframe review often uncovers requirements that no amount of written specification would have surfaced." },

  { id: "a-19", area: "analysis", difficulty: "cbap",
    question: "A BA writes: 'The system shall be highly available.' Why is this non-functional requirement inadequate?",
    options: ["Non-functional requirements do not need to be measurable in the same way as functional requirements", "The word 'shall' should not be used with non-functional requirements", "Availability is a technical concern and belongs in technical specifications, not requirements", "'Highly available' is not specific or measurable — without a defined availability target it cannot be objectively tested or verified"],
    correctIndex: 3, babokRef: "BABOK v3 Section 5.5", technique: "Requirements quality attributes",
    explanation: "Non-functional requirements must be measurable. 'The system shall achieve 99.9% availability measured monthly, excluding scheduled maintenance' is testable. 'Highly available' cannot be accepted or rejected objectively. The same quality standard applies to all requirement types." },

  { id: "a-20", area: "analysis", difficulty: "ccba",
    question: "Why should multiple modelling techniques be used rather than a single technique?",
    options: ["To produce more documentation demonstrating the depth of the analysis", "To satisfy BABOK completeness requirements for certified practitioners", "To keep stakeholders engaged through variety in the review process", "Different techniques capture different aspects of the solution — using multiple techniques reduces blind spots and creates a more complete picture"],
    correctIndex: 3, babokRef: "BABOK v3 Section 7.2", technique: "Requirements modelling",
    explanation: "Each modelling technique illuminates different aspects. Process models show flow. Data models show structure. Use cases show interaction. State diagrams show lifecycle. Using multiple techniques reduces the risk of missing requirements that one technique would not reveal by design." },

  // ── SOLUTION EVALUATION ──────────────────────────────────────────────────────

  { id: "ev-1", area: "evaluation", difficulty: "ecba",
    question: "What is the purpose of solution evaluation?",
    options: ["To test the software for technical defects before release", "To document lessons learned after project completion for the BA knowledge base", "To review the requirements document for accuracy after development", "To assess the extent to which a deployed solution meets the business need and delivers the intended value"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8", technique: "Solution evaluation",
    explanation: "Solution evaluation is broader than testing. It measures business outcomes against the defined need. A technically correct system that does not deliver business value has not solved the problem. Evaluation asks whether the investment achieved its purpose." },

  { id: "ev-2", area: "evaluation", difficulty: "ecba",
    question: "What is a key performance indicator (KPI) in the context of solution evaluation?",
    options: ["A score given to requirements based on their assessed business value", "A metric used by the project manager to track delivery progress", "A customer satisfaction survey score collected after go-live", "A measurable value that indicates whether the solution is achieving a specific business objective"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.1", technique: "Metrics and KPIs",
    explanation: "KPIs bridge business objectives (which justified the investment) to operational data (which shows whether those objectives are being met). They must be defined before launch so baseline and post-launch data can be compared objectively." },

  { id: "ev-3", area: "evaluation", difficulty: "ecba",
    question: "A solution has been deployed but users are not adopting it. What should the BA investigate FIRST?",
    options: ["Whether the requirements were correctly documented throughout the project", "Whether the project was delivered on time and within budget", "Whether the development team built all the specified features correctly", "Whether the solution fits actual user needs and whether usability or change management barriers are preventing adoption"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.2, 8.3", technique: "User acceptance evaluation",
    explanation: "Low adoption can indicate the solution does not fit actual workflow, is too difficult to use, or that change management was insufficient. All are evaluation findings requiring BA analysis before remediation. The root cause determines the right response." },

  { id: "ev-4", area: "evaluation", difficulty: "ccba",
    question: "What is the difference between solution limitations and enterprise limitations?",
    options: ["Solution limitations are technical; enterprise limitations are financial", "There is no meaningful difference — both represent the same type of constraint", "Enterprise limitations only apply to organisations with more than 500 employees", "Solution limitations are constraints within the deployed solution itself; enterprise limitations are constraints in the broader organisation that prevent the solution realising full value"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.3, 8.4", technique: "Solution evaluation",
    explanation: "A solution may work correctly but fail to deliver value because of enterprise limitations — processes, culture, skills, or governance preventing effective use. Both types must be identified and addressed. Fixing only the solution while enterprise limitations remain produces partial results at best." },

  { id: "ev-5", area: "evaluation", difficulty: "ecba",
    question: "What must be established BEFORE a solution launches in order to enable effective post-launch evaluation?",
    options: ["A training plan and user adoption roadmap for the go-live period", "A list of approved change requests for the first release", "A project closure report approved by the sponsor", "A baseline measurement of current state performance so post-launch data can be meaningfully compared"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.1", technique: "Metrics and KPIs",
    explanation: "You cannot measure improvement without knowing where you started. Pre-launch baseline measurement is essential for post-launch evaluation to distinguish the solution's actual impact from natural business variation or other concurrent changes." },

  { id: "ev-6", area: "evaluation", difficulty: "ccba",
    question: "A solution has been live three months. Business outcomes are below expectations despite the solution performing as technically specified. What is the MOST likely cause?",
    options: ["The development team made implementation errors not caught in testing", "The KPIs selected for evaluation are not measuring the right things", "The solution simply needs more time to show measurable results", "The requirements correctly documented what stakeholders said but did not accurately reflect the real business need, or enterprise factors are preventing value realisation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.3, 8.4", technique: "Root cause analysis",
    explanation: "A technically correct solution that does not deliver business value indicates either a requirements quality failure (the requirements did not accurately capture the actual need) or enterprise limitations preventing adoption and use. Both require BA analysis to diagnose." },

  { id: "ev-7", area: "evaluation", difficulty: "ecba",
    question: "User Acceptance Testing (UAT) is used to:",
    options: ["Test the solution against technical specifications and architecture", "Train users before go-live and measure their readiness", "Assess system performance under peak load conditions", "Confirm that the solution satisfies stakeholder requirements and is ready for deployment"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.2", technique: "Acceptance and evaluation criteria",
    explanation: "UAT is business-side confirmation that the solution meets requirements and is acceptable for production. It is stakeholder-led and requirement-based, not technically-led. A solution that passes technical testing but fails UAT does not meet the business need." },

  { id: "ev-8", area: "evaluation", difficulty: "cbap",
    question: "A solution processes 30% more claims than before but customer satisfaction has not improved. What should the BA recommend?",
    options: ["Declare the project successful — the output target was achieved", "Increase the volume target to 50% to determine whether satisfaction improves with further efficiency gains", "Survey customers and use the results to rewrite the requirements for version 2", "Conduct deeper analysis of what actually drives customer satisfaction to determine whether the solution is addressing the root cause"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.5", technique: "Root cause analysis, Metrics and KPIs",
    explanation: "Outputs are not outcomes. Processing more claims is an output. Customer satisfaction is the outcome. The BA's job is to investigate whether the solution is addressing the right problem — efficiency may not be what drives satisfaction, meaning a different intervention is needed." },

  { id: "ev-9", area: "evaluation", difficulty: "ecba",
    question: "'Recommend actions to increase solution value' means:",
    options: ["Writing new requirements for the next version of the solution", "Presenting a business case for a completely new project", "Reviewing the solution performance report and filing it for future reference", "Identifying and proposing changes — to the solution, the business processes, or the enterprise context — that would improve value realisation"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.5", technique: "Solution evaluation, Business case",
    explanation: "This task closes the loop. Once evaluation identifies that value is not being fully realised — whether due to solution gaps, process issues, or enterprise limitations — the BA recommends specific, justified actions. It is the active, forward-looking conclusion of the evaluation process." },

  { id: "ev-10", area: "evaluation", difficulty: "ccba",
    question: "A post-implementation review reveals that 40% of the system's features are rarely or never used. What does this MOST likely indicate?",
    options: ["The system needs a better user interface to surface these features more prominently", "Users need more training and support to understand the full feature set", "The features should be immediately removed to reduce system complexity", "The elicitation process captured requirements not reflecting genuine business need, or the solution solved the wrong problem"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.3", technique: "Solution evaluation, Usage metrics",
    explanation: "High rates of unused features are a strong signal of requirements quality failure — either the features were not genuinely needed or they were built in a way that does not fit actual workflows. Both are evaluation findings requiring analysis before any response." },

  { id: "ev-11", area: "evaluation", difficulty: "ecba",
    question: "Which of the following is a lagging indicator in solution evaluation?",
    options: ["The number of requirements approved before the solution was built", "Number of UAT defects identified during the acceptance testing phase", "Number of users trained before the go-live date", "Business outcome measured after the solution has been live for a defined period, such as revenue increase or cost reduction"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.1", technique: "Metrics and KPIs",
    explanation: "Lagging indicators measure outcomes after the fact — they confirm whether value has been delivered. Leading indicators (like adoption rate) predict whether outcomes are likely. Both are needed: leading indicators enable early intervention; lagging indicators confirm results." },

  { id: "ev-12", area: "evaluation", difficulty: "ccba",
    question: "A stakeholder says the solution is not working but the technical team says all requirements are implemented correctly. What is the MOST likely issue?",
    options: ["The stakeholder does not understand how the system works and needs more training", "The technical team has made implementation errors not yet visible in testing", "The project was delivered late, creating frustration the stakeholder is misattributing to quality", "There is a gap between what was documented as requirements and what the stakeholder actually needed — a requirements quality failure"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.3", technique: "Root cause analysis",
    explanation: "When 'meets requirements' and 'meets stakeholder need' diverge, it signals that requirements did not accurately capture the need. This is a BA quality issue. The technical team correctly built what was specified; the specification did not reflect the actual need." },

  { id: "ev-13", area: "evaluation", difficulty: "ecba",
    question: "What is the BA's role in a post-implementation review?",
    options: ["To present the project closure report and archive the requirements", "To evaluate the performance of the development team against delivery targets", "To document lessons learned for the project archive and governance records", "To assess whether the solution is delivering value, identify gaps or limitations, and recommend specific improvements"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.5", technique: "Solution evaluation",
    explanation: "The BA's post-implementation role is analytical and forward-looking — assessing value delivery, identifying what works and what does not, and recommending specific actions. It is not retrospective reporting; it is active evaluation aimed at improvement." },

  { id: "ev-14", area: "evaluation", difficulty: "cbap",
    question: "A technically sound solution creates significant new manual workarounds in a downstream process because an organisational factor was not addressed. What does this represent?",
    options: ["A development defect that should be logged and fixed in the next release", "A user training failure that change management should have prevented", "A scope management failure that should have been caught in requirements review", "An enterprise limitation that was not identified during strategy analysis, preventing value realisation in the broader system"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.4", technique: "Enterprise limitation analysis",
    explanation: "Enterprise limitations are organisational factors — processes, capabilities, structures — that prevent the solution from delivering value beyond its immediate scope. Failing to identify them during strategy analysis means their downstream impact is discovered at implementation, at high cost." },

  { id: "ev-15", area: "evaluation", difficulty: "ccba",
    question: "When is the MOST appropriate time to define how solution success will be measured?",
    options: ["After the solution has been deployed and initial results are available", "During UAT when the solution is available to test", "At the post-implementation review when outcomes can be observed", "During requirements analysis, before the solution is built"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.1", technique: "Metrics and KPIs",
    explanation: "Success measures must be defined before the solution is built — ideally before elicitation begins. Defining them after the fact creates selection bias: post-hoc metrics naturally favour what performed well. Pre-defined success criteria are the only basis for objective, credible evaluation." },

  { id: "ev-16", area: "evaluation", difficulty: "ecba",
    question: "What is a benefit realisation review?",
    options: ["A financial audit of the total project costs against the approved budget", "A meeting to close the project and archive all artefacts", "A review of the requirements that contributed the most measurable value", "An assessment conducted after deployment to determine whether the intended benefits have actually been achieved"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.5", technique: "Benefits realisation",
    explanation: "Benefit realisation reviews evaluate whether the investment delivered its intended value — comparing post-implementation performance against the business case targets that justified the decision to proceed. Without it, organisations cannot learn which investments deliver and which do not." },

  { id: "ev-17", area: "evaluation", difficulty: "ccba",
    question: "A solution has been live six months. Users say it is functional but they rely on workarounds for several common tasks. What does this indicate?",
    options: ["The solution was not built to the requirements that were approved", "Users are resistant to change and need to be coached through adoption", "The requirements need to be fully redocumented to reflect the current understanding", "There are solution limitations — gaps between what the solution does and what users need it to do in actual workflows"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.3", technique: "Solution evaluation",
    explanation: "Workarounds are evidence of solution limitations — unrealised value. They represent places where the solution does not adequately support actual work. These findings should be assessed, quantified, and considered for improvement in subsequent releases." },

  { id: "ev-18", area: "evaluation", difficulty: "ecba",
    question: "Why should a BA define success metrics BEFORE a solution is built rather than after deployment?",
    options: ["To satisfy project governance and stakeholder reporting requirements", "Because it is cheaper to define metrics before the development phase begins", "To give the development team measurable targets to work towards", "To prevent selection bias — post-hoc metrics naturally favour measures where the solution performed well"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.1", technique: "Metrics and KPIs",
    explanation: "Pre-definition of success metrics is fundamental to objective evaluation. When metrics are chosen after seeing results, the natural human tendency is to select measures that make the investment look good. Pre-defined metrics enforce objectivity and credibility." },

  { id: "ev-19", area: "evaluation", difficulty: "cbap",
    question: "A solution is technically correct but has increased process complexity for a downstream team that was not considered during requirements analysis. What does this represent?",
    options: ["A development defect that should be fixed in a patch release", "A user training issue that change management should address", "A scope management failure that change control should have prevented", "An enterprise limitation — an organisational factor not identified during strategy analysis, creating negative value elsewhere in the system"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.4", technique: "Enterprise limitation analysis",
    explanation: "When a solution works as specified but creates problems elsewhere in the organisation, it reveals an enterprise limitation that was not identified during strategy work. The solution is technically sound; the analysis was incomplete. This is the classic 'solved the problem, created a worse one' pattern." },

  { id: "ev-20", area: "evaluation", difficulty: "ccba",
    question: "Which stakeholder group is MOST important to involve in post-implementation solution evaluation?",
    options: ["The project sponsor who approved the original investment", "The development team who built the solution", "The BA team who defined the original requirements", "End users who interact with the solution in their daily work"],
    correctIndex: 3, babokRef: "BABOK v3 Section 8.2", technique: "User feedback, Surveys",
    explanation: "End users are the primary source of insight into whether the solution fits real-world workflows. Their feedback surfaces limitations, workarounds, and gaps that no other stakeholder group can provide with the same accuracy. Executive views reflect strategy; user views reflect reality." },
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function selectPracticeQuestions(area: BABOKArea, count: number, difficulty: string): ExamQuestion[] {
  let pool = QUESTIONS.filter(q => q.area === area);
  if (difficulty !== "mixed") pool = pool.filter(q => q.difficulty === difficulty);
  if (pool.length === 0) pool = QUESTIONS.filter(q => q.area === area);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function selectMockQuestions(): ExamQuestion[] {
  const areas: BABOKArea[] = ["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation"];
  const selected: ExamQuestion[] = [];
  const usedIds = new Set<string>();
  for (const area of areas) {
    const areaQs = shuffle(QUESTIONS.filter(q => q.area === area)).slice(0, 8);
    areaQs.forEach(q => { selected.push(q); usedIds.add(q.id); });
  }
  const extras = shuffle(QUESTIONS.filter(q => !usedIds.has(q.id))).slice(0, 2);
  extras.forEach(q => selected.push(q));
  return shuffle(selected);
}
