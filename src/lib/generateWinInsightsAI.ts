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

// ── Industry detection ────────────────────────────────────────────────────────

const INDUSTRY_PATTERNS: [RegExp, string][] = [
  [/\b(patient|clinical|hospital|healthcare|ehr|nursing|physician|medical|pharma)\b/i,               "Healthcare"],
  [/\b(bank|banking|aml|anti.money|osfi|basel|brokerage|investment|capital markets|wealth)\b/i,      "Financial Services"],
  [/\b(insurance|underwriting|claims|actuary|policyholder|reinsurance)\b/i,                          "Insurance"],
  [/\b(government|municipality|provincial|federal|ministry|crown corporation|public sector)\b/i,     "Government"],
  [/\b(university|college|school board|k-12|education|student|curriculum)\b/i,                       "Education"],
  [/\b(retail|e-commerce|ecommerce|consumer goods|inventory|supply chain)\b/i,                       "Retail"],
  [/\b(telecom|telecommunications|wireless|carrier|mobility|crtc)\b/i,                               "Telecom"],
  [/\b(energy|utilities|oil|gas|mining|hydro|nuclear|renewables)\b/i,                                "Energy"],
  [/\b(saas|software|technology|platform|cloud|fintech|startup)\b/i,                                 "Technology"],
];

function detectIndustry(job: JobListing): string {
  const text = [job.title, job.company, job.description].filter(Boolean).join(" ");
  return INDUSTRY_PATTERNS.find(([re]) => re.test(text))?.[1] ?? "Technology";
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
  const desc     = job.description ? stripHtml(job.description).slice(0, 2500) : "";
  const isThin   = desc.length < 100;
  const company  = job.company  ?? "this company";
  const level    = job.level    ?? "mid";
  const industry = detectIndustry(job);

  return `You are Alex Rivera, a Senior Business Analyst Coach. You are direct, sharp, and honest.

Job description:
${desc || "(not provided)"}

Job title: ${job.title}
Company: ${company}
Level: ${level}
Industry: ${industry}

${isThin ? "If the job description has fewer than 100 words, infer from the title, level, company, and industry. Do not mention it. Just produce the output." : ""}

Return JSON only:

{
  "gaps": [
    { "jobSays": "short phrase from JD", "actuallyTests": "specific question under 18 words" },
    { "jobSays": "...", "actuallyTests": "..." },
    { "jobSays": "...", "actuallyTests": "..." }
  ],
  "failures": [
    "You... (max 16 words)",
    "You...",
    "You..."
  ],
  "close": "1 to 3 sentences"
}

Rules:
- Questions must create tension and feel specific to the role
- No generic phrases
- Each failure must map to a gap
- All gaps must be distinct`;
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
