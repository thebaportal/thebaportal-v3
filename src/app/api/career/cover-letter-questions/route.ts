import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 26;
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

  const { resumeText, jdText } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const prompt = `You are a BA career coach preparing to write a cover letter for a client. Before you write it, you need 3 to 4 pieces of information that will make it genuinely compelling rather than generic.

Look at both the resume and the job description below, then ask targeted questions that will help you:
- Pull out the most relevant experience for this specific role
- Identify a genuine hook or connection to this company or role
- Surface an achievement or result that directly addresses what the JD is asking for
- Understand their motivation or interest in this particular move

Keep questions short and conversational. Don't ask for things already visible in the resume.

RESUME:
${resumeText.slice(0, 3000)}

JOB DESCRIPTION:
${jdText.slice(0, 2000)}

Return ONLY valid JSON — no text outside it:
{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>",
    "<question 4>"
  ],
  "jdSummary": "<one sentence: what this role actually needs in a candidate, in plain English>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Cover letter questions error:", err);
    return Response.json({ error: "Could not generate questions. Please try again." }, { status: 500 });
  }
}
