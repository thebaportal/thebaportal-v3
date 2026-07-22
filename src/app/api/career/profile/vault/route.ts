import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function parseJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { question, answer, jdText } = await req.json();
  if (!question?.trim() || !answer?.trim()) {
    return Response.json({ error: "Missing question or answer" }, { status: 400 });
  }

  const db = admin();

  // Save the candidate's exact words immediately — before anything else
  const { data: entry, error: insertErr } = await db
    .from("user_experience_vault")
    .insert({ user_id: user.id, question: question.trim(), answer: answer.trim() })
    .select("id")
    .single();

  if (insertErr || !entry) {
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }

  // Generate retrieval tags (Haiku — fast, non-critical — entry is already saved)
  try {
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Extract retrieval tags from this Q&A. Return JSON only — no explanation.

Question: ${question.trim()}
Answer: ${answer.trim().slice(0, 500)}${jdText ? `\nRole context: ${(jdText as string).slice(0, 400)}` : ""}

Return: {"skills": ["contract negotiation", "..."], "domains": ["construction", "..."], "jurisdictions": ["Alberta", "..."]}`,
      }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const tags = parseJSON(raw);
    if (tags) await db.from("user_experience_vault").update({ tags }).eq("id", entry.id);
  } catch { /* tags are optional — entry is saved regardless */ }

  return Response.json({ ok: true, id: entry.id });
}
