import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { gap, resumeText, jdText, jobTitle, company, userAnswer } = await req.json();

  if (!gap || !resumeText || !jdText) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  const rules = `Never use em-dashes, hyphens connecting clauses, or dashes as asides. Write like a real person. Short sentences.`;

  // Phase 1 — generate the coaching question
  if (!userAnswer) {
    const prompt = `You are a career coach helping someone work through a gap in their resume for a specific job.

GAP IDENTIFIED: ${gap}
ROLE: ${jobTitle} at ${company}
THEIR RESUME:
${resumeText.slice(0, 4000)}

Write ONE direct, specific question to find out whether they have real experience that could address this gap. Ask for a concrete example or situation. Warm but direct. Not a yes/no question. Reference the specific gap. ${rules}

Return ONLY valid JSON:
{ "question": "<one specific coaching question>" }`;

    try {
      const r = await ai.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = r.content[0].type === "text" ? r.content[0].text : "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON");
      return Response.json(JSON.parse(match[0]));
    } catch {
      return Response.json({ error: "Could not generate question." }, { status: 500 });
    }
  }

  // Phase 2 — process the answer, generate bullet or interview prep
  const prompt = `You are a career coach reviewing a candidate's answer about a gap in their resume.

THE GAP: ${gap}
THE ROLE: ${jobTitle} at ${company}
THEIR RESUME:
${resumeText.slice(0, 4000)}

THEIR ANSWER: ${userAnswer}

Does their answer contain real, specific experience that could become a resume bullet?

Rules:
1. If YES and the answer is concrete: write a bullet (20 words max, strong verb, outcome-led, only details they mentioned — never invent anything not in their answer or resume).
2. If NO or too vague: this is a real gap. Write interview prep instead.
3. For bullets: identify which role on their resume this belongs to.
4. For interview prep: write the specific question they will likely be asked, and a direct 2 to 3 sentence framework for answering honestly without being defensive.
5. ${rules}

Return ONLY valid JSON:
{
  "type": "bullet",
  "bullet": "<20 words max>",
  "where": "<Job title and employer from their resume>"
}
OR
{
  "type": "interview_prep",
  "interviewPrep": {
    "likelyQuestion": "<the specific question they will be asked>",
    "framework": "<direct coaching on how to answer honestly — 2 to 3 sentences>"
  }
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return Response.json(JSON.parse(match[0]));
  } catch {
    return Response.json({ error: "Could not process your answer." }, { status: 500 });
  }
}
