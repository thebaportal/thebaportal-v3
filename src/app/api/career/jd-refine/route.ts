import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

function parseJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

export const maxDuration = 55;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { additionalContext, jdText, resumeText, gaps, jobTitle, company } = await req.json();

  if (!additionalContext || additionalContext.trim().length < 10) {
    return Response.json({ error: "Please add some context first." }, { status: 400 });
  }
  if (!gaps || gaps.length === 0) {
    return Response.json({ error: "No gaps to evaluate against." }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a senior recruiter re-evaluating a candidate's fit for a role after they have shared additional context that is not on their resume.

ROLE: ${jobTitle} at ${company}

JOB DESCRIPTION:
${(jdText as string).slice(0, 2500)}

${resumeText ? `CANDIDATE'S RESUME:\n${(resumeText as string).slice(0, 3000)}\n` : ""}

GAPS IDENTIFIED IN THE ORIGINAL ANALYSIS (indexed 0 to ${gaps.length - 1}):
${(gaps as string[]).map((g: string, i: number) => `${i}. ${g}`).join("\n")}

ADDITIONAL CONTEXT THE CANDIDATE HAS NOW SHARED:
${additionalContext}

YOUR JOB:
1. For each gap, decide whether the additional context closes it, partially addresses it, or leaves it unchanged.
2. Write any new resume bullets that capture the additional experience. These should be specific, past-tense, 20 words maximum, strong verb first. Only write bullets if the experience genuinely warrants one.
3. Rewrite the professional summary to incorporate the additional context IF it meaningfully changes the candidate's positioning. If it does not, keep the summary focused on what was already strong. Max 50 words, 2-3 short sentences. No adjectives. No JD mirroring. One memorable hook.

WRITING RULES:
- Bullets: 20 words max. Strong past-tense verb. Outcome or scope first. No comma lists.
- Summary: max 50 words. Lead with the one thing that makes this candidate memorable. Credentials last if strong. No "seeking", "passionate", "full-lifecycle", "stakeholder management", or JD phrases.
- Be honest. If the additional context does not actually close a gap, say so.

Return ONLY valid JSON:
{
  "gapUpdates": [
    {
      "index": <number — the gap index from the list above>,
      "status": "closed" | "partial" | "unchanged",
      "note": "<one sentence explaining how the context affects this gap, or null if unchanged>"
    }
  ],
  "newBullets": [
    {
      "where": "<section name and employer or project name>",
      "bullet": "<20 words max. Verb. Outcome. One detail.>",
      "type": "add"
    }
  ],
  "updatedProfile": "<rewritten summary, or null if the additional context does not meaningfully change the positioning>"
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const data = parseJSON(raw);
    return Response.json(data);
  } catch (err) {
    console.error("jd-refine error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
