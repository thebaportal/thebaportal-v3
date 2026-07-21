import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

const GROUNDING_RULE = `ABSOLUTE RULE: Every word you write must be traceable to the resume or the job description. Preserve facts. Improve how they are communicated. Do not invent experience. Do not add credentials, degrees, certifications, tools, or outcomes not in the resume. A claim that is not grounded in the source puts false information in someone's mouth during a real interview.`;

export const maxDuration = 55;

function parseJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[0]);
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jdText, resumeText, qaContext } = await req.json();
  // qaContext: { question: string; answer: string | null }[]

  if (!jdText?.trim() || jdText.trim().length < 50) {
    return Response.json({ error: "Paste the job description first." }, { status: 400 });
  }
  if (!resumeText?.trim() || resumeText.trim().length < 100) {
    return Response.json({ error: "Upload or paste your resume first." }, { status: 400 });
  }

  const jd = (jdText as string).slice(0, 8000);
  const resume = (resumeText as string).slice(0, 8000);
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const answeredQA = (qaContext ?? []).filter((qa: { answer: string | null }) => qa.answer?.trim());
  const evidenceBlock = answeredQA.length
    ? `\n\nCANDIDATE-PROVIDED EVIDENCE (from pre-generation interview — must be used):\n${
        answeredQA.map((qa: { question: string; answer: string }, i: number) =>
          `[Evidence ${i + 1}]\nQuestion: ${qa.question}\nAnswer: ${qa.answer}`
        ).join("\n\n")
      }\n\nCRITICAL: Every evidence item above must produce a specific, visible change in at least one output. Map each answer directly to resume bullets, cover letter content, or interview preparation. Do not ignore evidence that was collected.`
    : "";

  const sharedContext = `JOB DESCRIPTION:\n${jd}\n\nCANDIDATE RESUME:\n${resume}${evidenceBlock}`;

  // Two parallel calls — resume package + supporting materials
  const callA = ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0.2,
    messages: [{
      role: "user",
      content: `Your objective: maximize this candidate's probability of receiving an interview for this specific role.

${GROUNDING_RULE}

${sharedContext}

TASK — REWRITE THE COMPLETE RESUME:
- Preserve every factual claim. Improve how those facts are communicated.
- Use JD terminology where it accurately reflects existing experience — do not mirror language that does not reflect reality.
- Rewrite weak or vague bullets into specific, impactful ones. Restructure freely as long as every fact remains true.
- Remove bullets that actively hurt this application. Consolidate duplicates.
- Rewrite the professional summary only if the current one is weak or misaligned for this role. If it is already strong, keep it.
- Never add credentials, tools, methodologies, or outcomes not in the resume.

Then:
- List 3-5 specific changes made (what was improved, in plain language)
- One risk that cannot be fixed by rewriting (or null)
- One sentence on how to handle that risk in the interview (or null)
- ONE follow-up question to ask the candidate if the answer could materially change what you wrote — only ask if yes vs no makes a real difference. Example: "Have you ever worked on a mine site or supported projects from a field location?" — null if no question would change the output.

Write directly. Short sentences. No em-dashes. No corporate language.
Do not use: leverage, utilize, seamlessly, robust, impactful, synergy, holistic, delve, bolster, end-to-end, full-cycle, high-value, proven track record, results-driven, seasoned, dynamic, passionate, dedicated, spearheaded, championed.
Use plain specific language instead: "ran the RFP from scope to award" not "managed end-to-end RFP processes."

CHANGE SUMMARY RULE: After writing the tailored resume, generate the changes list by comparing it against the CANDIDATE RESUME above. Only list a change if it is actually present in the tailored resume output. Do not list intended changes that did not make it into the final document.

Return ONLY valid JSON:
{
  "jobTitle": "<exact job title from JD>",
  "company": "<company name or 'Not specified'>",
  "tailoredResume": "<complete rewritten resume as plain text — full document, all sections>",
  "changes": ["<change actually present in the tailored resume — verified against the original>", "<change 2>", "<change 3>"],
  "risk": "<one sentence or null>",
  "riskPrep": "<one sentence on how to address it in the interview, or null>"
}`
    }]
  });

  const callB = ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    temperature: 0.3,
    messages: [{
      role: "user",
      content: `Produce supporting application materials for this candidate. Objective: maximize their probability of receiving an interview.

${GROUNDING_RULE}

${sharedContext}

Write directly. No boilerplate. No em-dashes. No "I am writing to express my interest." No "I would be thrilled." Real language, real content.

COVER LETTER — 3 short paragraphs:
- Para 1: One sentence on who they are. One specific reason this role and company, not generic.
- Para 2: Two or three strongest matches between their experience and the JD. Specific claims, not adjectives.
- Para 3: One confident closing sentence. No "I look forward to hearing from you."
No salutation or sign-off — the platform handles that.

WHY INTERESTED — 2 sentences. Specific to this role and company. Not "I am passionate about procurement."

WHY GOOD FIT — 2-3 sentences. Cite specific resume evidence. Not adjectives.

INTERVIEW QUESTIONS — 4 questions most likely to be asked for this specific role:
- Probe the real requirements and likely gaps
- Each answer: 3-4 sentences, real content, not templates
- If a gap cannot be closed, the answer acknowledges it and pivots to transferable experience — honest, confident, not defensive

Return ONLY valid JSON:
{
  "coverLetter": "<3 paragraphs as plain text>",
  "whyInterested": "<2 sentences>",
  "whyGoodFit": "<2-3 sentences>",
  "interviewQuestions": [
    { "question": "<question>", "answer": "<3-4 sentence answer>" },
    { "question": "<question>", "answer": "<3-4 sentence answer>" },
    { "question": "<question>", "answer": "<3-4 sentence answer>" },
    { "question": "<question>", "answer": "<3-4 sentence answer>" }
  ]
}`
    }]
  });

  try {
    const [resA, resB] = await Promise.all([callA, callB]);
    const rawA = resA.content[0].type === "text" ? resA.content[0].text : "";
    const rawB = resB.content[0].type === "text" ? resB.content[0].text : "";
    const a = parseJSON(rawA);
    const b = parseJSON(rawB);

    return Response.json({
      jobTitle: a.jobTitle ?? "Role",
      company: a.company ?? "",
      tailoredResume: a.tailoredResume ?? "",
      changes: a.changes ?? [],
      risk: a.risk ?? null,
      riskPrep: a.riskPrep ?? null,
      coverLetter: b.coverLetter ?? "",
      whyInterested: b.whyInterested ?? "",
      whyGoodFit: b.whyGoodFit ?? "",
      interviewQuestions: b.interviewQuestions ?? [],
    });
  } catch (err) {
    console.error("Apply engine error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
