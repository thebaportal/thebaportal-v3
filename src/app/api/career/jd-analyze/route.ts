import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripEmDashes(obj: any): any {
  if (typeof obj === "string") {
    return obj
      .replace(/ — /g, ", ")
      .replace(/—/g, ", ")
      .replace(/ – /g, ", ")
      .replace(/–/g, ", ");
  }
  if (Array.isArray(obj)) return obj.map(stripEmDashes);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripEmDashes(v)]));
  }
  return obj;
}

function parseJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

export const maxDuration = 55;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { jdText, resumeText } = await req.json();

  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description too short to analyse." }, { status: 400 });
  }

  const hasResume = resumeText && resumeText.trim().length > 100;
  const jd = (jdText as string).slice(0, 3000);
  const resume = hasResume ? (resumeText as string).slice(0, 5000) : null;

  // ── Call 1: Analysis ────────────────────────────────────────────────────────
  // Scores, positioning, gaps, strengths, interview focus.
  // Temperature 0 — deterministic scoring.

  const analysisPrompt = `You are a senior career coach giving a candidate an honest, specific read on a job application.

FIRST — validate the input before doing anything else.

The JOB DESCRIPTION field must contain an actual job posting: a role with responsibilities, requirements, and qualifications from a company that is hiring. If the text looks like a resume, a cover letter, a news article, random text, or anything other than a job description, set "isValidJD" to false and return immediately with only the error fields. Do not fabricate a job description or attempt analysis on invalid input.

Signs the input is NOT a job description:
- It contains a person's name, contact information, or work history
- It reads like a list of past accomplishments rather than future responsibilities
- It lacks any hiring intent, role responsibilities, or candidate requirements
- It appears to be a resume pasted into the wrong field

JOB DESCRIPTION:
${jd}

${resume ? `CANDIDATE RESUME:\n${resume}` : "No resume provided."}

Write directly. Short sentences. No corporate language.
Do not use: em-dashes, en-dashes, "leverage", "utilize", "seamlessly", "robust", "impactful", "synergy", "holistic", "delve", "bolster", "tapestry", "testament", "foster", "granular", "not only but also", "hit the ground running", "at the end of the day".

Return ONLY valid JSON:
{
  "isValidJD": true,
  "jobTitle": "<exact job title from the JD>",
  "company": "<company name, or 'Not specified'>",
  "whatThisRoleIsAbout": "<2-3 sentences. What does this person actually do every day? Be specific.>",
  "whatTheyCareAbout": [
    "<most important requirement — specific, referenced to the JD>",
    "<second>",
    "<third>",
    "<fourth>",
    "<fifth>"
  ],
  "businessProblem": "<2-3 sentences. Why is this company hiring right now? What gap or pressure is driving it?>",
  "howToPosition": "<3-4 sentences of direct coaching advice. What to lead with, what angle to take, what to emphasise. Speak to the candidate directly.>",
  ${hasResume ? `"matchScore": <0-100 integer. Calibrated honestly: 80+ strong match apply now, 60-79 good fit with gaps, 40-59 partial match significant gaps, below 40 weak match>,
  "matchVerdict": "<one sentence. Name the strongest asset and the main thing pulling the score down. No filler.>",
  "baSkillsScore": <0-100>,
  "domainFitScore": <0-100>,
  "deliveryEvidenceScore": <0-100>,
  "resumeAlignment": {
    "strengths": ["<specific strength that matches a specific JD requirement — reference both>", "..."],
    "gaps": ["<gap 1 — be specific about what is missing and why it matters for this role>", "<gap 2>", "<gap 3 — list every real gap>"]
  },` : `"matchScore": null,
  "matchVerdict": null,
  "baSkillsScore": null,
  "domainFitScore": null,
  "deliveryEvidenceScore": null,
  "resumeAlignment": null,`}
  "interviewFocus": [
    "<the question or topic that will almost certainly come up — be specific about what they will probe>",
    "<second>",
    "<third>",
    "<fourth>"
  ]
}

If the input is NOT a valid job description, return this instead and nothing else:
{
  "isValidJD": false,
  "validationError": "<one plain sentence explaining what the input appears to be and what the user should paste instead>"
}`;

  let analysis: Record<string, unknown>;
  try {
    const r1 = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      temperature: 0,
      messages: [{ role: "user", content: analysisPrompt }],
    });
    const raw1 = r1.content[0].type === "text" ? r1.content[0].text : "";
    analysis = parseJSON(raw1);
    if (analysis.isValidJD === false) {
      return Response.json({ error: analysis.validationError || "The text in the Job Description field does not look like a job posting. Please paste the full job description from the company's career page or job board." }, { status: 400 });
    }
  } catch (err) {
    console.error("JD analysis call 1 error:", err);
    return Response.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }

  // ── Call 2: Editorial ───────────────────────────────────────────────────────
  // Bullet rewrites, removals, profile suggestion.
  // Only runs when a resume was provided.
  // Temperature 0.3 — more natural prose without drifting scores.

  if (hasResume && analysis.resumeAlignment) {
    const alignment = analysis.resumeAlignment as { gaps: string[]; strengths: string[] };
    const gaps = alignment.gaps ?? [];

    const editorialPrompt = `You are a senior recruiter reviewing a candidate's resume for a specific role. The gap analysis is done. Your job is NOT to fix everything — it is to fix only what the resume evidence actually supports.

ROLE: ${analysis.jobTitle} at ${analysis.company}

GAPS IDENTIFIED:
${gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}

CANDIDATE'S RESUME:
${resume}

JOB DESCRIPTION (for context):
${jd}

YOUR TASK — read these rules before writing a single word:

BULLET RULES:
1. For each gap, ask: does this resume contain real evidence that could address it? If YES, write a bullet. If NO, skip it entirely. Do not write a bullet to fill a gap the resume cannot support.
2. Never invent details. No tools, timeframes, methodologies, team sizes, ceremonies, or specifics that are not explicitly in the resume. If you add a detail that is not on the resume, you are putting words in the candidate's mouth and they will be caught in an interview.
3. Bullets: 20 words maximum. Strong past-tense verb. Lead with outcome or scope. No comma-chained task lists.
4. For each bullet: does a weak version already exist (REPLACE) or is it completely absent (ADD)?
   - REPLACE: set type to "replace", set replaces to the first 6-8 words of the existing bullet verbatim.
   - ADD: set type to "add", set replaces to null.
5. If the existing bullet is already accurate and clear for this role, do not replace it. Only suggest a replacement if the current version is materially weaker.
6. Maximum 4 bullets total. Prioritise the gaps that most hurt this application. Leave the rest.
7. Never write a bullet for the professional summary. That is handled separately.

REMOVAL RULES:
8. Only flag content that actively signals the wrong background for this role. If it is irrelevant but harmless, leave it alone.

SUMMARY RULES:
9. Only rewrite the summary if it is genuinely weak or misaligned for this role. If it is honest and readable, return it unchanged with a note that it does not need revision.
10. Write what is TRUE about the person, not what the JD says they need. Do not mirror JD language.
11. Sentence 1: who they are and their clearest credential. Sentence 2: the one thing that sets them apart — specific, not generic. Sentence 3 (optional): bare credentials only.
12. No adjectives about the person. No "seasoned", "results-driven", "accomplished", "passionate", "dedicated".
13. Never use: "targeting", "seeking", "passionate about", "driven professional", "full-lifecycle", "stakeholder management", "working knowledge", or any JD phrase.
14. Maximum 50 words. Short sentences. No em-dashes. No buzzwords.

Return ONLY valid JSON:
{
  "suggestedBullets": [
    {
      "where": "<job title and employer from the resume>",
      "type": "replace" | "add",
      "replaces": "<first 6-8 words of the existing bullet verbatim, or null>",
      "bullet": "<20 words max. Verb. Outcome. Only details that are in the resume.>"
    }
  ],
  "suggestedRemovals": [
    {
      "where": "<section name or role title>",
      "what": "<first 6-8 words of what to remove>",
      "reason": "<one sentence — why this actively hurts the application>"
    }
  ],
  "profileSuggestion": {
    "current": "<first 8-10 words of the existing summary, or 'Not present'>",
    "needsRevision": true | false,
    "suggested": "<rewritten summary only if needsRevision is true, otherwise null. Max 50 words. 2-3 short sentences. One memorable hook. No JD mirroring. No adjectives. Credentials last.>"
  }
}`;

    try {
      const r2 = await ai.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        temperature: 0.3,
        messages: [{ role: "user", content: editorialPrompt }],
      });
      const raw2 = r2.content[0].type === "text" ? r2.content[0].text : "";
      const editorial = parseJSON(raw2);

      const ra = analysis.resumeAlignment as Record<string, unknown>;
      ra.suggestedBullets = editorial.suggestedBullets ?? [];
      ra.suggestedRemovals = editorial.suggestedRemovals ?? [];
      ra.profileSuggestion = editorial.profileSuggestion ?? null;
    } catch (err) {
      // Editorial call failed — return analysis without editorial rather than failing entirely
      console.error("JD analysis call 2 error:", err);
      const ra = analysis.resumeAlignment as Record<string, unknown>;
      ra.suggestedBullets = [];
      ra.suggestedRemovals = [];
      ra.profileSuggestion = null;
    }
  }

  return Response.json({ analysis: stripEmDashes(analysis) });
}
