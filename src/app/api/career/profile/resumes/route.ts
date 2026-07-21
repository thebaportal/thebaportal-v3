import { getCareerUser } from "@/lib/career-auth";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET — list all resumes for the current user
export async function GET() {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await admin()
    .from("user_resumes")
    .select("id, name, file_name, is_default, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ resumes: data ?? [] });
}

// POST — upload, parse, and store a new resume
export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const pastedText = formData.get("text") as string | null;
  const name = (formData.get("name") as string | null)?.trim() || "My Resume";

  let rawText = "";
  let fileName = "";

  if (pastedText && pastedText.trim().length > 50) {
    rawText = pastedText.trim();
    fileName = "pasted-resume.txt";
  } else if (file) {
    fileName = file.name;
    const fname = file.name.toLowerCase();

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (fname.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else if (fname.endsWith(".doc")) {
        const WordExtractor = (await import("word-extractor")).default;
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        rawText = extracted.getBody();
      } else if (fname.endsWith(".pdf")) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer);
        rawText = result.text;
      } else if (fname.endsWith(".txt") || fname.endsWith(".rtf")) {
        rawText = await file.text();
      } else {
        rawText = await file.text();
      }
    } catch (parseErr) {
      console.error("[profile/resumes] parse error:", parseErr);
      return Response.json({
        error: "We could not read that file. Please try a Word (.docx), PDF, or paste your text directly.",
      }, { status: 422 });
    }
  } else {
    return Response.json({ error: "Please upload a file or paste your resume text." }, { status: 400 });
  }

  rawText = rawText.replace(/\s{3,}/g, "\n\n").trim();

  if (rawText.length < 100) {
    return Response.json({
      error: "We could not extract enough text from that file. Please paste your resume text directly.",
    }, { status: 422 });
  }

  const db = admin();

  // Check if this is their first resume
  const { count, error: countErr } = await db
    .from("user_resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countErr) {
    console.error("[profile/resumes] count error:", countErr);
    return Response.json({ error: countErr.message }, { status: 500 });
  }

  const isFirst = (count ?? 0) === 0;

  const { data, error: insertErr } = await db
    .from("user_resumes")
    .insert({ user_id: user.id, name, raw_text: rawText, file_name: fileName, is_default: isFirst })
    .select("id, name, file_name, is_default, created_at")
    .single();

  if (insertErr) {
    console.error("[profile/resumes] insert error:", insertErr);
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  return Response.json({ resume: data });
}
