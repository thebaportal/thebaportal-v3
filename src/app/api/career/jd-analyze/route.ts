import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

// Matches: "...2023, Present" or "...2014, June 2022" — replaces comma with "to"
const DATE_COMMA_RE = /(\b\d{4}), (Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/g;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixDateCommas(obj: any): any {
  if (typeof obj === "string") return obj.replace(DATE_COMMA_RE, "$1 to $2");
  if (Array.isArray(obj)) return obj.map(fixDateCommas);
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fixDateCommas(v)]));
  return obj;
}

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

// Shared preamble injected into every Career Suite prompt.
// Applies to cover letters, fit answers, interview prep — not just the JD analyser.
const GROUNDING_PREAMBLE = `FOUNDATIONAL RULE — every word of every output:
Maximize useful reasoning. Minimize invented certainty. When evidence is missing, expose the uncertainty instead of filling the gap with plausible-sounding content. Every factual claim must trace back to the source material provided. If a claim is not directly stated in the source, label it as an inference. If it cannot be traced at all, omit it. A confident-sounding claim that is not grounded in the source is worse than no claim — it puts false information in someone's mouth in a real interview or application.`;

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
  const JD_LIMIT = 10000;
  const jdTruncated = (jdText as string).length > JD_LIMIT;
  const jd = (jdText as string).slice(0, JD_LIMIT);
  const resume = hasResume ? (resumeText as string).slice(0, 9000) : null;

  // ── Call 1: Analysis ────────────────────────────────────────────────────────
  // Scores, positioning, gaps, strengths, interview focus.
  // Temperature 0 — deterministic scoring.

  const analysisPrompt = `You are helping someone tailor their resume for a specific job. Your job is to produce exact resume changes, not a career report.

${GROUNDING_PREAMBLE}

SCOPE RULE — read before doing anything: The user wants a tailored resume. They do not want salary advice, company analysis, career level commentary, or interview coaching unless they ask. Produce only what is listed below. Stop when it is done.

FIRST — validate the input.
If the JOB DESCRIPTION field is not an actual job posting (contains a resume, random text, news article, etc.) set isValidJD to false and stop. Do not attempt analysis.

Signs it is NOT a job description:
- Contains a person's name, contact info, or work history
- Reads like past accomplishments, not future responsibilities
- No hiring intent or candidate requirements

JOB DESCRIPTION:
${jd}

${resume ? `CANDIDATE RESUME:\n${resume}` : "No resume provided."}

Write directly. Short sentences. No corporate language. No dashes of any kind.
Banned words: leverage, utilize, seamlessly, robust, impactful, synergy, holistic, delve, bolster, tapestry, testament, foster, granular.

${hasResume ? `GAP RULES — apply before writing any gap:
1. TRANSFERABLE DOMAINS: Reason about what transfers. Oil sands = mining. Turnaround support = site operations. Construction procurement = capital project procurement. If the resume shows an adjacent domain, name the exact distinction, not a blanket absence.
2. VISIBILITY VS EXPERIENCE: Is the gap about what the resume fails to show, or what the candidate genuinely lacks? A visibility gap is a framing fix. An experience gap cannot be fixed by rewording. Label them correctly.
3. MAX 3 GAPS. Rank by how much each hurts the application. Omit noise — minor admin items, easily assumed facts.` : ""}

Return ONLY valid JSON:
{
  "isValidJD": true,
  "jobTitle": "<exact job title>",
  "company": "<company name or 'Not specified'>",
  "decision": "<one sentence. Direct verdict. e.g. 'Good fit — tailor the resume before applying.' or 'Strong fit — apply now.' or 'Significant gaps — address these before applying.' or 'Weak fit — consider other roles.'>",
  ${hasResume ? `"matchScore": <0-100. 80+ apply now, 60-79 good with gaps, 40-59 partial, below 40 weak>,
  "strengths": [
    "<strongest match — one line. Name the resume evidence and the JD requirement it addresses.>",
    "<second>",
    "<third>"
  ],
  "gaps": [
    {
      "text": "<what is missing or not visible — one line, specific>",
      "type": "visibility" | "experience",
      "difficulty": "easy" | "moderate" | "hard"
    }
  ],
  "resumeAlignment": { "strengths": [], "gaps": [] },` : `"matchScore": null,
  "strengths": [],
  "gaps": [],
  "resumeAlignment": null,`}
  "howToPosition": "<2-3 sentences of direct coaching. What to lead with for this role.>",
  "whatThisRoleIsAbout": "<2 sentences. What does this person do every day?>",
  "interviewFocus": [
    "<most likely interview question or topic — specific>",
    "<second>",
    "<third>"
  ]
}

If NOT a valid job description:
{
  "isValidJD": false,
  "validationError": "<one plain sentence — what the input looks like and what to paste instead>"
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

${GROUNDING_PREAMBLE}

ROLE: ${analysis.jobTitle} at ${analysis.company}

GAPS IDENTIFIED:
${gaps.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}

CANDIDATE'S RESUME:
${resume}

JOB DESCRIPTION (for context):
${jd}

YOUR TASK — read these rules before writing a single word:

BULLET RULES:
1. Before writing any bullet, find the exact phrase or sentence in the resume that supports it. This becomes source_line. If you cannot find a source_line, skip the bullet entirely — do not invent one.
2. For each bullet, assign a claim_type:
   - "confirmed": the bullet only rewords the source line — better verb, tighter focus, no new facts. This is always safe to use.
   - "inference": the bullet draws a reasonable conclusion from source_line + JD context, not stated outright in either. Show the source and flag it for verification.
   - "new_info": the bullet introduces a fact, duty, or outcome not present in the resume at all. Prefix the bullet text with "If accurate: " and set source_line to null. Use sparingly — only when the gap is critical and the claim is plausible from context.
3. Bullets: 20 words maximum (excluding "If accurate: " prefix). Strong past-tense verb. Lead with outcome or scope. No comma-chained task lists.
4. For each bullet: does a weak version already exist (REPLACE) or is it completely absent (ADD)?
   - REPLACE: set type to "replace", set replaces to the first 6-8 words of the existing bullet verbatim.
   - ADD: set type to "add", set replaces to null.
5. If the existing bullet is already accurate and clear for this role, do not replace it. Only suggest a replacement if the current version is materially weaker.
6. Maximum 4 bullets total. Prioritise the gaps that most hurt this application. Leave the rest.
7. Never write a bullet for the professional summary. That is handled separately.
8. VARY BULLET STRUCTURE DELIBERATELY. Not every bullet should start with a gerund (Managed, Coordinated, Expedited). Some should lead with scope ("14 suppliers across..."), some with outcome ("Reduced delivery delays by..."), some with a direct past-tense verb ("Resolved 23 non-conformances..."). Vary them.

TAILORING RULES:
9. Only flag content that actively signals the wrong background for THIS SPECIFIC ROLE. If it is irrelevant but harmless, leave it alone. This is a tailoring recommendation for one application — not a permanent resume change. The reason field must make clear what signal this content sends to this employer specifically.

SUMMARY RULES:
9. Only rewrite the summary if it is genuinely weak or misaligned for this role. If the existing summary is honest, specific, and already covers the candidate's relevant experience for this role, set needsRevision to false and return null for suggested. Do not rewrite a good summary just to rewrite it.
10. BEFORE deciding to rewrite: ask whether the existing summary already answers the role's key questions. If yes, leave it alone.
11. Write what is TRUE about the person, not what the JD says they need. Do not mirror JD language.
12. Sentence 1: who they are and their clearest credential. Sentence 2: the one thing that sets them apart — specific, not generic. Sentence 3 (optional): bare credentials only if they appear explicitly in the resume.
13. No adjectives about the person. No "seasoned", "results-driven", "accomplished", "passionate", "dedicated".
14. Never use: "targeting", "seeking", "passionate about", "driven professional", "full-lifecycle", "stakeholder management", "working knowledge", or any JD phrase.
15. Maximum 50 words. Short sentences. No em-dashes. No buzzwords.
16. ABSOLUTE RULE — CREDENTIALS: Never add any degree, certification, qualification, or credential that does not appear explicitly in the resume. No MBA, no PMP, no degree, no certification unless it is written on the resume verbatim. Adding a credential the candidate does not have is the most serious error possible — it causes the candidate to lie on their application. If you are not 100% certain it is on the resume, do not include it.

CLASSIFICATION TASK:
After writing your bullets, classify every gap in the original numbered list above. Use 0-based indexing matching the order they were listed.
- "addressed_by_bullet": one of your suggested bullets directly addresses this gap using real evidence from the resume
- "addressed_by_reframe": evidence clearly exists on the resume for this gap but none of your specific bullets covers it — the candidate just needs to frame existing experience differently
- "real_gap": the candidate genuinely does not have evidence for this and resume changes alone cannot close it

Classify every gap. Do not skip any.

Return ONLY valid JSON:
{
  "suggestedBullets": [
    {
      "where": "<job title and employer from the resume — format date ranges as 'Month Year to Month Year' or 'Month Year to Present', never with a comma>",
      "type": "replace" | "add",
      "replaces": "<first 6-8 words of the existing bullet verbatim, or null>",
      "bullet": "<20 words max. Verb. Outcome. Only details traceable to the resume. Prefix 'If accurate: ' for new_info claim_type.>",
      "source_line": "<exact phrase or sentence from the resume this bullet is based on, or null for new_info>",
      "claim_type": "confirmed" | "inference" | "new_info"
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
  },
  "gapClassifications": [
    {
      "gapIndex": 0,
      "classification": "addressed_by_bullet" | "addressed_by_reframe" | "perception_risk" | "real_gap",
      "reframe_evidence": "<if addressed_by_reframe: quote the specific resume text that can be reframed — required. If any other classification: null.>"
    }
  ]
}

CLASSIFICATION RULES — read before classifying:
- "addressed_by_bullet": one of your suggested bullets directly addresses this gap with citable resume evidence.
- "addressed_by_reframe": ONLY use this if you can quote specific resume text (in reframe_evidence) that the candidate could reframe to address this gap. If you cannot quote it, use perception_risk or real_gap instead. This category must never be applied to seniority, overqualification, or lifestyle concerns.
- "perception_risk": the concern is about how the resume reads to a recruiter — title mismatch, seniority signal, overqualification — not a genuine experience gap. No resume text can fix this but the candidate should be aware of it.
- "real_gap": the JD requires it AND the resume has no evidence, no transferable equivalent, and no reframeable content. Cannot be fixed before applying.`;

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
      ra.gapClassifications = editorial.gapClassifications ?? [];
    } catch (err) {
      // Editorial call failed — return analysis without editorial rather than failing entirely
      console.error("JD analysis call 2 error:", err);
      const ra = analysis.resumeAlignment as Record<string, unknown>;
      ra.suggestedBullets = [];
      ra.suggestedRemovals = [];
      ra.profileSuggestion = null;
      ra.gapClassifications = [];
    }
  }

  return Response.json({ analysis: fixDateCommas(stripEmDashes(analysis)), jdTruncated });
}
