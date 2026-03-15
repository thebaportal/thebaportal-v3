import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 30;
const ai = new Anthropic();

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { resumeText } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text too short to analyse." }, { status: 400 });
  }

  const prompt = `You are an experienced BA career coach reviewing a client's resume. Your job is to ask 4 to 5 short, targeted coaching questions that will help you improve their resume.

Read this resume carefully and identify the gaps, vague claims, or missing context that are weakening it. Then ask the questions that would give you exactly what you need to make it stronger.

Good questions focus on:
- Quantifiable outcomes or results they haven't mentioned (e.g. "you listed stakeholder management — what was a specific result you achieved through it?")
- Tools or technologies they used but haven't named
- The type of BA role or industry they are targeting
- Achievements or impact they may have undersold or left out entirely
- Context that would make vague bullet points credible

Keep each question short, direct, and conversational. Write them like a real coach talking to a client, not a form. No numbering. No bullet points in the JSON.

RESUME:
${resumeText.slice(0, 4000)}

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>",
    "<question 4>",
    "<question 5>"
  ],
  "firstImpression": "<one honest sentence about the resume's current biggest strength and biggest weakness — use plain language, not corporate speak>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Resume questions error:", err);
    return Response.json({ error: "Could not analyse your resume. Please try again." }, { status: 500 });
  }
}
