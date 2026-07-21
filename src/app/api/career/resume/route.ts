import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sectionsToPlainText(c: Record<string, any>, fullName: string): string {
  const lines: string[] = [];
  if (fullName) { lines.push(fullName); lines.push(""); }
  if (c.professionalSummary) { lines.push("PROFESSIONAL SUMMARY"); lines.push(c.professionalSummary); lines.push(""); }
  if (Array.isArray(c.coreCompetencies) && c.coreCompetencies.length) {
    lines.push("CORE COMPETENCIES");
    c.coreCompetencies.forEach((s: string) => lines.push(`• ${s}`));
    lines.push("");
  }
  if (Array.isArray(c.keyAchievements) && c.keyAchievements.length) {
    lines.push("KEY ACHIEVEMENTS");
    c.keyAchievements.forEach((s: string) => lines.push(`• ${s}`));
    lines.push("");
  }
  if (c.experienceBullets && typeof c.experienceBullets === "object") {
    lines.push("PROFESSIONAL EXPERIENCE"); lines.push("");
    for (const [role, bullets] of Object.entries(c.experienceBullets as Record<string, string[]>)) {
      lines.push(role);
      bullets.forEach((b: string) => lines.push(`• ${b}`));
      lines.push("");
    }
  }
  if (c.education) { lines.push("EDUCATION"); lines.push(c.education as string); lines.push(""); }
  if (c.certifications) { lines.push("CERTIFICATIONS"); lines.push(c.certifications as string); }
  return lines.join("\n");
}

export const maxDuration = 30;


export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { resumeText, questions, answers, fullName, jdContext } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }

  const qaBlock = (questions as string[])
    .map((q: string, i: number) => `Q: ${q}\nA: ${(answers as string[])[i] || "(no answer)"}`)
    .join("\n\n");

  const roleBlock = jdContext
    ? `TARGET ROLE: ${jdContext.jobTitle || ""}${jdContext.company ? ` at ${jdContext.company}` : ""}
IDENTIFIED GAPS FROM JD ANALYSIS: ${(jdContext.gaps ?? []).join("; ")}
WHAT THE INTERVIEWER WILL FOCUS ON: ${(jdContext.interviewFocus ?? []).join("; ")}`
    : "";

  const prompt = `You are editing a real person's resume after a coaching conversation. Your job is to make it read like the candidate sat down and improved it themselves — not like an AI rewrote it.

ORIGINAL RESUME:
${resumeText.slice(0, 4000)}

COACHING Q&A (this is new experience the candidate revealed — use it):
${qaBlock}
${roleBlock ? `\n${roleBlock}` : ""}

RULES — read every one before writing a single word:

VOICE:
- Write how an experienced professional would actually say this out loud in an interview. Short, direct, real.
- Do NOT apply the same formula to every bullet. "Action verb + what you did + business impact" on every line is an AI pattern. A real resume has variety.
- Mix bullet lengths. Some bullets are 10 words. Some are 18. A few can be longer when the work genuinely warrants it. Never make them all the same.
- If a bullet is already good in the original resume, keep it or make only small changes.
- BANNED FRAMEWORK LANGUAGE — never use: "two-tier system", "three-signal", "multi-signal", "hybrid model", "forward-buy model", "break-even model", "triage decision", "conditional order", "demand floor", or any phrase that sounds like a named methodology. Replace with plain English describing what actually happened.

BANNED WORDS — never use any of these:
proactively, leveraged, cross-functional, driven, sustained, validated, streamlined (unless the candidate used it), operational outcomes, commercial consequences, margin-sensitive, margin-thin, high-volatility, holistic, robust, seamlessly, impactful, synergy, actionable, spearheaded, demonstrated, "proven ability", "proven track record", "equally comfortable in", "fast-moving environments", "end-to-end" (unless referring to a literal procurement cycle the candidate ran).

METRICS:
- Only include a number when the candidate mentioned it specifically in their resume or coaching answers.
- Not every bullet needs a metric. Most should not have one.

SUMMARY:
${roleBlock ? `- This resume is targeting a specific role. The summary must connect the candidate's full background — including any experience surfaced in the coaching answers — to what that role requires.
- Lead with who they are across their full career, then name the most relevant experience for this role specifically.
- Write 3 to 4 sentences. Plain language. No adjectives about the person ("experienced", "skilled", "accomplished").
- Do not start with "Procurement specialist" if the coaching answers revealed directly relevant experience for the target role — lead with the fuller picture instead.` : `- 2 to 3 sentences. Plain language. Write it as if the candidate typed it in 5 minutes.
- State who they are and what they bring. No adjectives about the person.`}

NEW EXPERIENCE FROM COACHING:
- If the coaching answers describe work at an employer NOT on the original resume, add it as a new role in experienceBullets with the correct title and employer name.
- Write those bullets in plain interview language — describe what they actually did, not the system they built. "Ordered stock for daily perishable production" not "managed a demand-driven replenishment model."
- That new experience should also inform the professional summary.

CORE COMPETENCIES:
- List 8 to 10 genuine competencies this candidate actually has based on the resume and coaching answers.
- Do not pad the list.

KEY ACHIEVEMENTS:
- Only include things NOT already clear from the experience bullets.
- If the same story appears in both Key Achievements and experience bullets, remove it from Key Achievements.
- If there is nothing genuinely new to say, return an empty array.
- Maximum 3 items.

EDUCATION:
- Copy education exactly as it appears in the original resume.

CERTIFICATIONS:
- List only certifications named in the original resume or explicitly mentioned in coaching answers.
- If none are confirmed, return null.

CONTENT:
- Do not invent jobs, employers, tools, systems, or metrics not in the original resume or coaching answers.
- No meta-commentary or editor notes in any field.
- Never use em-dashes, en-dashes, or hyphens connecting clauses.

Return ONLY valid JSON:
{
  "professionalSummary": "<plain language, connects full background to target role>",
  "coreCompetencies": ["<8-10 genuine competencies>"],
  "experienceBullets": {
    "<Job Title | Employer>": [
      "<bullet — plain language, varied length, no framework terminology>",
      "<another bullet>"
    ]
  },
  "keyAchievements": ["<only if genuinely different from experience bullets — or empty array>"],
  "education": "<copied exactly from original resume>",
  "certifications": "<confirmed certifications only, or null>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const sections = JSON.parse(jsonMatch[0]);
    const plainText = sectionsToPlainText(sections, fullName || "");
    return Response.json({ sections, plainText, name: fullName || "" });
  } catch (err) {
    console.error("Resume improvement error:", err);
    return Response.json({ error: "Could not improve your resume. Please try again." }, { status: 500 });
  }
}
