import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

// The five Phase 1 finding categories. Fixed set, not a lookup table — see
// architecture review. Keep this list and the DB check constraint in sync.
const CATEGORIES = ["requirement", "business_rule", "unresolved_question", "contradiction", "edge_case"] as const;
type Category = typeof CATEGORIES[number];

interface RawFinding {
  category: string;
  text: string;
  evidence: string | null;
  related_finding_index: number | null;
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const SYSTEM_PROMPT = `You are a Senior Business Analyst performing Stakeholder Input Analysis. Your job is to read messy stakeholder input (meeting notes, workshop notes, interview notes, discovery notes, transcripts) and extract structured findings across exactly five categories.

CATEGORIES:

1. requirement — Potential Requirements: statements that appear to describe something the business, user, or solution needs.
2. business_rule — Business Rules: policies, conditions, thresholds, constraints, or rules that govern behaviour.
3. unresolved_question — Unresolved Questions: missing information, ambiguity, or decisions that require stakeholder clarification.
4. contradiction — Contradictions: statements in the supplied material that appear inconsistent with one another.
5. edge_case — Possible Edge Cases: exceptions, failure scenarios, or unusual situations the Business Analyst may need to investigate.

A category can legitimately have zero findings. Do not invent findings to fill a category. Only extract what the input actually supports.

CRITICAL EVIDENCE RULE — this is a hard requirement, not a suggestion:
For every finding, "evidence" must be an EXACT VERBATIM SUBSTRING copied character-for-character from the supplied input, or null if no specific excerpt supports the finding. Do not paraphrase the input and present it as a quote. Do not summarise several sentences into one "quote." Do not invent or reconstruct wording that sounds like the input but is not an exact copy. If you cannot find a specific verbatim span that supports a finding, set evidence to null. A null evidence value is correct and expected sometimes — it is far better than a fabricated quote.

CONTRADICTIONS:
When category is "contradiction", set related_finding_index to the zero-based index of the OTHER finding in this same response that it conflicts with. For every other category, related_finding_index must be null. Only pair two findings that are both being reported as contradiction findings in this response.

RULES:
- Do not invent facts, numbers, stakeholders, or policies not present in the input.
- Do not attribute a finding to the input unless the input actually supports it.
- Keep each finding text to one clear sentence.
- Write plainly, the way an experienced analyst would summarise a point to a colleague. No corporate language, no filler.

Call the submit_findings tool with your results. Do not respond with anything else.`;

const TOOL = {
  name: "submit_findings",
  description: "Submit the structured findings extracted from the stakeholder input.",
  input_schema: {
    type: "object" as const,
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            text: { type: "string", description: "The proposed finding, one clear sentence." },
            evidence: { type: ["string", "null"], description: "Exact verbatim substring from the input, or null if none." },
            related_finding_index: { type: ["integer", "null"], description: "For contradiction findings only: zero-based index of the other finding in this response it conflicts with." },
          },
          required: ["category", "text", "evidence", "related_finding_index"],
        },
      },
    },
    required: ["findings"],
  },
};

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (isRateLimited(`ai:${user.id}`)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { project_id?: string; source_label?: string; source_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { project_id, source_label, source_text } = body;

  if (!project_id || typeof project_id !== "string") {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }
  if (!source_text || typeof source_text !== "string" || source_text.trim().length < 40) {
    return NextResponse.json({ error: "Paste at least a few sentences of stakeholder input before analysing." }, { status: 400 });
  }
  const label = (source_label && typeof source_label === "string" && source_label.trim()) || "Stakeholder Input";

  const db = admin();

  // Ownership check — the admin client bypasses RLS, so ownership must be
  // enforced explicitly here rather than relying on the database.
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  const trimmedInput = source_text.trim();

  let rawFindings: RawFinding[];
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_findings" },
      messages: [{ role: "user", content: trimmedInput }],
    });

    const toolUseBlock = response.content.find(
      (block): block is typeof block & { type: "tool_use"; input: unknown } => block.type === "tool_use"
    );

    if (!toolUseBlock || typeof toolUseBlock.input !== "object" || toolUseBlock.input === null) {
      return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }

    const input = toolUseBlock.input as { findings?: unknown };
    rawFindings = Array.isArray(input.findings) ? (input.findings as RawFinding[]) : [];
  } catch (error) {
    console.error("[ba-intelligence/analyze] AI call failed:", error);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }

  // Server-side validation and integrity checks — never trust the model's
  // compliance with the evidence rule by prompt alone.
  const cleaned: { category: Category; text: string; evidence: string | null; related_finding_index: number | null }[] = [];
  for (const f of rawFindings) {
    if (!f || typeof f.text !== "string" || !f.text.trim()) continue;
    if (!CATEGORIES.includes(f.category as Category)) continue;

    let evidence: string | null = typeof f.evidence === "string" ? f.evidence : null;
    // Evidence must be an exact verbatim substring of the source input. Anything
    // else (paraphrase, reconstruction, hallucination) is discarded rather than
    // trusted — this is a hard product rule, not just a prompt instruction.
    if (evidence && !trimmedInput.includes(evidence)) {
      evidence = null;
    }
    if (evidence !== null && evidence.trim() === "") {
      evidence = null;
    }

    cleaned.push({
      category: f.category as Category,
      text: f.text.trim(),
      evidence,
      related_finding_index: f.category === "contradiction" && typeof f.related_finding_index === "number" ? f.related_finding_index : null,
    });
  }

  // Generate ids up front so contradiction pairs can reference real sibling
  // ids in the same insert, without a second round trip.
  const ids = cleaned.map(() => crypto.randomUUID());

  const { data: session, error: sessionError } = await db
    .from("ba_intel_sessions")
    .insert({
      project_id,
      user_id: user.id,
      source_label: label,
      source_text: trimmedInput,
      status: "analyzed",
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error("[ba-intelligence/analyze] session insert failed:", sessionError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const rows = cleaned.map((f, i) => {
    const linked: string[] = [];
    if (f.category === "contradiction" && f.related_finding_index !== null) {
      const targetId = ids[f.related_finding_index];
      // Only link if the index is valid, points at a real other finding, and
      // that finding is itself a contradiction — otherwise leave unlinked
      // rather than guessing.
      if (targetId && targetId !== ids[i] && cleaned[f.related_finding_index]?.category === "contradiction") {
        linked.push(targetId);
      }
    }
    return {
      id: ids[i],
      session_id: session.id,
      project_id,
      user_id: user.id,
      category: f.category,
      finding_text: f.text,
      original_finding_text: null,
      source_evidence: f.evidence,
      review_status: "proposed",
      linked_finding_ids: linked,
    };
  });

  // Make contradiction links bidirectional: if A points at B, B should point
  // back at A even if the model only stated the relationship from one side.
  const rowsById = new Map(rows.map(r => [r.id, r]));
  for (const row of rows) {
    for (const linkedId of row.linked_finding_ids) {
      const other = rowsById.get(linkedId);
      if (other && !other.linked_finding_ids.includes(row.id)) {
        other.linked_finding_ids.push(row.id);
      }
    }
  }

  let findings: unknown[] = [];
  if (rows.length > 0) {
    const { data: insertedFindings, error: findingsError } = await db
      .from("ba_intel_findings")
      .insert(rows)
      .select();

    if (findingsError) {
      console.error("[ba-intelligence/analyze] findings insert failed:", findingsError);
      // Session already exists with zero findings attached; surface the error
      // rather than silently returning an empty result set.
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
    findings = insertedFindings ?? [];
  }

  return NextResponse.json({ session, findings });
}
