import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Maps alexIdx (0–11) to question type
// Even indices = main questions, odd = follow-ups
const QUESTION_TYPES = [
  "Behavioral (STAR)",      // Q1
  "BA Technical",           // Q2
  "Deep Dive",              // Q3 — from prior answers
  "Situational",            // Q4
  "Role Fit",               // Q5
  "Pressure / Deep Dive",   // Q6
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, alexIdx, jd } = body as {
      messages: { role: "alex" | "user"; content: string }[];
      alexIdx: number;        // 0–11: which Alex message we're generating
      jd?: string;
    };

    const questionNumber = Math.floor(alexIdx / 2) + 1; // 1–6
    const isFollowUp     = alexIdx % 2 === 1;
    const questionType   = QUESTION_TYPES[questionNumber - 1];

    const jdContext = jd?.trim()
      ? `JOB DESCRIPTION PROVIDED:\n${jd.trim()}\n\nUse this JD to tailor your questions. Extract key skills (e.g. Agile, SQL, stakeholder management), domain, and seniority signals. Weight your questions toward what this specific role demands. When JD mentions specific skills, ask follow-ups that surface whether the candidate actually has depth in those areas.`
      : "";

    const followUpInstruction = isFollowUp
      ? `You just asked your main question. Now ask ONE specific follow-up that digs deeper into what they just said. Reference something concrete from their actual answer — a specific detail, a claim, a gap. Do not ask a generic follow-up.`
      : questionNumber === 3 || questionNumber === 6
      ? `Ask a Deep Dive question. Look back at everything the candidate has said so far. Pick the single most interesting or specific thing they mentioned and probe deeper. Quote or reference what they said (e.g. "You mentioned X — tell me more about...").`
      : `Ask the ${questionType} question appropriate for this stage of the interview.`;

    const systemPrompt = `You are Alex Rivera, Senior Hiring Manager. You have 12 years of experience building BA teams at enterprise companies. You are conducting a structured BA job interview.

Your style: direct, professional, and probing. You want to see if this person actually knows their craft — not just whether they can talk about it. You are not rude, but you are not soft either.

${jdContext}

CURRENT POSITION IN INTERVIEW:
Question ${questionNumber} of 6 — ${questionType}${isFollowUp ? " (Follow-up)" : " (Main question)"}

QUESTION TYPES YOU USE:
1. Behavioral (STAR): Prompt a specific past experience. "Tell me about a time when..."
2. BA Technical: Probe their process, tools, methodology. "Walk me through..."
3. Deep Dive: Reference something specific from their earlier answers and push deeper.
4. Situational: Present a realistic BA scenario and ask how they'd handle it.
5. Role Fit: Understand their motivation. "Why business analysis?" / "What draws you to this work?"
6. Pressure / Deep Dive: Challenge something they said earlier or probe a gap you noticed.

${followUpInstruction}

RULES:
- Ask ONE question only. Never two questions at once.
- Keep your response to 2–3 sentences maximum.
- Do NOT give affirmations like "Great answer!" or "That's interesting!" — acknowledge very briefly if needed (one word: "Understood." / "Right."), then ask your question.
- Do NOT evaluate or score the candidate mid-interview.
- For Deep Dive and follow-ups: be specific. Reference what they actually said. Make them feel you were listening.`;

    // Build Anthropic messages — always starts with a synthetic user opener
    const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: "Please begin the interview." },
      ...messages.map(m => ({
        role: m.role === "alex" ? "assistant" as const : "user" as const,
        content: m.content,
      })),
    ];

    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 300,
      system:     systemPrompt,
      messages:   anthropicMessages,
    });

    const message = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    return NextResponse.json({ message });

  } catch (error) {
    console.error("Interview message error:", error);
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
