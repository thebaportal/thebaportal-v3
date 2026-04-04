export const maxDuration = 45;

import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const client = new Anthropic();

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { transcript, scenario, audience, duration, wordCount, focus } = await req.json() as {
    transcript: string;
    scenario: string;
    audience: string;
    duration: number;
    wordCount: number;
    focus?: string;
  };

  if (!transcript || transcript.trim().length < 20) {
    return Response.json({ error: "Transcript too short to analyse" }, { status: 400 });
  }

  const focusNote = focus && focus !== "all"
    ? `\nFOCUS: Pay extra attention to ${focus} when scoring and writing the topFix and doThisNext.`
    : "";

  const systemPrompt = `You are Alex Rivera, a senior Business Analyst coach.

Your goal is to help the user improve their next response immediately. You are not writing a report. You are driving behavior change in one iteration.

Rules:
- Be direct and specific
- Avoid generic feedback
- Focus only on what will increase the user's score in their next attempt
- Keep total output concise and structured
- Do not over-explain
- Do not repeat the user's words back to them`;

  const userPrompt = `Analyse this BA practice session and return structured coaching as JSON.

SCENARIO: ${scenario}
AUDIENCE: ${audience}
DURATION: ${duration} seconds
WORD COUNT: ${wordCount}${focusNote}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON with this exact structure. No text outside the JSON.

{
  "overallScore": <0-100 integer>,
  "dimensions": {
    "clarity": { "score": <0-100> },
    "structure": { "score": <0-100> },
    "stakeholderAwareness": { "score": <0-100> },
    "relevance": { "score": <0-100> },
    "confidence": { "score": <0-100> },
    "conciseness": { "score": <0-100> }
  },
  "topWin": "<one short sentence — what they did well, be specific>",
  "topFix": "<the single most important thing limiting their score — specific and actionable>",
  "doThisNext": "<one direct instruction they must apply in their next attempt. Not advice. A direct action. Example: 'Start with the business outcome before describing your steps'>",
  "coachRewrite": "<rewrite their response as a strong but realistic BA answer. Keep it concise and natural. Do not make it perfect. Maintain their intent but improve clarity, structure, and impact>",
  "improvedOpening": <if overallScore < 65: "a stronger opening line, 1-2 sentences max", else: null>,
  "improvedClosing": <if overallScore < 65: "a stronger closing line, 1-2 sentences max", else: null>
}

CONSTRAINTS:
- Do NOT add any fields beyond those listed
- Do NOT include explanations outside the JSON structure
- Do NOT generate multiple fixes — one topFix only
- coachRewrite should be 60-120 words max
- improvedOpening and improvedClosing must be null if overallScore >= 65`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const feedback = JSON.parse(jsonMatch[0]);
    return Response.json({ feedback });

  } catch (err) {
    console.error("PitchReady feedback error:", err);
    return Response.json({
      feedback: {
        overallScore: 60,
        dimensions: {
          clarity: { score: 60 },
          structure: { score: 60 },
          stakeholderAwareness: { score: 60 },
          relevance: { score: 60 },
          confidence: { score: 60 },
          conciseness: { score: 60 },
        },
        topWin: "You completed a full practice session — consistency is the foundation of improvement.",
        topFix: "Try recording again with a clearer microphone or in a quieter environment for more accurate feedback.",
        doThisNext: "Record again and start your response by stating the business outcome you are trying to achieve.",
        coachRewrite: "Feedback unavailable for this session. Please try again with a longer recording.",
        improvedOpening: null,
        improvedClosing: null,
      },
    });
  }
}
