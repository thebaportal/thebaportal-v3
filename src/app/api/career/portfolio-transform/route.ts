import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { submission } = await req.json();
  if (!submission || typeof submission !== "string") {
    return Response.json({ error: "submission is required" }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a Business Analysis career coach.

Your job is to transform a raw BA challenge submission into a strong, concise portfolio case study.

The output must:
- Be clear and professional
- Focus on thinking, not just tasks
- Highlight impact and decision-making
- Avoid generic phrases

Do not invent unrealistic metrics.
If impact is unclear, state realistic qualitative outcomes.

---

INPUT (raw submission):
${submission}

---

Return ONLY valid JSON — no text outside it:
{
  "title": "<short, clear project title>",
  "problem": "<2–3 sentences describing the situation or problem>",
  "approach": "<2–3 sentences explaining what the user did and how they thought>",
  "output": "<1–2 sentences describing what was produced>",
  "outcome": "<1–2 sentences describing the result or impact>",
  "skills": ["<3–5 relevant BA skills>"]
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
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("portfolio-transform error:", err);
    return Response.json({ error: "Could not transform submission. Please try again." }, { status: 500 });
  }
}
