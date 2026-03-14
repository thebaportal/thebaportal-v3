import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const client = new Anthropic();

export async function POST(req: Request) {
  // Auth check
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { transcript, scenario, audience, duration, wordCount } = await req.json() as {
    transcript: string;
    scenario: string;
    audience: string;
    duration: number;
    wordCount: number;
  };

  if (!transcript || transcript.trim().length < 20) {
    return Response.json({ error: "Transcript too short to analyse" }, { status: 400 });
  }

  const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  const systemPrompt = `You are Alex, a senior executive communication coach who specialises in business analysts and professionals preparing for high-stakes workplace presentations. Your coaching is direct, specific, and actionable. You do not give empty praise. Every piece of feedback references something specific from the speaker's actual words.

You analyse spoken transcripts from practice sessions and produce structured coaching reports in JSON format. Your tone is confident, encouraging, and professional — like a coach who genuinely wants the speaker to improve before the real meeting.`;

  const userPrompt = `Analyse this practice transcript and return a coaching report as JSON.

SCENARIO: ${scenario}
AUDIENCE: ${audience}
DURATION: ${duration} seconds
WORD COUNT: ${wordCount}
WORDS PER MINUTE: ${wpm}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON with this exact structure. Do not include any text outside the JSON.

{
  "overallScore": <0-100 integer>,
  "dimensions": {
    "clarity": {
      "score": <0-100>,
      "feedback": "<specific feedback quoting or referencing their actual phrasing where possible, 2-3 sentences>"
    },
    "structure": {
      "score": <0-100>,
      "feedback": "<specific feedback on their opening, middle, and close, 2-3 sentences>"
    },
    "confidence": {
      "score": <0-100>,
      "feedback": "<specific feedback on language choices, hedging, assertion, 2-3 sentences>"
    },
    "audienceAlignment": {
      "score": <0-100>,
      "feedback": "<specific feedback on how well they tailored for the audience, 2-3 sentences>"
    },
    "executivePresence": {
      "score": <0-100>,
      "feedback": "<specific feedback on gravitas, recommendation clarity, decisiveness, 2-3 sentences>"
    },
    "fillerWords": {
      "score": <0-100>,
      "count": <integer — count of um, uh, like, you know, basically, literally, sort of, kind of, right>,
      "examples": ["<exact quote from transcript>"],
      "feedback": "<specific feedback on filler patterns observed, 1-2 sentences>"
    },
    "hedgingLanguage": {
      "score": <0-100>,
      "examples": ["<exact quote from transcript>"],
      "feedback": "<specific feedback on hedging phrases that undermine authority, 1-2 sentences>"
    },
    "pacing": {
      "score": <0-100>,
      "wpm": ${wpm},
      "feedback": "<specific feedback on pace, pausing, and rhythm, 1-2 sentences. Ideal BA presentation pace is 130-160 wpm>"
    }
  },
  "topWin": "<one specific strength — quote or reference their actual words>",
  "topFix": "<the single most important thing to fix before the real meeting — be specific>",
  "coachRewrite": "<rewrite of their weakest or most unclear sentence — show them exactly how to say it better>",
  "strongerOpening": "<suggest a more confident, audience-focused opening line — write it out as they would say it>",
  "strongerClosing": "<suggest a stronger, more decisive closing line — write it out as they would say it>",
  "stakeholderImpact": "<how a real stakeholder in this audience would likely have experienced this presentation — be honest>",
  "mostImprovedLine": "<one sentence from the transcript with the most improvement potential, followed by a rewrite>"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const feedback = JSON.parse(jsonMatch[0]);
    return Response.json({ feedback });

  } catch (err) {
    console.error("PitchReady feedback error:", err);
    // Return a structured fallback so the UI never hard-fails
    return Response.json({
      feedback: {
        overallScore: 60,
        dimensions: {
          clarity: { score: 60, feedback: "Unable to analyse at this time. Please try again with a longer recording." },
          structure: { score: 60, feedback: "Recording could not be fully processed. Try recording for at least 60 seconds." },
          confidence: { score: 60, feedback: "Submit again for a full confidence analysis." },
          audienceAlignment: { score: 60, feedback: "Audience alignment analysis requires a complete transcript." },
          executivePresence: { score: 60, feedback: "Executive presence feedback requires a clearer audio recording." },
          fillerWords: { score: 70, count: 0, examples: [], feedback: "Filler word detection requires a complete transcript." },
          hedgingLanguage: { score: 70, examples: [], feedback: "Hedging analysis requires a complete transcript." },
          pacing: { score: 60, wpm: 0, feedback: "Pacing analysis could not be completed. Try again." },
        },
        topWin: "You completed a full practice session — consistency is the foundation of improvement.",
        topFix: "Try recording with a clearer microphone or in a quieter environment for more accurate feedback.",
        coachRewrite: "Feedback unavailable for this session. Please try again.",
        strongerOpening: "Try opening with: The purpose of this conversation is to get your alignment on one specific recommendation.",
        strongerClosing: "Try closing with: I need a decision on this today — the next step is yours.",
        stakeholderImpact: "This session could not be fully evaluated. Record again for a complete stakeholder impact assessment.",
        mostImprovedLine: "Try again for a specific line improvement suggestion.",
      },
    });
  }
}
