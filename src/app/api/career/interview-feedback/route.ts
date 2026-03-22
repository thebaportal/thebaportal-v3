import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";



export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { question, transcript, category, duration, wordCount } = await req.json();

  if (!transcript || transcript.trim().length < 20) {
    return Response.json({ error: "Answer too short to analyse." }, { status: 400 });
  }

  const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  const categoryContext: Record<string, string> = {
    behavioral: "STAR behavioural question — look for Situation, Task, Action, Result structure. Penalise vague answers that lack a concrete outcome or that stay too generic.",
    technical: "Technical BA question — look for accuracy of BA concepts, methodology knowledge, and practical application. Penalise answers that are overly theoretical without real-world grounding.",
    stakeholder: "Stakeholder management question — look for nuance in handling conflict, influence without authority, and communication strategy. Penalise simplistic or conflict-avoidant answers.",
    process: "Process and methodology question — look for structured thinking, knowledge of relevant frameworks, and adaptability. Penalise rigid answers that ignore context.",
  };

  const userPrompt = `You are Alex, a senior BA interview coach. Analyse this spoken interview answer and return structured coaching feedback.

QUESTION ASKED: "${question}"
QUESTION CATEGORY: ${category} — ${categoryContext[category] || categoryContext.behavioral}
DURATION: ${duration} seconds
WORD COUNT: ${wordCount}
WORDS PER MINUTE: ${wpm}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON:
{
  "overallScore": <0-100 integer>,
  "star": {
    "situation": { "score": <0-100>, "feedback": "<Was the context clear and specific? 1-2 sentences.>" },
    "task": { "score": <0-100>, "feedback": "<Was the candidate's role and responsibility clear? 1-2 sentences.>" },
    "action": { "score": <0-100>, "feedback": "<Were the specific actions detailed and BA-relevant? 1-2 sentences.>" },
    "result": { "score": <0-100>, "feedback": "<Was there a clear, measurable or observable outcome? 1-2 sentences.>" }
  },
  "delivery": {
    "pacing": { "score": <0-100>, "wpm": ${wpm}, "feedback": "<Comment on pace. Ideal interview pace is 120-150wpm. Under 110 is too slow; over 170 is rushed.>" },
    "confidence": { "score": <0-100>, "feedback": "<Comment on hedging language, filler words, and assertion in their actual words.>" }
  },
  "topStrength": "<The single strongest thing about this answer — quote or reference their actual words.>",
  "topImprovement": "<The single most important thing to fix before a real interview.>",
  "missingElement": "<What was left out that an interviewer would notice or ask as a follow-up? Be specific.>",
  "suggestedRewrite": "<Rewrite their weakest sentence or section. Show them exactly how to say it better.>",
  "interviewerPerspective": "<How would a real interviewer experience this answer? Honest, 2-3 sentences.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const feedback = JSON.parse(jsonMatch[0]);
    return Response.json({ feedback });

  } catch (err) {
    console.error("Interview feedback error:", err);
    return Response.json({
      feedback: {
        overallScore: 60,
        star: {
          situation: { score: 60, feedback: "Analysis unavailable. Try again with a longer recording." },
          task: { score: 60, feedback: "Recording could not be fully processed." },
          action: { score: 60, feedback: "Submit again for a full action analysis." },
          result: { score: 60, feedback: "Result analysis requires a complete answer." },
        },
        delivery: {
          pacing: { score: 60, wpm: wpm, feedback: "Pacing analysis could not be completed." },
          confidence: { score: 60, feedback: "Confidence analysis requires a clearer recording." },
        },
        topStrength: "You completed a full practice answer — keep going.",
        topImprovement: "Try recording in a quieter environment for more accurate feedback.",
        missingElement: "Full analysis unavailable for this session.",
        suggestedRewrite: "Please try again for a specific rewrite suggestion.",
        interviewerPerspective: "This session could not be fully evaluated.",
      },
    });
  }
}
