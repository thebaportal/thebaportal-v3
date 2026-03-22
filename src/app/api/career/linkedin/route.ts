import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";



export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { style, fullName, progress, skills, badges, attempts } = await req.json();

  const styleDesc: Record<string, string> = {
    concise: "Tight and scannable. 150-180 words. Three short paragraphs. LinkedIn mobile-friendly. No bullet lists.",
    detailed: "Comprehensive but readable. 280-320 words. Covers background, methodology, achievements, and what they're looking for. Still human — no corporate speak.",
    confident: "Bold opening line that makes a strong claim. Punchy sentences. Under 200 words. Written like someone who knows their value and doesn't apologise for it.",
  };

  const topChallenges = (attempts || []).slice(0, 4).map((a: { challenge_title: string; challenge_type: string; industry: string; total_score: number }) =>
    `${a.challenge_type} in ${a.industry} (${a.total_score}/100)`
  ).join(", ") || "various BA scenarios";

  const badgeStr = (badges || []).map((b: { badge_name: string }) => b.badge_name).join(", ") || "early career";

  const userPrompt = `You are a LinkedIn personal branding expert for business analysts. Write a LinkedIn About section summary.

STYLE: ${style} — ${styleDesc[style] || styleDesc.concise}

CANDIDATE:
Name: ${fullName}
BA Level: ${progress?.ba_level || "Associate"}
Challenges completed: ${progress?.challenges_completed || 0} (avg score ${progress?.avg_score || 0}/100)
Skills: Elicitation ${skills?.elicitation || 0}%, Requirements ${skills?.requirements || 0}%, Solution Analysis ${skills?.solutionAnalysis || 0}%, Stakeholder Management ${skills?.stakeholderMgmt || 0}%
Practice areas: ${topChallenges}
Achievements: ${badgeStr}

RULES:
- Write in first person
- Do NOT open with "I am a Business Analyst" or "I have X years of experience" — that's the most common LinkedIn opener and the weakest
- Ground the summary in their actual skill profile and practice areas
- Do not use hollow phrases like "passionate", "results-driven", "leverage", "synergies"
- End with what they are looking for or what they bring to a team
- Write for a real human to read, not an ATS

Return ONLY valid JSON:
{
  "summary": "<the full LinkedIn summary text, with paragraph breaks represented as \\n\\n>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const { summary } = JSON.parse(jsonMatch[0]);
    return Response.json({ summary });

  } catch (err) {
    console.error("LinkedIn generation error:", err);
    return Response.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
