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
  preview: PreviewBullet[];
  full:    string[];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildPrompt(
  job:        { title: string; company: string | null; level: string; description: string | null },
  gaps:       string[],
  failures:   string[],
  resumeText: string,
): string {
  const desc     = job.description ? stripHtml(job.description).slice(0, 2000) : "(not provided)";
  const gapList  = gaps.map(g => `- ${g}`).join("\n");
  const failList = failures.map(f => `- ${f}`).join("\n");

  return `You are a Senior Business Analyst rewriting a candidate's experience to match a specific job.

You are direct, practical, and focused on business impact. No fluff. No generic statements.

Job description:
${desc}

Job title: ${job.title}
Company: ${job.company ?? "this company"}
Level: ${job.level}

What this role actually tests:
${gapList}

Where candidates fail:
${failList}

Candidate experience:
${resumeText.slice(0, 3000)}

Your task:
Rewrite the candidate's experience into strong, job-aligned resume bullets.

Rules:
- Each bullet must show: action, business context, and impact or outcome
- Replace generic language with specific BA actions: elicited requirements, mapped processes, facilitated workshops, supported UAT, analyzed data
- Tie bullets directly to what this job actually tests
- Fix weak phrasing — Bad: "worked with stakeholders" / Good: "facilitated workshops with finance and operations to resolve conflicting requirements"
- Do not invent experience. Do not exaggerate seniority. Do not use buzzwords or filler.
- preview.original must be verbatim from the candidate's resume — pick the weakest bullets

Return JSON only:

{
  "preview": [
    {
      "original": "verbatim weak bullet copied from their resume",
      "rewritten": "stronger version showing action, business context, and measurable impact",
      "whyItFails": "one blunt sentence explaining why the original fails"
    },
    {
      "original": "second weak bullet verbatim from their resume",
      "rewritten": "stronger version",
      "whyItFails": "one blunt sentence"
    }
  ],
  "full": [
    "rewritten bullet 1 — job-aligned, specific, impact-driven",
    "rewritten bullet 2",
    "rewritten bullet 3",
    "rewritten bullet 4",
    "rewritten bullet 5"
  ]
}`;
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

  if (!Array.isArray(obj.full) || obj.full.length < 1) return false;
  for (const b of obj.full) {
    if (typeof b !== "string" || !b.trim()) return false;
  }

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
      .select("id, title, company, level, description, win_insights")
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

    // Extract gaps + failures from win_insights, fall back to sensible defaults
    const aiInsights = job.win_insights as AIWinInsights | null;
    const gaps = aiInsights?.gaps?.map(g => g.actuallyTests) ?? [
      "Produce BA deliverables independently without close supervision",
      "Navigate stakeholder conflict and drive decisions under pressure",
      "Connect requirements directly to measurable business outcomes",
    ];
    const failures = aiInsights?.failures ?? [
      "You describe activity but cannot show a business outcome",
      "You list tools used but not decisions influenced",
      "You talk about teams without showing what you personally drove",
    ];

    // Generate (retry once on parse failure)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = buildPrompt(job, gaps, failures, raw_text);

    async function callOnce(): Promise<TransformOutput | null> {
      const message = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1400,
        messages:   [{ role: "user", content: prompt }],
      });
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      try {
        const parsed = JSON.parse(text);
        return validate(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }

    const output = (await callOnce()) ?? (await callOnce());
    if (!output) {
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
        full:    output.full,
        locked:  false,
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
