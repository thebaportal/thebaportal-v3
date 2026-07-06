import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jdText, resumeText, jobTitle, company, howToPosition, strengths } = await req.json();

  if (!jdText || !resumeText) {
    return Response.json({ error: "Job description and resume are required." }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are writing a short "Message to the Hiring Team" for a job application. This is NOT a cover letter. It goes in a text box on a job application portal. It should sound like a real person wrote it, not a system.

ROLE: ${jobTitle} at ${company}

JOB DESCRIPTION:
${(jdText as string).slice(0, 1500)}

CANDIDATE'S RESUME:
${(resumeText as string).slice(0, 3000)}

POSITIONING CONTEXT:
${howToPosition || ""}

CANDIDATE'S STRONGEST MATCHES:
${(strengths || []).slice(0, 3).join("\n")}

RULES — every one of these matters:
1. 3 to 4 sentences maximum. No more.
2. Lead with the single most relevant and specific thing from the resume that matches this role. Name the actual project, employer, or outcome.
3. Every claim must be something the candidate can defend in an interview. No vague language, no inflated claims.
4. No "I am excited to apply", no "I came across this opportunity", no "I believe I would be a great fit". These are filler phrases that say nothing.
5. No buzzwords. No "leverage", "synergy", "passionate", "driven", "results-oriented".
6. Do not restate the job title or company name back at them — they know what role they posted.
7. End with one forward-looking sentence that connects the candidate's trajectory to what this role is about. Keep it specific.
8. Write in first person. Conversational but professional. Short sentences.

Return ONLY a JSON object:
{
  "message": "<the 3-4 sentence message, plain text, no formatting>"
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const data = JSON.parse(match[0]);
    return Response.json({ message: data.message });
  } catch (err) {
    console.error("quick-message error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
