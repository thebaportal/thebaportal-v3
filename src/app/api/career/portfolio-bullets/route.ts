import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 20;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { caseStudy } = await req.json();
  if (!caseStudy || typeof caseStudy !== "object") {
    return Response.json({ error: "caseStudy is required" }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Convert this case study into 2 strong resume bullet points.

Focus on:
- action + impact
- measurable or implied value
- no fluff

Do not invent unrealistic metrics.
If impact is unclear, state realistic qualitative outcomes.

---

INPUT:
${JSON.stringify(caseStudy, null, 2)}

---

Return ONLY valid JSON — no text outside it:
{
  "bullets": ["<bullet 1>", "<bullet 2>"]
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("portfolio-bullets error:", err);
    return Response.json({ error: "Could not generate bullets. Please try again." }, { status: 500 });
  }
}
