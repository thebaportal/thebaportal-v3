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

  const { jdText, resumeText } = await req.json();

  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description too short to analyse." }, { status: 400 });
  }

  const resumeSection = resumeText && resumeText.length > 100
    ? `\nCANDIDATE RESUME:\n${resumeText.slice(0, 3000)}`
    : "\nNo resume provided — analyse the JD requirements only.";

  const prompt = `You are a BA career coach doing a two-column job fit analysis. Compare what the role requires against what the candidate brings — or if no resume is provided, summarise the role requirements clearly.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}
${resumeSection}

Return ONLY valid JSON — no text outside it:
{
  "jobTitle": "<job title from the JD>",
  "company": "<company name from the JD, or 'Not specified'>",
  "atsScore": <0-100 integer — honest ATS keyword match score if resume provided, else null>,
  "rows": [
    {
      "requirement": "<specific requirement or skill from the JD>",
      "candidateMatch": "<what the candidate brings for this — or 'Not on resume' if no resume / not present>",
      "strength": "strong" | "partial" | "gap"
    }
  ],
  "mustHaves": ["<3-5 non-negotiable requirements from this JD>"],
  "missingKeywords": ["<ATS keywords in JD that are absent from the resume — include if resume provided>"],
  "keywordSuggestions": ["<exact phrases to add to resume to improve ATS match — include if resume provided>"],
  "verdict": "<honest 2-3 sentence assessment of fit. Would they likely get past ATS screening? What's the make-or-break factor?>",
  "topTip": "<the single most important thing to do before applying for this role>"
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
    const analysis = JSON.parse(jsonMatch[0]);
    return Response.json({ analysis });
  } catch (err) {
    console.error("JD analysis error:", err);
    return Response.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
