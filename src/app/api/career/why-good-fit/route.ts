import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jdText, resumeText, jobTitle, company, howToPosition, strengths, gaps } = await req.json();
  if (!jdText || !resumeText) {
    return Response.json({ error: "Job description and resume are required." }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are writing an answer to the application question "Why would you be a good fit for this position?" for a real candidate submitting a job application.

ROLE: ${jobTitle} at ${company}

JOB DESCRIPTION:
${(jdText as string).slice(0, 1500)}

CANDIDATE RESUME:
${(resumeText as string).slice(0, 3000)}

POSITIONING CONTEXT:
${howToPosition || ""}

STRONGEST MATCHES:
${(strengths || []).slice(0, 4).join("\n")}

GAPS TO ACKNOWLEDGE (if relevant):
${(gaps || []).slice(0, 2).join("\n")}

RULES:
1. 4 to 5 sentences. This is a form field answer, not a cover letter.
2. Lead with the single most specific and relevant match between the candidate's background and this role. Name the actual employer, commodity type, or outcome. Do not open with "I" as the first word.
3. Each sentence must be specific to this candidate and this role. Nothing generic.
4. Do not say "I am a good fit", "I believe I would excel", "I am passionate", "I am excited", "results-driven", or any self-assessment language. Show the fit through specific facts.
5. Never use em-dashes, en-dashes, or hyphens to connect clauses. Use plain punctuation. Write two sentences instead of one long connected one.
6. Do not add an aspirational closing about career goals or what the candidate hopes to achieve. State the case and stop.
7. Sound like a competent professional who typed this directly into a form field. Not polished corporate prose, not casual. Direct and confident.
8. If there is a real gap, a brief honest acknowledgement followed by a bridge is better than pretending the gap does not exist.

Return ONLY valid JSON:
{
  "answer": "<the 4-5 sentence answer, plain text>"
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const data = JSON.parse(match[0]);
    return Response.json({ answer: data.answer });
  } catch (err) {
    console.error("why-good-fit error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
