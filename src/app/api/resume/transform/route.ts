/**
 * POST /api/resume/transform
 *
 * Takes a job_id and raw resume text. Calls Claude Sonnet, validates
 * the structured output, saves to DB if logged in, then returns:
 *  - preview (2 bullets) for everyone
 *  - full output only for pro subscribers
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { AIWinInsights } from "@/lib/generateWinInsightsAI";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviewBullet {
  original:   string;
  rewritten:  string;
  whyItFails: string;
}

interface TransformOutput {
  preview:            PreviewBullet[];
  missingSignals:     string[];
  additionalBullets:  string[];
  positioningSummary: string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  job:        { title: string; company: string | null; level: string },
  gaps:       string[],
  resumeText: string,
): string {
  const expectations = gaps.map(g => `- ${g}`).join("\n");

  return `You are Alex Rivera, Senior BA Coach.
You are reviewing a candidate's resume against a specific job.

Job context:
Title: ${job.title}
Company: ${job.company ?? "this company"}
Level: ${job.level}
Key expectations:
${expectations}

Candidate resume:
${resumeText.slice(0, 3000)}

Return JSON only:

{
  "preview": [
    {
      "original": "verbatim weak bullet copied from their resume",
      "rewritten": "stronger version showing conflict, decision, and measurable impact",
      "whyItFails": "one blunt sentence"
    },
    {
      "original": "second weak bullet verbatim",
      "rewritten": "stronger version",
      "whyItFails": "one blunt sentence"
    }
  ],
  "missingSignals": [
    "what the resume fails to prove",
    "what is weak or vague",
    "what is completely missing"
  ],
  "additionalBullets": [
    "rewritten bullet 3",
    "rewritten bullet 4"
  ],
  "positioningSummary": "2-3 sentences on how to reframe their profile for this specific role"
}

Rules:
- Be blunt. Focus on proof, not wording.
- Rewritten bullets must show business impact, a decision made, or a conflict resolved.
- If the resume has no strong bullets to work from, infer from common BA experience at this level and show what they should be writing.
- positioningSummary must be specific to this role and company, not generic advice.`;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(raw: unknown): raw is TransformOutput {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.preview) || obj.preview.length < 1) return false;
  for (const item of obj.preview) {
    if (!item || typeof item !== "object") return false;
    const p = item as Record<string, unknown>;
    if (typeof p.original   !== "string" || !p.original.trim())   return false;
    if (typeof p.rewritten  !== "string" || !p.rewritten.trim())  return false;
    if (typeof p.whyItFails !== "string" || !p.whyItFails.trim()) return false;
  }

  if (!Array.isArray(obj.missingSignals))    return false;
  if (!Array.isArray(obj.additionalBullets)) return false;
  if (typeof obj.positioningSummary !== "string" || !obj.positioningSummary.trim()) return false;

  return true;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { job_id, raw_text } = await request.json();

    if (!job_id || !raw_text?.trim()) {
      return NextResponse.json({ error: "Missing job_id or resume text" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch job + cached insights
    const { data: job, error: jobErr } = await admin
      .from("job_listings")
      .select("id, title, company, level, win_insights")
      .eq("id", job_id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check subscription
    let isPro = false;
    if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      isPro = profile?.subscription_tier === "pro";
    }

    // Extract gap questions as expectations
    const aiInsights = job.win_insights as AIWinInsights | null;
    const gaps = aiInsights?.gaps?.map(g => g.actuallyTests) ?? [
      "Produce BA deliverables independently without close supervision",
      "Navigate stakeholder conflict and drive decisions under pressure",
      "Connect requirements directly to measurable business outcomes",
    ];

    // Generate
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = buildPrompt(job, gaps, raw_text);

    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1400,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let output: TransformOutput;
    try {
      const parsed = JSON.parse(raw);
      if (!validate(parsed)) throw new Error("Invalid structure");
      output = parsed;
    } catch {
      return NextResponse.json({ error: "Generation failed — please try again" }, { status: 422 });
    }

    // Save to DB (non-blocking, non-fatal)
    if (user) {
      void admin.from("resume_transformations").insert({
        user_id:            user.id,
        job_id,
        raw_input:          raw_text,
        transformed_output: output,
      });
    }

    // Gate: preview for everyone, full for pro only
    if (isPro) {
      return NextResponse.json({
        preview: output.preview.slice(0, 2),
        full: {
          missingSignals:    output.missingSignals,
          additionalBullets: output.additionalBullets,
          positioningSummary: output.positioningSummary,
        },
        locked: false,
      });
    }

    return NextResponse.json({
      preview: output.preview.slice(0, 2),
      locked:  true,
    });

  } catch (err) {
    console.error("[resume/transform]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
