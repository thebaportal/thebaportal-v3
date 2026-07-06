import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { resumeText, jdText } = await req.json();

  const prompt = `You are a career coach doing a quick compatibility check between a resume and a job description.

RESUME (excerpt):
${(resumeText as string).slice(0, 1500)}

JOB DESCRIPTION (excerpt):
${(jdText as string).slice(0, 1500)}

Assess domain and skills fit only. Be honest and direct. A supply chain analyst applying to a fintech payments role is a genuine mismatch. A BA from banking applying to a BA role in energy is a reasonable stretch, not a mismatch.

Return ONLY valid JSON — no text outside it:
{
  "score": <integer 0-100. Overall match between this resume and this JD>,
  "mismatch": <true only if score is below 40 — genuinely wrong domain, wrong function, or wrong level>,
  "resumeSummary": "<6 words max: what this person actually does>",
  "roleSummary": "<6 words max: what this role actually needs>",
  "explanation": "<1-2 plain English sentences explaining why they don't match. Be direct, not diplomatic.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 250,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch {
    // On any failure, return no mismatch — fail open so a bad check never blocks a user
    return Response.json({ score: 60, mismatch: false });
  }
}
