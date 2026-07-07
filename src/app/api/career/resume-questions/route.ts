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

  const prompt = isTargeted
    ? `You are a career coach helping a candidate improve their resume for a specific role they want to apply for. The candidate's current resume was scored against the role and came back weak. Your job is to uncover experience they may have that is not showing on the resume.

TARGET ROLE: ${targetRole.jobTitle} at ${targetRole.company}

GAPS IDENTIFIED IN THEIR CURRENT RESUME:
${gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}

THEIR CURRENT RESUME:
${resumeText.slice(0, 4000)}

Write 4 questions that probe whether the candidate has real experience behind each gap — experience they may have forgotten to include, did not know was relevant, or described in a way that did not surface in the analysis.

Rules:
1. Each question should reference a specific gap and ask whether they have done that kind of work, in any context, formal or informal, paid or unpaid.
2. Frame questions as discovery, not interrogation. "Have you done any work involving X, even in a side project or informal setting?" not "Prove you have done X."
3. If they say yes, encourage specifics: what tool, what outcome, what scale.
4. Do not ask about things already clearly evidenced on their resume.
5. Warm, conversational tone. Short sentences. No buzzwords.
6. Never use hyphens, em-dashes, or en-dashes. Write in plain English.

Return ONLY valid JSON:
{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>",
    "<question 4>"
  ],
  "firstImpression": "<2 sentences. Acknowledge what the resume does well. Then state plainly what the gap is between where they are and where this role needs them.>",
  "coachIntro": "<2 sentences. Tell them what you are doing and why — you are going to ask them about experience that may not be on the resume yet, because the analysis flagged some gaps. Warm and direct.>"
}`
    : `You are a BA career coach sitting with a client and reviewing their resume together. You need to ask 4 to 5 follow up questions to draw out the detail that will make their resume significantly stronger.

Read this resume carefully. Identify the gaps, vague claims, buried achievements, and missing context that are holding it back. Then write questions that feel like a natural conversation — warm, specific, and encouraging.

Each question must follow this structure:
1. A brief observation referencing something specific you noticed in their resume (acknowledge what is there)
2. The actual question — specific, targeted, not generic
3. Optional: a short line of encouragement or context (e.g. "Numbers or rough estimates are fine" or "This kind of detail is exactly what hiring managers look for")

Do not write generic questions like "what are your key achievements". Reference the actual content of the resume.
Do not use hyphens or em-dashes in the question text.
Write in first person as a coach speaking directly to the person.
Keep a warm, conversational tone throughout.
No buzzwords: delve, bolster, leverage, utilize, seamlessly, robust, impactful, synergy, holistic, foster, not only but also. Write like a real person, not a consultant.

Good questions surface:
- Quantifiable outcomes behind vague claims
- Tools or systems they used but did not name
- The BA work hidden inside non-BA job titles
- Achievements they undersold or left out entirely
- The type of role they are targeting next

RESUME:
${resumeText.slice(0, 4000)}

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    "<question 1 — observation + question + optional encouragement>",
    "<question 2>",
    "<question 3>",
    "<question 4>",
    "<question 5>"
  ],
  "firstImpression": "<2 to 3 sentences. Start with what is genuinely strong. Then name the single biggest issue holding this resume back. Be direct and honest but warm.>",
  "coachIntro": "<2 to 3 sentences introducing the questions. Sound like a coach who has just read the resume and is ready to work with the person.>"
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
