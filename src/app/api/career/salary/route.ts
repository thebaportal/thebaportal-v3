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

  const { offerAmount, currency, jobTitle, yearsExp, location, notes } = await req.json();
  if (!offerAmount) {
    return Response.json({ error: "Offer amount is required." }, { status: 400 });
  }

  const prompt = `You are a BA career coach helping a client evaluate and negotiate a job offer. Give them practical, honest advice — not platitudes.

OFFER DETAILS:
- Job title: ${jobTitle || "Business Analyst"}
- Offer amount: ${currency || ""}${offerAmount}
- Years of experience: ${yearsExp || "Not specified"}
- Location/market: ${location || "Not specified"}
- Additional context: ${notes || "None"}

Analyse this offer and give concrete negotiation strategies. Be honest if the offer is strong or if they have limited leverage. Don't use filler language.

Return ONLY valid JSON — no text outside it:
{
  "offerAssessment": "<honest 2-3 sentence read on this offer — is it competitive, low, or hard to judge without more context? Say which.>",
  "negotiationStrategies": [
    {
      "strategy": "<name of the strategy>",
      "script": "<exact words they could use — write it like dialogue, in first person>",
      "when": "<when to use this strategy and why it works>"
    }
  ],
  "counterOfferRange": "<suggest a specific counter-offer range if applicable, or explain why it's difficult to estimate>",
  "beyondSalary": ["<3-4 non-salary items worth negotiating: leave, flexible working, training budget, review timeline, etc.>"],
  "redFlags": ["<any red flags in this offer or process to watch for — or empty array if none>"],
  "bottomLine": "<the single most important piece of advice for this specific situation — direct and honest>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return Response.json(data);
  } catch (err) {
    console.error("Salary negotiation error:", err);
    return Response.json({ error: "Could not analyse offer. Please try again." }, { status: 500 });
  }
}
