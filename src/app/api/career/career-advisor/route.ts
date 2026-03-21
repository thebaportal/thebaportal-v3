import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 26;

function buildPrompt(flowId: string, answers: string[]): string {
  const a = (i: number) => answers[i] || "Not answered";

  if (flowId === "new_to_ba") {
    return `You are a BA career advisor helping a complete beginner find their direction in Business Analysis.

They have answered 4 questions. Recommend the best BA track for them and give them a clear starting point.

Q1 – How they naturally approach a problem: ${a(0)}
Q2 – What a good day at work looks like: ${a(1)}
Q3 – What pulls them toward BA: ${a(2)}
Q4 – How ready they are to start: ${a(3)}

The three BA tracks:
- Technical BA (Systems / Data focused): bridges business and IT, writes detailed specs, works daily with dev teams, strong on data and systems thinking
- Product BA (User / Product focused): embedded in product teams, works in agile sprints, thinks in user stories and outcomes, focuses on user needs and product direction
- Business Process BA (Operations / Strategy focused): works at a process or enterprise level, focuses on how organisations change and improve, strong on stakeholder management and business cases

Analyse all 4 answers together. Pick the track that best matches how they think and what draws them to BA. Be specific — reference what they actually said, not generic track descriptions.

Return ONLY valid JSON — no text outside it:
{
  "flowId": "new_to_ba",
  "recommendedTrack": "Technical BA (Systems / Data focused)" or "Product BA (User / Product focused)" or "Business Process BA (Operations / Strategy focused)",
  "whyItFits": "<2 sentences. Reference their actual Q1 and Q2 answers specifically. Why does their thinking style and motivation point to this track?>",
  "readinessInsight": "<1–2 sentences based on Q4. If ready: push them to act this week with a specific first step. If hesitant or exploring: acknowledge it warmly and give one low-friction thing they can do today that removes the 'not ready' excuse.>",
  "whatToLearnFirst": "<specific skill or concept for their recommended track. E.g. for Technical BA: 'Start with requirements documentation — learn how to write a use case and a functional spec.' Be concrete, not a list of topics.>",
  "nextAction": "<one immediate action they can take today or this week. Always reference TheBAPortal BA challenge simulations: 'Start your first BA challenge simulation on TheBAPortal — each scenario gives you a real business problem to analyse and a submission you can add to your portfolio.'>"
}`;
  }

  if (flowId === "transition_to_ba") {
    return `You are a BA career advisor helping someone with real work experience in another field transition into Business Analysis.

They have answered 4 questions. Identify their transferable strengths, match them to the right BA role type, and give them specific advice on positioning and what gap to close.

Q1 – Their professional background: ${a(0)}
Q2 – BA-adjacent work they have actually done: ${a(1)}
Q3 – How clearly they can explain their experience as BA work: ${a(2)}
Q4 – What their current evidence looks like: ${a(3)}

The three BA role types:
- Technical BA: bridges business and IT — suits technology or data backgrounds
- Product BA: embedded in product teams — suits customer-facing or design backgrounds
- Business Process BA: process and strategy work — suits operations, finance, or project management backgrounds

Analyse all 4 answers. Be specific about what they already bring. Make them feel closer to BA than they think — if the evidence supports it.

Return ONLY valid JSON — no text outside it:
{
  "flowId": "transition_to_ba",
  "transferableStrengths": "<2 sentences. Specific to their Q1 background and Q2 work. Name the actual experience. E.g. 'Your finance background gives you strong analytical rigour and an instinct for process accuracy that most BAs take years to develop. The stakeholder communication you described maps directly to requirements gathering in practice.'>",
  "bestFitRole": "<role type name + 1 sentence why it fits + 1 concrete example of what that role does day to day>",
  "howToPosition": "<specific advice for resume and interviews. How should they reframe their job titles and bullet points? What BA language should they start using to describe work they already do?>",
  "biggestGap": "<the one gap most likely to come up in screening, based on Q3 and Q4. Be direct but constructive. E.g. 'The main gap is demonstrating structured requirements documentation — hiring managers will ask for examples and you will need a concrete answer.'>",
  "confidenceReframe": "<1 sentence. If their answers suggest they are closer to ready than they think, say so specifically. If they genuinely need more work, be honest but warm — do not overclaim.>",
  "nextAction": "<concrete, immediate action. If Q3 shows weak articulation: reference the Resume Improvement tool. If Q4 shows no evidence: reference BA challenge simulations on TheBAPortal. Be specific about why that action fits their situation.>",
  "ctaTool": "resume" or "portfolio" or "jd"
}`;
  }

  if (flowId === "feeling_stuck") {
    return `You are a BA career advisor helping someone who is stuck in their BA career journey. Your job is to diagnose the real blocker and give them one specific thing to do next.

They have answered 4 questions:

Q1 – Where they feel stuck right now: ${a(0)}
Q2 – The ONE main thing holding them back: ${a(1)}
Q3 – How targeted their job search is: ${a(2)}
Q4 – What they have already tried that has not worked: ${a(3)}

Diagnosis guidance — use as reasoning framework, not rigid if/else:
- Q1 suggests no direction → rootProblem = "No Direction", ctaTool = "advisor"
- Q1 = not getting interviews + Q2 = no evidence → rootProblem = "No Evidence", ctaTool = "portfolio"
- Q1 = not getting interviews + Q2 = weak positioning → rootProblem = "Weak Positioning", ctaTool = "resume"
- Q1 = getting interviews but no offers + Q2 = interview issue → rootProblem = "Interview Performance", ctaTool = "interview"
- Q1 = losing momentum + Q2 = not ready → rootProblem = "Confidence/Momentum", ctaTool = "portfolio"
- Q3 = broad untargeted applying → rootProblem may be "Wrong Targeting", ctaTool = "jd"
- If two signals conflict, prioritise Q2 as the strongest signal
- Use all 4 answers together for full context

Confidence level logic:
- High = they have clear direction, have tried things, just need a specific fix
- Medium = some clarity but key gaps in approach or evidence
- Low = broadly stuck, not sure what to try, little evidence of progress

Return ONLY valid JSON — no text outside it:
{
  "flowId": "feeling_stuck",
  "rootProblem": "No Direction" or "No Evidence" or "Weak Positioning" or "Interview Performance" or "Confidence/Momentum" or "Wrong Targeting",
  "confidenceLevel": "High" or "Medium" or "Low",
  "plainEnglishDiagnosis": "<2–3 sentences. What is actually going on based on their specific answers. Reference what they said. Honest, warm, direct. No corporate language. E.g. 'The pattern in your answers suggests you have been applying broadly without a clear target, which is why nothing is landing. This is not about your ability — it is about targeting. Applying to everything is actually harder than applying selectively to the right roles.'>",
  "nextAction": "<the single most important thing to do this week. Specific, time-bound, executable within 1–2 hours. E.g. 'Pick 3 specific BA job postings that match what you actually want. Run each through the JD Analyzer on TheBAPortal this week — you will quickly see the pattern in what employers are asking for.'>",
  "ctaTool": "resume" or "interview" or "portfolio" or "jd" or "advisor"
}`;
  }

  throw new Error(`Unknown flowId: ${flowId}`);
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { flowId, answers } = await req.json();

  if (!flowId || !["new_to_ba", "transition_to_ba", "feeling_stuck"].includes(flowId)) {
    return Response.json({ error: "Invalid flowId." }, { status: 400 });
  }
  if (!answers || !Array.isArray(answers) || answers.length < 4) {
    return Response.json({ error: "All 4 answers are required." }, { status: 400 });
  }

  try {
    const prompt = buildPrompt(flowId, answers);
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
