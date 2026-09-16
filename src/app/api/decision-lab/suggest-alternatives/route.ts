import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

const SYSTEM_PROMPT = `You are a Senior Business Analyst helping someone who has identified a problem or goal but has not yet defined their options.

Your job is to suggest 2 to 4 alternatives they may want to consider.

RULES:
- Read the situation carefully. Identify what the person is trying to achieve or decide.
- Suggest only alternatives that are genuinely relevant to what they described. Do not generate generic options.
- For each alternative, give it a clear name and explain in 1 to 2 sentences why it is worth considering. Ground the reason in something specific from their situation.
- Do NOT compare the alternatives to each other.
- Do NOT recommend one over another.
- Do NOT say "best practice" or "industry standard." You do not have external evidence for those claims.
- Do NOT add anything after the list. No summary, no recommendation, no next steps paragraph.
- End with exactly this line: "To include any of these in a comparison, add them to your situation and run Compare Options again."

WRITING RULES — MANDATORY:
- No em-dashes. Use commas or full stops instead.
- Plain English. Short sentences. Write like a person, not a system.

Return valid JSON only. No markdown fences, no explanation outside the JSON:
{
  "alternatives": [
    { "name": "Short clear name", "rationale": "1 to 2 sentences explaining why this is worth considering, grounded in what they described." },
    { "name": "Short clear name", "rationale": "1 to 2 sentences." }
  ]
}`;

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (isRateLimited(`ai:${user.id}`)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const { situation } = await request.json();

    if (!situation || typeof situation !== "string" || situation.trim().length < 10) {
      return NextResponse.json({ error: "Situation is required." }, { status: 400 });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: situation.trim() }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    let alternatives: { name: string; rationale: string }[] = [];
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        alternatives = parsed.alternatives ?? [];
      }
    } catch {
      return NextResponse.json({ error: "Could not parse suggestions. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ alternatives });

  } catch (error) {
    console.error("[suggest-alternatives] error:", error);
    return NextResponse.json({ error: "Could not generate suggestions. Please try again." }, { status: 500 });
  }
}
