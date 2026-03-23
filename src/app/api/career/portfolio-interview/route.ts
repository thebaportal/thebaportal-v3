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

  const prompt = `Turn this case study into a clear interview answer.

Structure:
- Situation
- Action
- Result

Keep it natural and easy to speak. Write in first person.

Do not invent unrealistic metrics.
If impact is unclear, state realistic qualitative outcomes.

---

INPUT:
${JSON.stringify(caseStudy, null, 2)}

---

Return ONLY valid JSON — no text outside it:
{
  "answer": "<full SAR answer written naturally, as if spoken in an interview>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("portfolio-interview error:", err);
    return Response.json({ error: "Could not generate interview answer. Please try again." }, { status: 500 });
  }
}
