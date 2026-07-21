import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;


export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { jdText, company, resumeText, gaps, interviewFocus } = await req.json();
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const resumeSection = resumeText && resumeText.length > 100
    ? `\nCANDIDATE RESUME:\n${resumeText.slice(0, 2000)}`
    : "";

  const gapsSection = Array.isArray(gaps) && gaps.length > 0
    ? `\nKNOWN GAPS TO PROBE (questions must directly address these — this is what the candidate needs to prepare for):\n${gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}`
    : "";

  const focusSection = Array.isArray(interviewFocus) && interviewFocus.length > 0
    ? `\nLIKELY INTERVIEW FOCUS (questions the interviewer will almost certainly ask):\n${interviewFocus.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  const prompt = `You are preparing a candidate for a real interview for ${company ? `${company}` : "this role"}. Generate realistic, specific interview questions.

JOB DESCRIPTION:
${jdText.slice(0, 2500)}
${resumeSection}
${gapsSection}
${focusSection}

Rules:
- If gaps are provided, include at least one question per gap — these are the areas the candidate must prepare for
- If interview focus areas are provided, turn them into direct questions
- Make every question specific to this role and this candidate's background — no generic "tell me about yourself"
- Mix categories: behavioral, technical, situational, and role-specific process questions
- Generate 8 to 12 questions total

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "<the interview question>",
      "category": "behavioral" | "technical" | "situational" | "process",
      "hint": "<what a strong answer includes — one sentence, not shown until after they answer>"
    }
  ],
  "roleContext": "<1-2 sentences on what this interview will focus on and what the interviewer is really trying to find out>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Interview questions error:", err);
    return Response.json({ error: "Could not generate questions. Please try again." }, { status: 500 });
  }
}
