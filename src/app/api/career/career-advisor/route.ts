import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 30;
const ai = new Anthropic();

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

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

Return ONLY valid JSON — no text outside it:
{
  "primaryTrack": "Technical BA" | "Product BA" | "Business & Strategy BA",
  "fitScore": <0-100 — how strong the fit is>,
  "whyThisTrack": "<2-3 sentences explaining why this track fits them specifically — reference their actual answers>",
  "secondaryTrack": "<the second-best track for them, or null>",
  "strengths": ["<3 things from their background that position them well for this track>"],
  "gaps": ["<2-3 things they'll need to develop to succeed in this track>"],
  "nextSteps": [
    "<concrete, specific next step — not 'network more' or 'get certified', but specific actions>",
    "<second next step>",
    "<third next step>"
  ],
  "roleTypesToTarget": ["<3-4 specific BA job titles or role types to look for>"],
  "watchOut": "<one honest caution — something that could derail them or slow their progress if they're not careful>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
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
