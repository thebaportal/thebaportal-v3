import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  const { jdText, skills, attempts, badges, progress } = await req.json();

  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description too short to analyse." }, { status: 400 });
  }

  const attemptsStr = (attempts || []).slice(0, 8).map((a: { challenge_title: string; challenge_type: string; industry: string; total_score: number }) =>
    `- ${a.challenge_title} (${a.challenge_type}, ${a.industry}, ${a.total_score}/100)`
  ).join("\n") || "None";

  const badgeStr = (badges || []).map((b: { badge_name: string }) => b.badge_name).join(", ") || "None";

  const userPrompt = `You are an expert BA career coach analysing job fit for a business analyst candidate.

CANDIDATE PROFILE:
- BA Level: ${progress?.ba_level || "Associate"}
- Challenges completed: ${progress?.challenges_completed || 0} (avg ${progress?.avg_score || 0}/100)
- Skill scores: Elicitation ${skills?.elicitation || 0}%, Requirements ${skills?.requirements || 0}%, Solution Analysis ${skills?.solutionAnalysis || 0}%, Stakeholder Management ${skills?.stakeholderMgmt || 0}%
- Badges earned: ${badgeStr}
- Completed simulations:
${attemptsStr}

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

Analyse the candidate's fit for this role. Return ONLY valid JSON:
{
  "matchScore": <0-100 integer — honest overall fit assessment>,
  "roleSummary": "<1-2 sentences summarising what this role actually needs in a BA>",
  "matchedSkills": [
    { "skill": "<skill or requirement from JD>", "evidence": "<specific evidence from candidate's profile — be concrete, reference actual simulation types or scores>" }
  ],
  "gapSkills": [
    { "skill": "<skill or requirement from JD candidate lacks or is weak on>", "priority": "high" | "medium" | "low", "recommendation": "<specific, actionable recommendation to close this gap>" }
  ],
  "interviewTalkingPoints": [
    "<3-5 specific talking points the candidate should emphasise in interview — reference their actual work where possible>"
  ],
  "questionsToExpect": [
    "<4-6 likely interview questions for this specific role based on the JD>"
  ],
  "fitVerdict": "<honest 2-3 sentence assessment of overall fit — would they likely get an interview? What's the single biggest thing working for and against them?>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1600,
      messages: [{ role: "user", content: userPrompt }],
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
