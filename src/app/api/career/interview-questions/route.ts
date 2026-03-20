import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 26;


export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { jdText, company, resumeText } = await req.json();
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const resumeSection = resumeText && resumeText.length > 100
    ? `\nCANDIDATE RESUME (use to make questions relevant to their background):\n${resumeText.slice(0, 2000)}`
    : "";

  const prompt = `You are a BA interview coach preparing a candidate for a real interview. Generate a set of realistic interview questions based on the job description${company ? ` at ${company}` : ""}.

JOB DESCRIPTION:
${jdText.slice(0, 2500)}
${resumeSection}

Generate 8 to 12 interview questions across these categories. Make them specific to this role — not generic. Include questions that probe the candidate's actual background where a resume is provided.

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    {
      "id": "q1",
      "question": "<the interview question>",
      "category": "behavioral" | "technical" | "stakeholder" | "process",
      "hint": "<what a good answer looks like in 1 sentence — not shown to candidate until after they answer>"
    }
  ],
  "roleContext": "<1-2 sentences on what this interview will likely focus on, based on the JD>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Interview questions error:", err);
    return Response.json({ error: "Could not generate questions. Please try again." }, { status: 500 });
  }
}
