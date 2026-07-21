import { getCareerUser } from "@/lib/career-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 15;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { text } = await req.json();
  if (!text || text.trim().length < 50) return Response.json({ error: "Too short" }, { status: 400 });

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Extract structured data from this job posting. Return ONLY valid JSON, nothing else.

JOB POSTING:
${text.slice(0, 3000)}

Return:
{
  "title": <job title, exact as posted>,
  "company": <company name>,
  "location": <city and province/country if mentioned, null if not found>,
  "apply_url": <direct application URL if found in the text, null if not found>
}`
      }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const extracted = JSON.parse(jsonStr);
    return Response.json({ extracted });
  } catch {
    return Response.json({ extracted: { title: "", company: "", location: null, apply_url: null } });
  }
}
