import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 26;


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

  const { answers } = await req.json();
  // answers: { background, currentRole, whatLove, whatAvoid, goal }

  const prompt = `You are a BA career strategist. Based on the user's answers, recommend which of the three BA tracks best fits them and give them a personalised career roadmap.

The three BA tracks:
- Technical BA: bridges business and IT, writes detailed specs, leads UAT, works daily with dev teams, strong on data and systems
- Product BA: embedded in product teams, works in agile sprints, thinks in user stories and outcomes, focuses on product-market fit
- Business & Strategy BA: operates at portfolio/enterprise level, advises on investment cases and operating models, heavy on stakeholder management and business case writing

USER'S ANSWERS:
Background / experience so far: ${answers.background || "Not provided"}
Current role or area: ${answers.currentRole || "Not provided"}
What they love about BA work: ${answers.whatLove || "Not provided"}
What they want to avoid: ${answers.whatAvoid || "Not provided"}
Career goal in 2-3 years: ${answers.goal || "Not provided"}

Give a genuine, personalised recommendation. Don't hedge — pick a primary track and explain why. It's fine to acknowledge secondary fit.

IMPORTANT — TheBAPortal context:
The user is already on TheBAPortal (thebaportal.com), a platform built specifically for Business Analysts. It offers:
- BA challenge simulations across different industries and difficulty levels — the best way to build a real portfolio of BA work fast
- A structured learning path with modules covering core BA skills
- PitchReady — a tool for practising verbal presentations and stakeholder communication
- A Career Suite with resume improvement, cover letter builder, JD analyzer, interview prep, and salary negotiation
- A public portfolio page that showcases their completed challenges and badges to employers

For users who are new to BA or transitioning, the single most effective thing they can do RIGHT NOW is complete BA challenge simulations on this platform — they build real, demonstrable evidence of BA thinking that they can put in a portfolio and reference in interviews. Always include this as a next step, worded naturally (e.g. "Start working through the BA challenge simulations here on TheBAPortal — each one gives you a real scenario to analyse and a scored submission you can show employers").

Return ONLY valid JSON — no text outside it:
{
  "primaryTrack": "Technical BA" | "Product BA" | "Business & Strategy BA",
  "trackScores": {
    "Technical BA": <0-100>,
    "Product BA": <0-100>,
    "Business & Strategy BA": <0-100>
  },
  "whyThisFits": "<2 sentences: why their specific answers point to this track. Reference what they said, not generic traits.>",
  "whereYouAreNow": "<1-2 sentences honestly acknowledging where they are starting from. Warm and direct, no fluff.>",
  "whatNextFocus": "<1-2 sentences on the most important skill or area to focus on right now given their starting point.>",
  "secondaryTrack": "<the second-best track for them, or null>",
  "strengths": ["<3 things from their background that position them well for this track>"],
  "gaps": ["<2-3 things they will need to develop to succeed in this track>"],
  "nextSteps": [
    "<Step 1 — always reference TheBAPortal challenge simulations as an immediate action, worded naturally>",
    "<Step 2 — a specific, concrete external action tailored to their situation>",
    "<Step 3 — another specific action. Could reference TheBAPortal learning modules, PitchReady, or Career Suite tools where genuinely relevant>"
  ],
  "roleTypesToTarget": ["<3-4 specific BA job titles or role types to look for>"],
  "watchOut": "<one honest caution — something that could derail them or slow their progress if they are not careful>"
}`;

  try {
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
