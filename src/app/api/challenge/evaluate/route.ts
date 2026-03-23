import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

// ─── Types ────────────────────────────────────────────────────

interface ValidationFinding {
  id: string;
  errorLocation: string;
  whatIsWrong: string;
  correction: string;
  whyItMatters: string;
}

interface PlantedError {
  id: string;
  location: string;
  errorType: string;
  flawedStatement: string;
  correctStatement: string;
  explanation: string;
}

// ─── Phase B: Validation Evaluator ───────────────────────────

async function evaluateValidationPhase(
  findings: ValidationFinding[],
  plantedErrors: PlantedError[],
  challengeTitle: string
) {
  const findingsText = findings
    .map(
      (f, i) =>
        `Finding ${i + 1}:
  Location: ${f.errorLocation}
  What is wrong: ${f.whatIsWrong}
  Corrected statement: ${f.correction}
  Business impact: ${f.whyItMatters}`
    )
    .join("\n\n");

  const errorsText = plantedErrors
    .map(
      (e) =>
        `Error ID: ${e.id}
  Location: ${e.location}
  Error Type: ${e.errorType}
  Flawed: ${e.flawedStatement}
  Correct: ${e.correctStatement}
  Explanation: ${e.explanation}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are Alex Rivera, Senior Business Analyst with 15 years of experience.
You are evaluating a BA's requirements validation work for the challenge: "${challengeTitle}".

The learner was given a requirements document with exactly ${plantedErrors.length} deliberate errors.
Here are the actual planted errors (ground truth):

${errorsText}

Here are the learner's findings:

${findingsText}

For each planted error, determine:
1. Did the learner find it? (partial credit if they found the general area but got details wrong)
2. Was their correction accurate?
3. Did they explain the business impact?

Respond ONLY in this JSON format (no markdown, no preamble):
{
  "score": <0-100 integer>,
  "errorsFound": <integer 0-${plantedErrors.length}>,
  "feedback": "<2-3 sentences of Alex Rivera coaching feedback — specific, actionable, honest>",
  "plantedErrors": [
    {
      "id": "<error id>",
      "found": <true|false>,
      "location": "<location string>",
      "correctAnswer": "<brief correct answer in 1 sentence>"
    }
  ],
  "dimensions": [
    { "name": "Error Detection", "score": <0-40>, "max": 40, "comment": "<brief>" },
    { "name": "Correction Quality", "score": <0-35>, "max": 35, "comment": "<brief>" },
    { "name": "Explanation Depth", "score": <0-25>, "max": 25, "comment": "<brief>" }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Main POST Handler ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Phase B: Validation scoring ──
    if (body.phase === "validation") {
      // findings are sent at top level (not nested under submission)
      const { challenge, findings, difficultyMode } = body;

      if (!findings || !challenge?.plantedErrors) {
        return NextResponse.json({ error: "Missing findings or plantedErrors" }, { status: 400 });
      }

      const result = await evaluateValidationPhase(
        findings,
        challenge.plantedErrors,
        challenge.title
      );

      // Save to DB if logged in
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { saveAttempt } = await import("@/lib/progress");
          await saveAttempt({
            userId: user.id,
            challengeId: `${challenge.id}-validation`,
            challengeTitle: `${challenge.title} — Phase B Validation`,
            challengeType: challenge.type,
            industry: challenge.industry,
            difficultyMode: difficultyMode || "normal",
            totalScore: result.score,
            scoreProblemFraming: 0,
            scoreRootCause: 0,
            scoreEvidenceUse: 0,
            scoreRecommendation: 0,
            submissionText: JSON.stringify(findings),
            questionCount: 0,
          }, supabase);
        }
      } catch (dbError) {
        console.error("DB save error (non-fatal):", dbError);
      }

      return NextResponse.json({
        ...result,
        totalErrors: challenge.plantedErrors.length,
      });
    }

    // ── Phase A: Standard challenge evaluation ──
    const { challenge, submission, conversations, difficultyMode, questionCount } = body;

    const systemPrompt = `You are Alex Rivera, a Senior Business Analyst Coach with 14 years of experience. You are CBAP certified and previously led BA practices at Deloitte and IBM.

You evaluate BA simulation submissions with high professional standards. You are direct, specific, and constructive. You do NOT give empty praise. You identify real gaps and give actionable coaching.

You must respond ONLY with a valid JSON object in this exact structure, with no other text before or after:
{
  "totalScore": <number 0-100>,
  "dimensions": {
    "problemFraming": { "score": <0-25>, "verdict": "<1 sentence>", "tip": "<1 specific coaching tip>" },
    "rootCause": { "score": <0-25>, "verdict": "<1 sentence>", "tip": "<1 specific coaching tip>" },
    "evidenceUse": { "score": <0-25>, "verdict": "<1 sentence>", "tip": "<1 specific coaching tip>" },
    "recommendationQuality": { "score": <0-25>, "verdict": "<1 sentence>", "tip": "<1 specific coaching tip>" }
  },
  "feedback": "<3-4 paragraph written feedback as Alex Rivera. Be specific to their actual submission. Reference what they did well and what they missed. Give concrete next steps.>"
}

Scoring guidance:
- 22-25: Exceptional. Demonstrates senior BA thinking.
- 18-21: Strong. Minor gaps but solid overall.
- 13-17: Developing. Core understanding present but gaps in depth or structure.
- 8-12: Needs work. Significant gaps in the fundamentals.
- 0-7: Insufficient. The response does not demonstrate BA competency.

Difficulty adjustment:
- Normal mode: Standard scoring
- Hard mode: Slightly higher bar for the same score
- Expert mode: High bar — even good responses should show gaps

The totalScore must equal the sum of all four dimension scores.`;

    const userPrompt = `Challenge: ${challenge.title}
Industry: ${challenge.industry}
Type: ${challenge.type}
Difficulty Mode: ${difficultyMode || "normal"}
Questions Asked: ${questionCount || 0}

Challenge Brief:
${challenge.brief.situation}

Required Deliverable:
${challenge.brief.deliverable}

Stakeholder Conversations:
${conversations}

Candidate Submission:
${submission}

Evaluate this submission now. Return only the JSON object.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    let result;
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = {
        totalScore: 50,
        dimensions: {
          problemFraming: { score: 13, verdict: "Adequate problem framing.", tip: "Be more specific about the business impact." },
          rootCause: { score: 12, verdict: "Some root cause analysis present.", tip: "Use the 5 Whys technique to dig deeper." },
          evidenceUse: { score: 12, verdict: "Limited use of stakeholder evidence.", tip: "Reference specific quotes from your interviews." },
          recommendationQuality: { score: 13, verdict: "Recommendations are present but vague.", tip: "Make your recommendations measurable and time-bound." },
        },
        feedback: "Your submission shows effort but needs more depth. Focus on connecting your stakeholder insights directly to your recommendations. Review the challenge brief and ensure you addressed every aspect of the required deliverable.",
      };
    }

    // Save to database if user is logged in
    let _dbSaveError: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { saveAttempt } = await import("@/lib/progress");
        await saveAttempt({
          userId: user.id,
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          challengeType: challenge.type,
          industry: challenge.industry,
          difficultyMode: difficultyMode || "normal",
          totalScore: result.totalScore,
          scoreProblemFraming: result.dimensions.problemFraming.score,
          scoreRootCause: result.dimensions.rootCause.score,
          scoreEvidenceUse: result.dimensions.evidenceUse.score,
          scoreRecommendation: result.dimensions.recommendationQuality.score,
          submissionText: submission,
          questionCount: questionCount || 0,
        }, supabase);
      } else {
        _dbSaveError = "no_user: getUser() returned null";
      }
    } catch (dbError) {
      _dbSaveError = dbError instanceof Error ? dbError.message : String(dbError);
      console.error("DB save error:", _dbSaveError);
    }

    return NextResponse.json({ ...result, _dbSaveError });

  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}