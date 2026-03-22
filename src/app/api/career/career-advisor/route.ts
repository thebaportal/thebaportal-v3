import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;

const VALID_Q1_VALUES = ["junior_mid", "overlooked_senior", "contractor_tier", "new_lead"] as const;
type Q1Value = typeof VALID_Q1_VALUES[number];

const BRANCH_CONTEXT: Record<Q1Value, { branchLabel: string; branchGuidance: string }> = {
  junior_mid: {
    branchLabel: "Main gap to being taken seriously for more",
    branchGuidance: "They are a junior or mid-level BA who wants to step up. Their answer names the specific gap holding them back from being given more responsibility. Focus on concrete capability proof — what they need to build or demonstrate to be seen differently.",
  },
  overlooked_senior: {
    branchLabel: "Why they keep getting passed over",
    branchGuidance: "They have experience but keep being overlooked. Their answer explains the likely reason — visibility, being seen as a deliverer not a strategist, poor differentiation, or needing to move externally. Be direct and honest about what needs to change.",
  },
  contractor_tier: {
    branchLabel: "What is stopping them from commanding a higher rate",
    branchGuidance: "They are contracting or freelancing and want higher-value work. Their answer names the specific barrier to commanding higher rates or landing better clients. Focus on niche positioning, premium value articulation, and building a visible track record.",
  },
  new_lead: {
    branchLabel: "Biggest challenge in the new lead role",
    branchGuidance: "They have recently moved into a lead BA role. Their answer describes the hardest part of that transition. Focus on the mindset shift from delivery to leadership — what great lead BAs do differently and how to navigate the specific challenge they named.",
  },
};

