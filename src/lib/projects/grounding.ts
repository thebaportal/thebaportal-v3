// Grounding — is there any project evidence for a project-specific AI request?
//
// The BA may start in any work area, and Project Context is not required. But a
// project name plus a prompt chip ("Identify root causes") is not evidence: the
// model would have nothing real to analyse and would invent plausible facts from
// the title. So before a Work request is sent:
//   - no grounding at all  → do not call the model; ask the BA for information
//   - some grounding       → send, with an explicit statement of what was and was
//                            not supplied, so the model can separate facts,
//                            assumptions and missing information
//
// Grounding can come from: the project brief/context, project notes, approved
// work this area uses (including imported evidence), this area's own current
// work, accepted findings, accepted decisions, the earlier conversation, or
// substantive text the BA typed or pasted now. The project name, industry,
// methodology and the task wording are labels, never evidence.
//
// Pure and framework-free (like workContext.ts) so it is unit-tested directly.

import type { ContextPart } from "./workContext.ts";

export interface GroundingInput {
  project: { name: string; problem_statement?: string | null; relevant_context?: string | null };
  notes: { source_text: string }[];
  parts: ContextPart[];                                  // the area's resolved context (buildWorkContext().parts)
  decisions: { status: string }[];
  conversation: { role: string; content: string }[];     // the history being sent (excluding the new message)
  message: string;                                       // what the BA is sending now
  prompts: string[];                                     // the example prompt chips (any area)
}
export interface Grounding {
  grounded: boolean;
  supplied: string[];                                    // what the request can rely on
  missing: string[];                                     // the kinds of evidence that are absent
}

const MIN_WORDS = 5;
const words = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
const fold = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/**
 * Text that tells the model something about the project: what remains after
 * removing any example prompt and the project's own name still has at least
 * five words. "Identify root causes" or "Identify root causes for Customer
 * Onboarding" are not; "Customers abandon sign-up at the ID check" is.
 */
export function isSubstantive(text: string, prompts: string[], projectName = ""): boolean {
  let rest = ` ${fold(text)} `;
  for (const p of [...prompts].sort((a, b) => b.length - a.length)) {
    const f = fold(p);
    if (f) rest = rest.split(` ${f} `).join(" ");
  }
  const name = fold(projectName);
  if (name) rest = rest.split(` ${name} `).join(" ");
  return words(rest).length >= MIN_WORDS;
}

export function assessGrounding(input: GroundingInput): Grounding {
  const { project, notes, parts, decisions, conversation, message, prompts } = input;
  const supplied: string[] = [], missing: string[] = [];
  const has = (ok: boolean, label: string, absent?: string) => { if (ok) supplied.push(label); else if (absent) missing.push(absent); };

  has(!!(project.problem_statement?.trim() || project.relevant_context?.trim()), "project brief", "project brief or context");
  has(notes.some(n => n.source_text.trim()), "project notes", "project notes");
  const work = parts.filter(p => (p.kind === "artifact" || p.kind === "current-approved" || p.kind === "testing-scope") && (p.artifactIds?.length || p.baselineIds?.length));
  has(work.length > 0, `approved work (${work.map(p => p.strip).filter(Boolean).join(", ")})`, "approved or imported work for this area");
  has(parts.some(p => p.kind === "current-draft"), "this area's current draft");
  has(parts.some(p => p.kind === "findings"), "accepted BA Intelligence findings", "accepted findings");
  has(decisions.some(d => d.status === "accepted"), "accepted decisions");
  has(conversation.some(m => m.role === "assistant" || isSubstantive(m.content, prompts, project.name)), "earlier conversation");
  has(isSubstantive(message, prompts, project.name), "the Business Analyst's message");

  return { grounded: supplied.length > 0, supplied, missing };
}

/**
 * Appended to every Work area's system prompt. Takes precedence over any
 * instruction in that prompt to infer, assume or generate immediately.
 */
export const EVIDENCE_RULES = `

---

EVIDENCE AND GROUNDING — this section overrides any instruction above to infer, assume or generate immediately:
- Facts are only what the project material in the request or the Business Analyst has actually supplied. The project name, industry, methodology and the wording of the task are labels, not evidence.
- Never present project-specific content (root causes, stakeholders, processes, requirements, figures, history) as established when nothing supplied supports it. Do not invent facts because of what the project is called.
- Keep three things visibly separate: facts that were supplied, assumptions you are making, and information that is missing.
- If the supplied evidence is not enough to do the task responsibly, do not produce the full deliverable. Say plainly what is missing and ask for it. For example: "I can help identify possible root causes, but I don't yet have enough project evidence to determine which ones apply. Tell me what is happening today, what problem you're seeing, and any symptoms or constraints you already know." You may list general possibilities to explore, clearly labelled as general and unconfirmed, never as conclusions about this project.
- Never say or imply that you have context, documents, data or information that was not supplied.`;

/**
 * The statement sent with every Work request, just before the BA's message, so
 * the model knows exactly what it has — and that the project name is not evidence.
 */
export function evidenceStatement(g: Grounding): string {
  return [
    "[EVIDENCE AVAILABLE]",
    `Supplied: ${g.supplied.length ? g.supplied.join("; ") : "nothing beyond the project name"}.`,
    g.missing.length ? `Not supplied: ${g.missing.join("; ")}.` : "",
    "Treat as fact only what the supplied material above and the Business Analyst's message actually state. The project name, industry, methodology and the task wording are labels, not evidence: never infer facts about this project from them. Keep facts, assumptions and missing information visibly separate, and if the evidence is not enough for the task, say so plainly and ask for what is needed instead of inventing it.",
  ].filter(Boolean).join("\n");
}
