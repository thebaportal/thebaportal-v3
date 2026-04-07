import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, jd } = body as {
      messages: { role: "alex" | "user"; content: string; label?: string }[];
      jd?: string;
    };

    // Build a clean transcript for the evaluator
    const transcript = messages
      .map(m => `${m.role === "alex" ? "Interviewer" : "Candidate"}: ${m.content}`)
      .join("\n\n");

    const jdContext = jd?.trim()
      ? `JOB DESCRIPTION:\n${jd.trim()}\n\n`
      : "";

    const systemPrompt = `You are Alex Rivera, Senior Hiring Manager evaluating a BA job interview.

CRITICAL TONE RULE: Always write in second person. Address the user directly as "you" and "your". Never use "the candidate", "the interviewee", "the response", or any third-person framing.

Wrong: "The candidate failed to give specific examples."
Right: "You gave a vague answer without concrete examples."

You must respond ONLY with a valid JSON object in this exact structure, with no other text:
{
  "totalScore": <number 0-100>,
  "dimensions": {
    "answerStructure": { "score": <0-25>, "verdict": "<1 sentence in second person>", "tip": "<1 specific coaching tip in second person>" },
    "specificity":     { "score": <0-25>, "verdict": "<1 sentence in second person>", "tip": "<1 specific coaching tip in second person>" },
    "baThinking":      { "score": <0-25>, "verdict": "<1 sentence in second person>", "tip": "<1 specific coaching tip in second person>" },
    "followUpHandling":{ "score": <0-25>, "verdict": "<1 sentence in second person>", "tip": "<1 specific coaching tip in second person>" }
  },
  "feedback": "<3–4 paragraphs as Alex Rivera, second person throughout. Be specific to what they actually said in the interview. Reference real moments — quote or paraphrase their actual answers. Identify what they did well and where they fell short. Give concrete next steps. No generic praise. No third-person.>",
  "topFix": "<The single most important issue holding you back. One sentence, direct and specific, second person. Name the actual gap from this interview.>",
  "doThisNext": "<One concrete action to take before the next interview. Start with a verb. One sentence only. Second person.>",
  "betterAnswer": "<Find the question you answered weakest. Format exactly: 'When asked \\"[the actual question]\\", you [brief description of what you said]. A stronger answer: [2–3 sentence rewrite in first person, demonstrating strong BA thinking, specificity, and structure]'>"
}

Dimension scoring guidance:
- Answer Structure (0–25): Did they use STAR or a clear structure? Were answers coherent and complete?
- Specificity (0–25): Did they use concrete examples, numbers, names, real projects? Or vague generalities?
- BA Thinking (0–25): Did they demonstrate BA methodology, frameworks, stakeholder thinking, requirements discipline?
- Follow-up Handling (0–25): When challenged or probed, did they hold their ground thoughtfully? Or did they become vague or defensive?

Score ranges:
- 22–25: Exceptional. Senior BA-level response.
- 18–21: Strong. Minor gaps.
- 13–17: Developing. Core understanding present but lacks depth.
- 8–12: Needs work. Significant gaps.
- 0–7: Insufficient. Does not demonstrate BA competency.

The totalScore must equal the sum of all four dimension scores.`;

    const userPrompt = `${jdContext}INTERVIEW TRANSCRIPT:\n\n${transcript}\n\nEvaluate this interview now. Return only the JSON object.`;

    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1800,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const raw     = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      result = {
        totalScore: 50,
        dimensions: {
          answerStructure:  { score: 13, verdict: "Your answers had a basic structure.", tip: "Use the STAR framework explicitly on behavioral questions." },
          specificity:      { score: 12, verdict: "You gave some examples but lacked concrete detail.", tip: "Anchor every answer with a specific project, metric, or outcome." },
          baThinking:       { score: 12, verdict: "You showed some BA awareness.", tip: "Reference BA frameworks — MoSCoW, process mapping, gap analysis — by name." },
          followUpHandling: { score: 13, verdict: "You handled follow-up questions adequately.", tip: "When probed, build on your previous answer rather than restating it." },
        },
        feedback: "Your interview showed effort but needs more depth and specificity. Focus on grounding every answer in a real example with a clear outcome. Review the questions you were asked and practice answering each with concrete details.",
        topFix: "Your answers are too general — you described what you would do rather than what you actually did.",
        doThisNext: "Write out three real projects you've worked on with specific outcomes, then practice using them as examples for common BA interview questions.",
        betterAnswer: "When asked about your requirements gathering process, you described a generic approach. A stronger answer: 'On a recent payments platform project at [Company], I ran three structured elicitation workshops with the finance and operations teams using a combination of process mapping and structured interviews. I documented 47 functional requirements and 12 non-functionals in Confluence, got sign-off from the product owner in week three, and tracked changes through JIRA throughout the sprint cycle.'",
      };
    }

    // Save to DB if logged in
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { saveAttempt } = await import("@/lib/progress-server");
        await saveAttempt({
          userId:              user.id,
          challengeId:         "ba-interview",
          challengeTitle:      "BA Interview",
          challengeType:       "interview",
          attemptType:         "interview",
          industry:            "General",
          difficultyMode:      "normal",
          totalScore:          result.totalScore,
          scoreProblemFraming: result.dimensions.answerStructure.score,
          scoreRootCause:      result.dimensions.specificity.score,
          scoreEvidenceUse:    result.dimensions.baThinking.score,
          scoreRecommendation: result.dimensions.followUpHandling.score,
          submissionText:      transcript,
          questionCount:       messages.filter(m => m.role === "user").length,
        }, supabase);
      }
    } catch (dbError) {
      console.error("DB save error (non-fatal):", dbError);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Interview evaluate error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
