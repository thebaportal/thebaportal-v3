import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;


export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { resumeText, jdText } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const prompt = `You are a career coach preparing to write a cover letter for a client. Before writing, you need 2 to 3 pieces of information the resume does not already show.

Look at the resume and job description. Ask questions that surface things you cannot see on paper:
- A specific project, moment, or result that directly matches what this role needs
- Something about this company specifically that the candidate can speak to concretely — not "I am excited about your mission" but a real reason this employer and not another
- A context detail that explains something on the resume that might look weak or unclear to a screener

NEVER ask any version of "Why do you think you would be a good fit?" That answer is already implied by the fact they are applying, and it produces generic self-promotional text that makes letters worse. Do not ask about career goals, aspirations, or what they hope to achieve. Do not ask them to summarise their experience — you can read it.

Each question must be specific to this role and this resume. If the question could be asked of any candidate for any job, it is the wrong question.

Keep questions short and direct. One sentence each.
Never use em-dashes, en-dashes, or hyphens to connect clauses. Write two sentences instead.
Plain everyday English. No buzzwords.

RESUME:
${resumeText.slice(0, 3000)}

JOB DESCRIPTION:
${jdText.slice(0, 2000)}

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>",
    "<question 4>"
  ],
  "jdSummary": "<one sentence: what this role actually needs in a candidate, in plain English>"
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
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Cover letter questions error:", err);
    return Response.json({ error: "Could not generate questions. Please try again." }, { status: 500 });
  }
}
