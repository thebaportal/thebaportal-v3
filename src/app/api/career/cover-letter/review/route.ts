import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { coverLetter, jdText, resumeText } = await req.json();
  if (!coverLetter || coverLetter.trim().length < 50) {
    return Response.json({ error: "Cover letter is required." }, { status: 400 });
  }
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const resumeBlock = resumeText && resumeText.trim().length > 100
    ? `\nCANDIDATE RESUME (use to check alignment):\n${resumeText.slice(0, 3000)}`
    : "";

  const prompt = `You are a senior career coach reviewing a candidate's cover letter. Your job is to give honest, specific feedback that helps them improve — not to rewrite the letter for them.

THE GOLDEN RULE: Preserve the candidate's voice. When suggesting a rewrite, match their sentence rhythm, vocabulary, and tone exactly. Do not make it more formal, more polished, or more corporate. Fix only the specific problem. Reuse their words wherever possible. A good fix sounds like them on a better day, not like a different person.

WRITING RULES — apply to every field including feedback and rewrites:
- Never use em dashes, en dashes, or hyphens to connect clauses. Use plain punctuation only.
- Never use: "leverage", "utilize", "seamlessly", "robust", "impactful", "synergy", "holistic", "delve", "bolster", "tapestry", "spearheaded", "proactively", "cross-functional".
- Write short, direct sentences. Vary sentence length. Do not over-explain.

COVER LETTER:
${coverLetter.slice(0, 3000)}

JOB DESCRIPTION:
${jdText.slice(0, 2000)}
${resumeBlock}

Identify the natural sections of this letter (opening, body paragraphs, closing). Analyse each one.

For each section:
- "strong": it is working well — say specifically why
- "needs-work": it has a fixable problem — say exactly what it is, then suggest a targeted rewrite that preserves their voice
- "cut": this paragraph adds no value or actively hurts the application — say why clearly

Return ONLY valid JSON:
{
  "verdict": "<1-2 sentences. Honest overall read. What is the letter's biggest strength and its single most important problem?>",
  "topStrength": "<The one thing this letter does best — be specific, reference actual content>",
  "topFix": "<The single most important thing to change before sending — specific and actionable>",
  "sections": [
    {
      "label": "<Opening / Second paragraph / Third paragraph / Closing — describe naturally>",
      "original": "<exact text of this section from the letter>",
      "status": "strong" | "needs-work" | "cut",
      "feedback": "<specific feedback — what works or what is wrong. 1-3 sentences. Reference actual words from the letter.>",
      "rewrite": "<only include this field if status is needs-work. Write a targeted fix that sounds like the candidate, not like an AI. Match their tone and vocabulary. Fix only the identified problem.>"
    }
  ],
  "missing": [
    "<something the JD specifically requires or values that the letter never addresses — be specific about what is missing and why it matters>"
  ]
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (err) {
    console.error("Cover letter review error:", err);
    return Response.json({ error: "Could not review your cover letter. Please try again." }, { status: 500 });
  }
}
