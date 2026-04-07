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

    const mainQuestionGuidance: Record<string, string> = {
      "Behavioral (STAR)": jd?.trim()
        ? `Ask about a specific past experience tied to a skill or situation visible in the JD. Use "Tell me about a time when..." and name the context from the JD. Do not ask a generic behavioral question you could ask anyone.`
        : `Ask about a specific past experience using "Tell me about a time when..." — choose a situation a BA regularly faces: requirements conflict, unclear scope, difficult stakeholder, missed deadline.`,
      "BA Technical": jd?.trim()
        ? `Pick a core BA skill explicitly or implicitly required by the JD. Ask them to walk you through exactly how they do it. Be specific: name the skill. "Walk me through how you [specific skill]." Do not ask about BA in general.`
        : `Pick one core BA skill: elicitation, requirements documentation, process mapping, gap analysis, or stakeholder sign-off. Ask them to walk through how they do it on a real project.`,
      "Situational": jd?.trim()
        ? `Present a realistic scenario tied to the specific challenges in this role (use JD signals for context). Build in a tension or ambiguity. Start with "Imagine you've just..." or "You've been brought in to..." — make it specific to this type of role, not abstract.`
        : `Present a realistic BA scenario with a built-in tension: conflicting stakeholders, moving requirements, unclear scope, or a stakeholder who won't engage. Start with "You've just been handed..." — make it feel real.`,
      "Role Fit": jd?.trim()
        ? `Ask about their motivation or self-awareness tied to this specific role. Avoid "Why BA?" — instead connect to something specific in the JD: the domain, the type of work, the seniority level. "What draws you to this kind of work specifically?" or "What about [domain from JD] interests you?"`
        : `Ask about self-awareness or motivation. Not "why BA?" — something more probing: "What type of BA work do you find easiest?" or "Where do you think you still have the most to learn?"`,
    };

    const followUpInstruction = isFollowUp
      ? `You just asked your main question. Now ask ONE follow-up that targets a specific gap or unsupported claim in what they just said. Quote 3–5 words directly from their answer, then probe. Format: "You said [their exact words] — [targeted question about the gap]." Do not ask anything generic. Do not ask anything you could have asked without hearing their answer.`
      : questionNumber === 3 || questionNumber === 6
      ? `Ask a Deep Dive question. Look back at everything the candidate has said so far. Pick the single most interesting or specific thing they mentioned and probe deeper. Quote their exact words (e.g. "You mentioned [X] — what was the actual disagreement there?"). Do not ask anything new — this is about going deeper on what they already said.`
      : mainQuestionGuidance[questionType] ?? `Ask the ${questionType} question appropriate for this stage of the interview.`;

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
- No affirmations. No "Great answer!", "That's interesting!", "Good point." — acknowledge with a single word at most ("Understood." / "Right." / "Go on."), then your question.
- Do NOT evaluate or score the candidate mid-interview.
- Every question must reflect what you know about this specific candidate. If you could have asked the same question at the start of the interview without hearing anything they said — it is too generic. Rewrite it.
- For follow-ups and Deep Dive: quote their actual words. Do not paraphrase. Do not invent a gap — find a real one.`;

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
