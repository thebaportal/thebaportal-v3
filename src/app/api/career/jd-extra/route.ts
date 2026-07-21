import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jdText, resumeText, extraDetails, gaps, strengths, jobTitle, company } = await req.json();
  if (!extraDetails || extraDetails.trim().length < 10) {
    return Response.json({ error: "Please add some detail before factoring in." }, { status: 400 });
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `A candidate is applying for ${jobTitle} at ${company}. They have already received an analysis of their resume against the job description. They are now volunteering additional information that was not on their resume.

JOB DESCRIPTION:
${(jdText as string).slice(0, 1500)}

RESUME (already analysed):
${(resumeText as string).slice(0, 2000)}

IDENTIFIED GAPS (from prior analysis):
${(gaps as string[] || []).join("\n")}

IDENTIFIED STRENGTHS (from prior analysis):
${(strengths as string[] || []).join("\n")}

ADDITIONAL INFORMATION THE CANDIDATE IS NOW SHARING:
${extraDetails}

Your job: assess this additional information specifically. Do not re-analyse the whole resume.

CRITICAL VOICE RULE: Write directly to the candidate using "you" and "your" throughout. Never write "the candidate" or refer to the person in third person. You are a coach speaking to them, not a system generating a report about them.

RULES:
- Speak directly: "Your credential..." not "The candidate's credential..."
- Be direct and specific. Reference the actual words they wrote.
- Only mention gaps it closes if it genuinely closes them. Do not stretch.
- If it does not close any gap or add any strength, say so honestly and explain why.
- If the information is unclear or ambiguous, ask them to clarify — but address that to them directly: "Before using this, clarify..." not "The candidate should clarify..."
- Never use em-dashes, en-dashes, or hyphens to connect clauses.
- No buzzwords: leverage, synergy, robust, impactful, seamlessly, spearheaded.
- Short sentences. Plain English.

Return ONLY valid JSON:
{
  "verdict": "<1-2 sentences spoken directly to the candidate. Does this strengthen the application? Be honest. Use 'you' not 'the candidate'.>",
  "gapsAddressed": ["<gap from the list that this closes or partially closes — only if genuine>"],
  "positioningNote": "<Spoken directly to the candidate. How to use this — cover letter, interview, resume bullet? If clarification is needed first, say so directly to them. 2-3 sentences.>",
  "resumeBullet": "<A ready-to-copy resume bullet. Only include if the detail is strong enough. Otherwise null.>"
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const data = JSON.parse(match[0]);
    return Response.json(data);
  } catch (err) {
    console.error("jd-extra error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
