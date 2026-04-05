export const maxDuration = 20;

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic();

const BLOCKED_PATTERNS = [
  /review my (full |entire |whole )?response/i,
  /score (my|this) (answer|response|transcript)/i,
  /analyse (my|this) (answer|response|transcript)/i,
  /here is my (answer|response|transcript)/i,
];

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { scenarioTitle, overallScore, topFix, doThisNext, userQuestion } = await req.json() as {
    scenarioTitle: string;
    overallScore: number;
    topFix: string;
    doThisNext: string;
    userQuestion: string;
  };

  if (!userQuestion || userQuestion.trim().length < 3) {
    return Response.json({ error: "Question too short." }, { status: 400 });
  }

  if (userQuestion.length > 300) {
    return Response.json({
      answer: "Use a full session for detailed feedback. Ask a focused question here.",
    });
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(userQuestion)) {
      return Response.json({
        answer: "Use a full session for detailed feedback. Ask a focused question here.",
      });
    }
  }

  const systemPrompt = `You are Alex Rivera, a senior Business Analyst coach.

You provide quick, focused guidance to help the user improve their next response.

RULES
- Max 80 words total
- Be specific and contextual — use the scenario and feedback context provided
- Give ONE actionable improvement
- Allow ONE short sentence rewrite if it genuinely helps
- Do NOT provide full analysis
- Do NOT score
- Do NOT rewrite full answers

OUTPUT FORMAT (always follow this exactly):
[Direct answer in 1–2 sentences]

Do this next: [one clear instruction]

Example (optional): "[one sentence rewrite or example — only include if it adds real value]"`;

  const userPrompt = `CONTEXT
Scenario: ${scenarioTitle}
Score: ${overallScore}/100
Top Fix: ${topFix}
Do This Next: ${doThisNext}

QUESTION
${userQuestion.trim()}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 180,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const answer = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return Response.json({ answer });
  } catch (err) {
    console.error("Ask Alex error:", err);
    return Response.json({ error: "Alex is unavailable right now. Try again." }, { status: 500 });
  }
}
