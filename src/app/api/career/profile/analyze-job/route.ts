import { getCareerUser } from "@/lib/career-auth";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface JobAnalysis {
  score: number;
  recommendation: "apply_now" | "improve_first" | "move_on";
  recommendation_reason: string;
  effort_estimate: string | null;
  priority_task: string | null;
  strengths: string[];
  gaps: string[];
  hidden: string[];
  action_tool: "resume" | "jd" | "interview" | "cover_letter" | null;
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { job_id, force, source = "portal" } = await req.json();
  if (!job_id) return Response.json({ error: "Missing job_id" }, { status: 400 });

  const db = admin();

  let jobTitle = "", jobCompany = "", jdText = "";
  let cachedAnalysis: JobAnalysis | null = null;
  let cachedResumeIds: string[] | null = null;

  if (source === "user") {
    const { data } = await db
      .from("user_jobs")
      .select("title, company, description, analysis_result, analyzed_resume_ids")
      .eq("id", job_id).eq("user_id", user.id).single();
    if (!data) return Response.json({ error: "Job not found" }, { status: 404 });
    jobTitle = data.title; jobCompany = data.company; jdText = data.description;
    cachedAnalysis = data.analysis_result as JobAnalysis | null;
    cachedResumeIds = data.analyzed_resume_ids as string[] | null;
  } else {
    const { data: savedJob } = await db
      .from("saved_jobs")
      .select("id, analysis_result, analyzed_resume_ids")
      .eq("user_id", user.id).eq("job_id", job_id).single();
    if (!savedJob) return Response.json({ error: "Job not saved" }, { status: 404 });
    cachedAnalysis = savedJob.analysis_result as JobAnalysis | null;
    cachedResumeIds = savedJob.analyzed_resume_ids as string[] | null;

    const { data: listing } = await db
      .from("job_listings")
      .select("title, company, description")
      .eq("id", job_id).single();
    if (!listing?.description) return Response.json({ error: "Job description not available." }, { status: 400 });
    jobTitle = listing.title; jobCompany = listing.company ?? ""; jdText = listing.description;
  }

  const { data: resumes } = await db
    .from("user_resumes")
    .select("id, name, raw_text, is_default")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!resumes || resumes.length === 0) {
    return Response.json({ error: "no_resumes", message: "Upload at least one resume in your Career Profile before analysing jobs." }, { status: 400 });
  }

  const resumeIds = resumes.map(r => r.id).sort();

  if (!force && cachedAnalysis && cachedResumeIds) {
    const sorted = [...cachedResumeIds].sort();
    if (JSON.stringify(sorted) === JSON.stringify(resumeIds)) {
      return Response.json({ analysis: cachedAnalysis, cached: true });
    }
  }

  const defaultResume = resumes.find(r => r.is_default) ?? resumes[0];
  const others = resumes.filter(r => r.id !== defaultResume.id);

  let resumeContext = `CURRENT RESUME ("${defaultResume.name}"):\n${defaultResume.raw_text}`;
  if (others.length > 0) {
    resumeContext += "\n\n---\n\nPREVIOUS RESUME VERSIONS:";
    others.forEach((r, i) => { resumeContext += `\n\nVersion ${i + 1} — "${r.name}":\n${r.raw_text}`; });
  }

  const cleanJd = jdText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const prompt = `You are a trusted career advisor. You have the user's complete career history across all resume versions. Your job is to give them an honest, specific assessment of their fit for this role and tell them exactly what to do next.

ROLE: ${jobTitle} at ${jobCompany}

JOB DESCRIPTION:
${cleanJd.slice(0, 4000)}

${resumeContext.slice(0, 12000)}

---

STEP 1 — EXTRACT CAREER EVIDENCE
Before assessing fit, extract the actual work performed across all resume versions. Focus on:
- Responsibilities and deliverables (what they built, led, or delivered)
- Business outcomes (what changed because of their work)
- Technologies, tools, and methodologies used
- Stakeholder interactions and communication patterns
- Process improvement, analysis, or problem-solving work

Evaluate based on demonstrated experience, responsibilities, deliverables, and business outcomes across all resume versions. Do not infer capability primarily from job titles. Treat titles only as contextual labels. Base your assessment on the work performed.

STEP 2 — TWO-LAYER FIT ASSESSMENT

Layer A — Underlying fit: Does the career evidence show the skills and experience this role genuinely requires, regardless of how the resume is currently presented?

Layer B — Positioning fit: If a recruiter spent 6 seconds on the current resume, would they immediately see the match? Or would a title mismatch, buried experience, or missing keywords cause them to filter this person out before reading the evidence?

RECOMMENDATION LOGIC:
- "apply_now": Underlying fit is strong AND the resume already shows it clearly. Further editing is unlikely to improve their chances.
- "improve_first": Underlying fit is strong BUT there is one specific gap — either a real skills gap OR a positioning/presentation issue (e.g. a title that doesn't reflect BA work, buried relevant experience, a missing keyword the ATS will filter on). Name the exact fix. One task only.
- "move_on": Underlying fit is genuinely poor. No amount of resume editing changes this. Be direct.

CRITICAL VOICE RULES:
- Write recommendation_reason directly to the user in second person. "Your background..." or "You have..." — never "This candidate" or "The candidate"
- Be warm, honest, and direct — like a trusted advisor who knows their full career history
- Be specific. Name the actual role, the actual gap, the actual fix.
- Do not use em-dashes or dashes in your response. Use plain sentences instead.

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON:
{
  "score": <0-100 integer>,
  "recommendation": <"apply_now" | "improve_first" | "move_on">,
  "recommendation_reason": <1-2 plain English sentences directly to the user — warm, honest, specific. No jargon. No "this candidate.">,
  "effort_estimate": <"10 minutes" | "20 minutes" | "30 minutes" | null>,
  "priority_task": <one specific named task if improve_first, null otherwise>,
  "strengths": [<2-3 short strings — what they have that this role wants>],
  "gaps": [<0-3 short strings — genuine gaps only, empty array if apply_now>],
  "hidden": [<0-2 short strings — experience in older resume versions relevant here but missing from current resume>],
  "action_tool": <"resume" | "jd" | "interview" | "cover_letter" | null>
}`;

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let analysis: JobAnalysis;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    analysis = JSON.parse(jsonStr);
  } catch {
    return Response.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }

  const table = source === "user" ? "user_jobs" : "saved_jobs";
  const idField = source === "user" ? "id" : "job_id";

  await db
    .from(table)
    .update({ analysis_result: analysis, analyzed_at: new Date().toISOString(), analyzed_resume_ids: resumeIds })
    .eq(idField, job_id)
    .eq("user_id", user.id);

  return Response.json({ analysis, cached: false });
}
