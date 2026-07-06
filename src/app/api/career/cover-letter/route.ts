import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { resumeText, jdText, questions, answers, analysisContext } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const qaBlock = (questions as string[] || [])
    .map((q: string, i: number) => `Q: ${q}\nA: ${(answers as string[] || [])[i] || "(no answer)"}`)
    .join("\n\n");

  const contextBlock = analysisContext ? `
POSITIONING INTELLIGENCE (from prior JD analysis — use this to guide the letter strategy):
${analysisContext.matchVerdict ? `Overall verdict: ${analysisContext.matchVerdict}` : ""}
${analysisContext.howToPosition ? `How to position this candidate: ${analysisContext.howToPosition}` : ""}
${analysisContext.strengths?.length ? `Key strengths to lead with:\n${(analysisContext.strengths as string[]).map((s: string) => `- ${s}`).join("\n")}` : ""}
` : "";

  const prompt = `You are a senior BA career coach writing a cover letter for a client. Use the resume, job description, and coaching answers to write a cover letter that feels personal, credible, and targeted — not like a template.

RESUME:
${resumeText.slice(0, 2500)}

JOB DESCRIPTION:
${jdText.slice(0, 1500)}

COACHING ANSWERS (use these to personalise the letter):
${qaBlock || "(none provided — write from resume and JD only)"}
${contextBlock}

Write a strong four-paragraph cover letter. Rules:
- Do NOT start with "I am writing to apply for"
- Every paragraph must earn its place — no filler
- Use specific language from both their resume and the JD
- Sound like a confident professional, not a textbook
- Reference their actual experience, not hypothetical skills
- No em-dashes. No buzzwords: delve, bolster, leverage, utilize, seamlessly, robust, impactful, synergy, holistic, foster, tapestry, vibrant, testament, granular, not only but also
- Vary sentence length. Short sentences hit harder. Write like a person, not a consultant

Return ONLY valid JSON — no text outside it:
{
  "jobTitle": "<job title from the JD>",
  "company": "<company name from the JD, or 'the organisation' if unclear>",
  "opening": "<First paragraph — hook that immediately shows value and fit. 3-4 sentences.>",
  "body1": "<Second paragraph — most relevant experience directly mapped to the role's core need. Be specific. 3-4 sentences.>",
  "body2": "<Third paragraph — a second strength or achievement that adds dimension. Use coaching answers. 3-4 sentences.>",
  "closing": "<Fourth paragraph — confident close, genuine interest, clear call to action. 2-3 sentences. No sycophancy.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const letter = JSON.parse(jsonMatch[0]);
    return Response.json(letter);
  } catch (err) {
    console.error("Cover letter error:", err);
    return Response.json({ error: "Could not generate cover letter. Please try again." }, { status: 500 });
  }
}
