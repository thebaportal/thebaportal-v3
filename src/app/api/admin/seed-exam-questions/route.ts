import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-time seed endpoint. Protected by SEED_SECRET env var.
// Call with: POST /api/admin/seed-exam-questions
// Headers: { "x-seed-secret": "<SEED_SECRET>" }

export async function POST(req: Request) {
  const secret = req.headers.get("x-seed-secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Dynamic import keeps examQuestions.ts out of the client bundle
  const { QUESTIONS } = await import("@/data/examQuestions");

  const rows = QUESTIONS.map(q => ({
    id:            q.id,
    area:          q.area,
    difficulty:    q.difficulty,
    question:      q.question,
    options:       q.options,
    correct_index: q.correctIndex,
    explanation:   q.explanation,
    babok_ref:     q.babokRef,
    technique:     q.technique,
  }));

  // Upsert in batches of 100 to stay within request limits
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("exam_questions")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return NextResponse.json(
        { error: error.message, insertedSoFar: inserted },
        { status: 500 },
      );
    }
    inserted += batch.length;
  }

  return NextResponse.json({ success: true, inserted });
}
