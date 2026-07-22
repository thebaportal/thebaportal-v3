import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 20;

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function parseJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jdText, resumeText } = await req.json();
  if (!jdText?.trim() || !resumeText?.trim()) return Response.json({ questions: [] });

  // Fetch the vault — skip quietly if it fails
  let vaultBlock = "";
  try {
    const { data: entries } = await admin()
      .from("user_experience_vault")
      .select("question, answer, tags")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);
    if (entries && entries.length > 0) {
      type VE = { question: string; answer: string; tags?: Record<string, string> | null };
      const all = entries as VE[];
      const regular = all.filter(e => e.tags?.type !== "tailored_resume").slice(0, 15);
      const previous = all.filter(e => e.tags?.type === "tailored_resume");

      if (regular.length > 0) {
        vaultBlock += `\n\nCANDIDATE EXPERIENCE VAULT (confirmed evidence — each entry is a fully resolved gap):\n${
          regular.map((e, i) => `[Vault ${i + 1}]\nQ: ${e.question}\nA: ${e.answer.slice(0, 350)}`).join("\n\n")
        }\n\nFor every question you consider asking: check whether a vault entry already addresses it. If yes, that gap is resolved — drop the question. Default to skipping. Only include a question if the gap has zero vault coverage and the answer would materially change the output.`;
      }
      if (previous.length > 0) {
        vaultBlock += `\n\nPREVIOUSLY TAILORED RESUME (this candidate already completed this process for a similar role):\n${previous[0].answer.slice(0, 2500)}\n\nIf this JD requires substantially the same experience as the role above, return an empty questions array immediately. Only generate questions for requirements this tailored resume genuinely does not address.`;
      }
    }
  } catch { /* vault is optional */ }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are reviewing a job application to find specific gaps where the candidate's resume does not clearly show required experience, but where their career background suggests the experience may exist and simply was not included or described clearly.

JOB DESCRIPTION:
${(jdText as string).slice(0, 6000)}

CANDIDATE RESUME:
${(resumeText as string).slice(0, 6000)}${vaultBlock}

TASK: Identify up to 5 questions to ask the candidate before building their application. Each question must:
- Address a requirement that materially affects whether this candidate gets an interview
- Be plausible given their known background — only ask if their career history makes the experience possible
- Produce a specific, usable change in the resume, cover letter, or interview prep if answered with useful detail
- Be one direct sentence

Do NOT ask about experience the resume already clearly demonstrates.
Do NOT ask questions where the answer would not change what gets written.
Do NOT re-ask anything already answered by the vault or covered by the previous tailored resume.
Default to fewer questions, not more. When in doubt, skip the question.
Return an empty array if the vault and previous resume together cover all material gaps for this role.

TONE — each question must sound like a recruiter asking in a conversation, not a formal document:
- Short sentences. One question per entry. Plain everyday language.
- No hyphens, no "or has your role been primarily", no "and if so", no legal phrasing.
- Bad: "Have you administered contracts that included holdback provisions under a specific provincial construction lien framework, and if so, which province?"
- Good: "Have you dealt with construction holdbacks before? Which province?"
- Bad: "Did any of the capital project packages you contracted involve civil, mechanical, or electrical construction scopes?"
- Good: "What types of construction work were you buying at Suncor — civil, mechanical, electrical?"

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "<one direct question>",
      "targets": "<what a useful answer unlocks — e.g. 'SCM Advisor bullet on contract negotiation'>"
    }
  ]
}`;

  try {
    const r = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = r.content[0].type === "text" ? r.content[0].text : "";
    const parsed = parseJSON(raw);
    return Response.json({ questions: (parsed.questions ?? []).slice(0, 5) });
  } catch {
    return Response.json({ questions: [] });
  }
}
