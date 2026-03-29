/**
 * AI-powered Win This Role insight generator.
 *
 * Calls Claude Haiku with a structured prompt that reads the actual job
 * description and produces role-specific gaps, failure bullets, and a
 * closing challenge. Validates the response and retries once on failure.
 * Returns null if both attempts fail — caller falls back to rule engine.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { JobListing } from "./jobInsights";

// ── Output type ───────────────────────────────────────────────────────────────

export interface AIWinInsights {
  gaps:     Array<{ jobSays: string; actuallyTests: string }>;
  failures: string[];
  close:    string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g,    " ")
    .trim();
}

function buildPrompt(job: JobListing): string {
  const desc = job.description
    ? stripHtml(job.description).slice(0, 2000)
    : "";

  const isThin = desc.length < 100;

  const context = [
    `Job title: ${job.title}`,
    job.company  ? `Company: ${job.company}`   : null,
    job.location ? `Location: ${job.location}` : null,
    `Level: ${job.level}`,
    `Work type: ${job.work_type}`,
    desc ? `\nJob description:\n${desc}` : null,
  ].filter(Boolean).join("\n");

  return `You are Alex Rivera, a Senior Business Analyst Coach. Your job is to look at a job description and tell the candidate exactly what they are missing. You are direct, sharp, and honest. No sugarcoating. No fluff.

${context}

${isThin ? "The job description is thin. Infer from the job title, level, company, and industry. Do not mention that the description is thin. Produce the output directly." : ""}

You need to output three things:

1. Three gap comparisons. Each is:
   - A short phrase from the job description (what the job says) — or inferred from the role if the JD is thin. Keep this under 12 words.
   - A single question that exposes what they actually test in the interview. Max 18 words.

   The question must:
   - Be specific to this job and company type
   - Create tension
   - Make the candidate feel they cannot answer it confidently
   - Never be generic

   Good examples:
   "Can you get two directors to agree when both think they are right?"
   "Requirements will change mid-sprint. Will you stay in control or lose direction?"
   "Can you trace that process failure to its root cause without the process map?"

2. Three failure bullets. Each starts with "You" and is one sentence that describes why candidates lose this specific role. Max 16 words each.

   Good examples:
   "You say stakeholder management but cannot describe a real conflict you resolved."
   "You list agile but fall apart when requirements change without warning."

3. A short closing challenge. Direct and uncomfortable. Max 3 sentences.

   Good example:
   "Most candidates read this and still apply the same way. They get screened out. If you do not prepare differently, this role is not yours."

RULES:
- Do not use: "great opportunity", "fast paced environment", "team player", "strong communication skills", "collaborate with stakeholders"
- Each gap must be distinct — no repeating the same insight in different words
- Be sharp. Be honest. Do not be polite.

Return ONLY valid JSON. No markdown. No explanation. No text before or after the JSON.

{
  "gaps": [
    { "jobSays": "...", "actuallyTests": "..." },
    { "jobSays": "...", "actuallyTests": "..." },
    { "jobSays": "...", "actuallyTests": "..." }
  ],
  "failures": ["You...", "You...", "You..."],
  "close": "..."
}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(raw: unknown): raw is AIWinInsights {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.gaps) || obj.gaps.length !== 3) return false;
  for (const gap of obj.gaps) {
    if (!gap || typeof gap !== "object") return false;
    const g = gap as Record<string, unknown>;
    if (typeof g.jobSays !== "string"      || !g.jobSays.trim())      return false;
    if (typeof g.actuallyTests !== "string"|| !g.actuallyTests.trim()) return false;
  }

  if (!Array.isArray(obj.failures) || obj.failures.length !== 3) return false;
  for (const f of obj.failures) {
    if (typeof f !== "string" || !f.trim())      return false;
    if (!/^You\b/i.test(f.trim()))               return false;
  }

  if (typeof obj.close !== "string" || !obj.close.trim()) return false;

  return true;
}

// ── Single model call ─────────────────────────────────────────────────────────

async function callModel(prompt: string): Promise<AIWinInsights | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  // Strip markdown fences if the model added them
  const json = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(json);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function generateWinInsightsAI(job: JobListing): Promise<AIWinInsights | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[generateWinInsightsAI] ANTHROPIC_API_KEY not set — skipping");
    return null;
  }

  const prompt = buildPrompt(job);

  const first = await callModel(prompt);
  if (first) return first;

  console.warn(`[generateWinInsightsAI] Validation failed for job ${job.id} — retrying once`);
  const second = await callModel(prompt);
  if (second) return second;

  console.error(`[generateWinInsightsAI] Both attempts failed for job ${job.id} — rule engine will be used`);
  return null;
}
