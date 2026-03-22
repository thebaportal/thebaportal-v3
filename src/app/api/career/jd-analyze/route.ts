import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 26;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { jdText, resumeText } = await req.json();

  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description too short to analyse." }, { status: 400 });
  }

  const hasResume = resumeText && resumeText.trim().length > 100;

  const resumeSection = hasResume
    ? `\nCANDIDATE RESUME:\n${(resumeText as string).slice(0, 3000)}`
    : "\nNo resume provided.";

  const prompt = `You are a senior BA career coach helping a candidate understand a job description in depth.

JOB DESCRIPTION:
${(jdText as string).slice(0, 3000)}
${resumeSection}

Analyse this job description thoroughly. Return ONLY valid JSON — no text outside it:
{
  "jobTitle": "<exact job title from the JD>",
  "company": "<company name from the JD, or 'Not specified'>",
  "whatThisRoleIsAbout": "<2-3 sentences in plain English explaining what this person will actually do day to day. Avoid corporate speak. Be specific and honest.>",
  "whatTheyCareAbout": [
    "<the most important skill, tool, or quality they are looking for>",
    "<second most important — be specific, reference the JD>",
    "<third>",
    "<fourth>",
    "<fifth>"
  ],
  "businessProblem": "<2-3 sentences. What problem is this company trying to solve by hiring this role? What is probably going wrong or changing that is making them hire now?>",
  "howToPosition": "<3-4 sentences of direct, specific advice on how the candidate should frame their experience for this role. What to lead with, what angle to take, what to emphasise. Write like a coach speaking directly to the person.>",
  "resumeAlignment": ${hasResume ? `{
    "strengths": ["<what the candidate already has that directly matches what they want — be specific, reference both JD and resume>", "..."],
    "gaps": ["<what the JD requires that is missing or weak on the resume>", "..."],
    "improvements": ["<a specific resume bullet or section change that would make a real difference — e.g. 'Rewrite your stakeholder management bullet to include the number of stakeholders and outcome'>", "..."]
  }` : "null"},
  "interviewFocus": [
    "<the topic or competency that will almost certainly come up in interview — be specific>",
    "<second likely interview focus>",
    "<third>",
    "<fourth>"
  ]
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
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