function buildPrompt(flowId: string, answers: string[], q1Value?: string): string {
  const a = (i: number) => answers[i] || "Not answered";

  // IMPORTANT rule injected into every prompt
  const noQNumbers = `IMPORTANT: Never reference answers by question number (Q1, Q2, Q3, Q4). Always reference them by their actual content or the topic they cover. Write as if you know what they said, not as if you are reading a numbered list.`;

  if (flowId === "new_to_ba") {
    return `You are a BA career advisor helping a complete beginner find their direction in Business Analysis.

They have answered 4 questions. Recommend the best BA track for them and give them a clear starting point.

How they naturally approach a problem: ${a(0)}
What a good day at work looks like for them: ${a(1)}
What pulls them toward BA: ${a(2)}
How ready they are to start: ${a(3)}

The three BA tracks:
- Technical BA (Systems / Data focused): bridges business and IT, writes detailed specs, works daily with dev teams, strong on data and systems thinking
- Product BA (User / Product focused): embedded in product teams, works in agile sprints, thinks in user stories and outcomes, focuses on user needs and product direction
- Business Process BA (Operations / Strategy focused): works at a process or enterprise level, focuses on how organisations change and improve, strong on stakeholder management and business cases

Analyse all 4 answers together. Pick the track that best matches how they think and what draws them to BA. Be specific — reference what they actually said, not generic track descriptions.

${noQNumbers}

Return ONLY valid JSON — no text outside it:
{
  "flowId": "new_to_ba",
  "recommendedTrack": "Technical BA (Systems / Data focused)" or "Product BA (User / Product focused)" or "Business Process BA (Operations / Strategy focused)",
  "whyItFits": "<2 sentences. Reference their actual problem-solving style and motivation specifically. Why does their thinking style and what draws them to BA point to this track?>",
  "readinessInsight": "<1–2 sentences based on how ready they said they are. If ready: push them to act this week with a specific first step. If hesitant or exploring: acknowledge it warmly and give one low-friction thing they can do today that removes the 'not ready' excuse.>",
  "whatToLearnFirst": "<specific skill or concept for their recommended track. E.g. for Technical BA: 'Start with requirements documentation — learn how to write a use case and a functional spec.' Be concrete, not a list of topics.>",
  "nextAction": "<one immediate action they can take today or this week. Always reference TheBAPortal BA challenge simulations: 'Start your first BA challenge simulation on TheBAPortal — each scenario gives you a real business problem to analyse and a submission you can add to your portfolio.'>"
}`;
  }

  if (flowId === "transition_to_ba") {
    return `You are a BA career advisor helping someone with real work experience in another field transition into Business Analysis.

They have answered 4 questions. Identify their transferable strengths, match them to the right BA role type, and give them specific advice on positioning and what gap to close.

Their professional background: ${a(0)}
BA-adjacent work they have actually done: ${a(1)}
How clearly they can explain their experience as BA work: ${a(2)}
What their current evidence looks like: ${a(3)}

The three BA role types:
- Technical BA: bridges business and IT — suits technology or data backgrounds
- Product BA: embedded in product teams — suits customer-facing or design backgrounds
- Business Process BA: process and strategy work — suits operations, finance, or project management backgrounds

Analyse all 4 answers. Be specific about what they already bring. Make them feel closer to BA than they think — if the evidence supports it.

${noQNumbers}

Return ONLY valid JSON — no text outside it:
{
  "flowId": "transition_to_ba",
  "transferableStrengths": "<2 sentences. Specific to their background and the BA-adjacent work they described. Name the actual experience. E.g. 'Your finance background gives you strong analytical rigour and an instinct for process accuracy that most BAs take years to develop. The stakeholder communication you described maps directly to requirements gathering in practice.'>",
  "bestFitRole": "<role type name + 1 sentence why it fits + 1 concrete example of what that role does day to day>",
  "howToPosition": "<specific advice for resume and interviews. How should they reframe their job titles and bullet points? What BA language should they start using to describe work they already do?>",
  "biggestGap": "<the one gap most likely to come up in screening, based on how clearly they can articulate their experience and what evidence they have. Be direct but constructive. E.g. 'The main gap is demonstrating structured requirements documentation — hiring managers will ask for examples and you will need a concrete answer.'>",
  "confidenceReframe": "<1 sentence. If their answers suggest they are closer to ready than they think, say so specifically. If they genuinely need more work, be honest but warm — do not overclaim.>",
  "nextAction": "<concrete, immediate action. If their articulation of BA experience is weak: reference the Resume Improvement tool. If their evidence is thin: reference BA challenge simulations on TheBAPortal. Be specific about why that action fits their situation.>",
  "ctaTool": "resume" or "portfolio" or "jd"
}`;
  }

  if (flowId === "feeling_stuck") {
    return `You are a BA career advisor helping someone who is stuck in their BA career journey. Your job is to diagnose the real blocker and give them one specific thing to do next.

They have answered 4 questions:

Where they feel stuck right now: ${a(0)}
The ONE main thing holding them back: ${a(1)}
How targeted their job search is: ${a(2)}
What they have already tried that has not worked: ${a(3)}

Diagnosis guidance — use as reasoning framework, not rigid if/else:
- No clear direction → rootProblem = "No Direction", ctaTool = "advisor"
- Not getting interviews + no evidence → rootProblem = "No Evidence", ctaTool = "portfolio"
- Not getting interviews + weak positioning → rootProblem = "Weak Positioning", ctaTool = "resume"
- Getting interviews but no offers + interview issue → rootProblem = "Interview Performance", ctaTool = "interview"
- Losing momentum + not ready → rootProblem = "Confidence/Momentum", ctaTool = "portfolio"
- Broad untargeted applying → rootProblem may be "Wrong Targeting", ctaTool = "jd"
- If two signals conflict, prioritise the main blocker they named as the strongest signal
- Use all 4 answers together for full context

Confidence level logic:
- High = they have clear direction, have tried things, just need a specific fix
- Medium = some clarity but key gaps in approach or evidence
- Low = broadly stuck, not sure what to try, little evidence of progress

${noQNumbers}

Return ONLY valid JSON — no text outside it:
{
  "flowId": "feeling_stuck",
  "rootProblem": "No Direction" or "No Evidence" or "Weak Positioning" or "Interview Performance" or "Confidence/Momentum" or "Wrong Targeting",
  "confidenceLevel": "High" or "Medium" or "Low",
  "plainEnglishDiagnosis": "<2–3 sentences. What is actually going on based on their specific answers. Reference what they said directly, not by number. Honest, warm, direct. No corporate language. E.g. 'The pattern in your answers suggests you have been applying broadly without a clear target, which is why nothing is landing. This is not about your ability — it is about targeting. Applying to everything is actually harder than applying selectively to the right roles.'>",
  "nextAction": "<the single most important thing to do this week. Specific, time-bound, executable within 1–2 hours. E.g. 'Pick 3 specific BA job postings that match what you actually want. Run each through the JD Analyzer on TheBAPortal this week — you will quickly see the pattern in what employers are asking for.'>",
  "ctaTool": "resume" or "interview" or "portfolio" or "jd" or "advisor"
}`;
  }

  if (flowId === "move_to_senior_role") {
    const isValidQ1 = VALID_Q1_VALUES.includes(q1Value as Q1Value);
    if (!isValidQ1) {
      console.warn(`[career-advisor] move_to_senior_role: invalid or missing q1Value: ${q1Value}`);
    }
    const branch = isValidQ1
      ? BRANCH_CONTEXT[q1Value as Q1Value]
      : { branchLabel: "Current situation", branchGuidance: "Use all 4 answers to understand their situation and give the most relevant advice you can." };

    return `You are a BA career advisor. Tell this person exactly where they are, what is actually holding them back, and the one specific thing to do next.

Career situation: ${a(0)}
${branch.branchLabel}: ${a(1)}
What they need most to move up with confidence: ${a(2)}
The kind of move they are aiming for: ${a(3)}

Context for interpreting their second answer: ${branch.branchGuidance}

Reason over all 4 answers together. Be direct. If they are closer to their goal than they think, say so. If there is a real gap, name it.

${noQNumbers}

Return ONLY valid JSON — no text outside it:
{
  "flowId": "move_to_senior_role",
  "whereYouAre": "<2 sentences. Honest read of their current position based on their career situation and what their second answer reveals. Reference what they actually said.>",
  "realBlocker": "<the actual thing holding them back, grounded in their second answer and the branch context above. Be specific about what this person needs to change. 2 sentences.>",
  "whatSeniorActuallyMeans": "<1-2 sentences on what their specific target actually requires in practice — what does someone operating at that level do differently from what their answers suggest they are doing now?>",
  "closingTheGap": "<one concrete change. Be direct. E.g. 'Stop taking execution tasks you could delegate. Start leading the requirements conversations rather than attending them.'>",
  "nextAction": "<one thing to do this week. Specific and time-bound. Reference TheBAPortal challenge simulations where relevant.>",
  "ctaTool": "portfolio" or "resume" or "jd"
}`;
  }

  throw new Error(`Unknown flowId: ${flowId}`);
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { flowId, answers, q1Value } = await req.json();

  if (!flowId || !["new_to_ba", "transition_to_ba", "feeling_stuck", "move_to_senior_role"].includes(flowId)) {
    return Response.json({ error: "Invalid flowId." }, { status: 400 });
  }
  if (!answers || !Array.isArray(answers) || answers.length < 4) {
    return Response.json({ error: "All 4 answers are required." }, { status: 400 });
  }

  if (flowId === "move_to_senior_role" && !VALID_Q1_VALUES.includes(q1Value as Q1Value)) {
    console.warn(`[career-advisor] move_to_senior_role called with invalid q1Value: ${q1Value}`);
  }
  console.log(`[career-advisor] flowId=${flowId} q1Value=${q1Value ?? "n/a"} answers=${answers.length}`);

  try {
    const prompt = buildPrompt(flowId, answers, q1Value);
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Career advisor error:", err);
    return Response.json({ error: "Could not generate career advice. Please try again." }, { status: 500 });
  }
}
