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

  const { transcript, scenario, audience, duration, wordCount, focus, previousScore, previousTopFix } = await req.json() as {
    transcript: string;
    scenario: string;
    audience: string;
    duration: number;
    wordCount: number;
    focus?: string;
    previousScore?: number;
    previousTopFix?: string;
  };

  if (!transcript || transcript.trim().length < 20) {
    return Response.json({ error: "Transcript too short to analyse" }, { status: 400 });
  }

  const focusNote = focus && focus !== "all"
    ? `\nFOCUS: Pay extra attention to ${focus} when scoring and writing the topFix and doThisNext.`
    : "";

  const retryNote = previousScore != null && previousTopFix
    ? `\nRETRY CONTEXT: This user previously scored ${previousScore}/100 on this scenario. Alex told them to fix: "${previousTopFix}". Evaluate whether they applied that fix in this attempt.\n- If they clearly applied it: their score MUST increase by at least 8 points vs ${previousScore}, and topWin must acknowledge the specific improvement.\n- If they partially applied it: score must increase by at least 3 points, acknowledge the partial progress in topWin.\n- If they ignored it entirely: maintain pressure, do not acknowledge improvement that did not happen.\n- Never repeat the same harsh verdict if the user made a real correction. The verdict must reflect the actual new state of this delivery.\n- A response built on Alex's coachRewrite should generally score materially higher than the original unless delivery quality clearly collapses.`
    : "";

  const systemPrompt = `You are Alex Rivera, a senior Business Analyst coach.

Your goal is to help the user improve their next response immediately. You are not writing a report. You are driving behavior change in one iteration.

Rules:
- Be direct and specific
- Avoid generic feedback
- Focus only on what will increase the user's score in their next attempt
- Keep total output concise and structured
- Do not over-explain
- Do not repeat the user's words back to them
- When rewriting their answer, write like a real person speaks — not like a polished LinkedIn profile. Imperfect sentences are fine. Buzzwords are not.

Transcript handling:
- The transcript comes from speech recognition and may contain wording errors. Evaluate the response based on how it lands to a listener under pressure. Be strict about clarity, structure, and credibility, but do not over-penalize exact strange words or obvious transcription errors. If a section is hard to follow, describe it as unclear, garbled, or losing the listener rather than criticizing a specific mis-transcribed word. Judge structure of thinking separately from clarity of delivery. A response can show solid thinking but still fail because the delivery is hard to follow.
- Do not quote bizarre or garbled transcript words unless the meaning is clearly intentional.
- If delivery breaks down, say the listener loses the thread — do not invent an error from a bad transcription.
- If the user shows real structure or substance, acknowledge it even when clarity is weak.
- Keep the coaching tough. Do not soften standards.
- Penalize unclear delivery, but never penalize a user for a word the microphone got wrong.`;

  const userPrompt = `Analyse this BA practice session and return structured coaching as JSON.

SCENARIO: ${scenario}
AUDIENCE: ${audience}
DURATION: ${duration} seconds
WORD COUNT: ${wordCount}${focusNote}${retryNote}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON with this exact structure. No text outside the JSON.

{
  "overallScore": <0-100 integer>,
  "verdict": "<one sentence on how this delivery would land with the audience. Be direct. No labels. Example: 'This answer would leave the panel uncertain about your actual contribution.'>",
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
  "coachRewrite": "<rewrite their response as something a real person would actually say out loud in a room. Use their words and rhythm, not yours. Sound like a confident human being, not a LinkedIn profile. No business buzzwords. No 'I specialise in', no 'delivery cycles', no 'shift the needle', no 'cross-functional'. Short sentences. Natural pauses. Keep their intent but make it land. 50-80 words max.>",
  "improvedOpening": <if overallScore < 65: "a stronger opening line, 1-2 sentences max", else: null>,
  "improvedClosing": <if overallScore < 65: "a stronger closing line, 1-2 sentences max", else: null>
}

CONSTRAINTS:
- Do NOT add any fields beyond those listed
- Do NOT include explanations outside the JSON structure
- Do NOT generate multiple fixes — one topFix only
- verdict must be exactly one sentence, no heading, no label
- coachRewrite must sound spoken, not written — short sentences, no buzzwords, 50-80 words max
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
        verdict: "This session could not be fully analysed — try again with a clearer recording.",
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
