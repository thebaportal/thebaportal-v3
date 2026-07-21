import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;


export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { resumeText, targetRole, gaps } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text too short to analyse." }, { status: 400 });
  }

  const isTargeted = targetRole && gaps && gaps.length > 0;

  const sharedRules = `Never use em-dashes, en-dashes, hyphens connecting clauses, or dashes as asides. If you would write "X — Y", write two sentences instead. No buzzwords. Write like a real person.`;

  const prompt = isTargeted
    ? `You are a career coach helping a candidate improve their resume for a specific role they want to apply for. The candidate's current resume was scored against the role and came back weak. Your job is to uncover experience they may have that is not showing on the resume.

TARGET ROLE: ${targetRole.jobTitle} at ${targetRole.company}

GAPS IDENTIFIED IN THEIR CURRENT RESUME:
${gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}

THEIR CURRENT RESUME:
${resumeText.slice(0, 4000)}

Write 4 questions that probe whether the candidate has real experience behind each gap.

Rules:
1. Each question references a specific gap and asks whether they have done that kind of work, in any context.
2. Frame as discovery, not interrogation.
3. Encourage specifics: what tool, what outcome, what scale.
4. Do not ask about things already clearly evidenced on their resume.
5. Warm, conversational tone. Short sentences.
6. ${sharedRules}

Return ONLY valid JSON:
{
  "questions": ["<question 1>", "<question 2>", "<question 3>", "<question 4>"],
  "strengths": ["<2 to 3 specific things the resume does well>"],
  "biggestGap": "<one focused sentence naming the single gap between where they are and what this role needs. No em-dashes.>",
  "coachIntro": "<one sentence only. Tell them you have read the resume and want to ask a few questions to uncover experience not yet on the page. Warm and direct.>"
}`
    : `You are a BA career coach reviewing a client's resume. Ask 4 to 5 follow-up questions to draw out the detail that will make their resume significantly stronger.

Read this resume carefully. Identify gaps, vague claims, buried achievements, and missing context. Write questions that feel like a natural conversation — warm, specific, encouraging.

Each question: a brief observation from their resume, then the specific question, then optional encouragement.

Do not write generic questions. Reference the actual resume content.
Write in first person as a coach speaking directly to the person.
${sharedRules}

Good questions surface:
- Quantifiable outcomes behind vague claims
- Tools or systems they used but did not name
- BA work hidden inside non-BA job titles
- Achievements they undersold or left out
- The type of role they are targeting next

RESUME:
${resumeText.slice(0, 4000)}

Return ONLY valid JSON:
{
  "questions": ["<question 1>", "<question 2>", "<question 3>", "<question 4>", "<question 5>"],
  "strengths": ["<2 to 3 specific things the resume does well — be concrete, not generic>"],
  "biggestGap": "<one focused sentence naming the single biggest issue holding this resume back. Direct and honest. No em-dashes.>",
  "coachIntro": "<one sentence only. Something like: I have read your resume and want to ask a few quick questions to surface what is not on the page yet.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Resume questions error:", err);
    return Response.json({ error: "Could not analyse your resume. Please try again." }, { status: 500 });
  }
}
