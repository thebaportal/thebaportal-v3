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

  const { resumeText } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text too short to analyse." }, { status: 400 });
  }

  const prompt = `You are a BA career coach sitting with a client and reviewing their resume together. You need to ask 4 to 5 follow up questions to draw out the detail that will make their resume significantly stronger.

Read this resume carefully. Identify the gaps, vague claims, buried achievements, and missing context that are holding it back. Then write questions that feel like a natural conversation — warm, specific, and encouraging.

Each question must follow this structure:
1. A brief observation referencing something specific you noticed in their resume (acknowledge what is there)
2. The actual question — specific, targeted, not generic
3. Optional: a short line of encouragement or context (e.g. "Numbers or rough estimates are fine" or "This kind of detail is exactly what hiring managers look for")

Do not write generic questions like "what are your key achievements". Reference the actual content of the resume.
Do not use hyphens in the question text.
Write in first person as a coach speaking directly to the person.
Keep a warm, conversational tone throughout.

Good questions surface:
- Quantifiable outcomes behind vague claims (e.g. "You mention leading stakeholder workshops. Can you think of a specific outcome from one of those sessions — a decision that was made, a conflict that was resolved, or a requirement that changed as a result?")
- Tools or systems they used but did not name
- The BA work hidden inside non-BA job titles
- Achievements they undersold or left out entirely
- The type of role they are targeting next

RESUME:
${resumeText.slice(0, 4000)}

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    "<question 1 — observation + question + optional encouragement>",
    "<question 2>",
    "<question 3>",
    "<question 4>",
    "<question 5>"
  ],
  "firstImpression": "<2 to 3 sentences. Start with what is genuinely strong. Then name the single biggest issue holding this resume back. Be direct and honest but warm. Do not use corporate speak or filler phrases.>",
  "coachIntro": "<2 to 3 sentences introducing the questions. Sound like a coach who has just read the resume and is ready to work with the person. Reference something specific you noticed. Example: I can see strong analytical work in your background but the resume is not positioning it as BA experience yet. That is what we are going to fix. I have a few questions that will help me pull the right detail forward.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
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
