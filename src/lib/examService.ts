import { createClient } from "@/lib/supabase/server";
import type { BABOKArea, Difficulty, ExamQuestion } from "@/lib/examTypes";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rowToQuestion(row: Record<string, unknown>): ExamQuestion {
  return {
    id:           row.id as string,
    area:         row.area as BABOKArea,
    difficulty:   row.difficulty as Difficulty,
    question:     row.question as string,
    options:      row.options as string[],
    correctIndex: row.correct_index as number,
    explanation:  row.explanation as string,
    babokRef:     row.babok_ref as string,
    technique:    row.technique as string,
  };
}

export async function getPracticeQuestions(
  area: BABOKArea | "all",
  count: number,
  difficulty: string,
): Promise<ExamQuestion[]> {
  const supabase = createClient();

  let query = supabase
    .from("exam_questions")
    .select("id, area, difficulty, question, options, correct_index, explanation, babok_ref, technique");

  if (area !== "all") query = query.eq("area", area);
  if (difficulty !== "mixed") query = query.eq("difficulty", difficulty);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  return shuffle(data.map(rowToQuestion)).slice(0, Math.min(count, data.length));
}

export async function getMockQuestions(): Promise<ExamQuestion[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exam_questions")
    .select("id, area, difficulty, question, options, correct_index, explanation, babok_ref, technique")
    .in("area", ["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation", "agile"]);

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  // 7 core KA areas × 17 questions = 119, +1 extra = 120
  const coreAreas: BABOKArea[] = ["planning", "elicitation", "lifecycle", "strategy", "analysis", "evaluation", "agile"];
  const selected: ExamQuestion[] = [];
  const usedIds = new Set<string>();

  for (const a of coreAreas) {
    const pool = shuffle(data.filter(r => r.area === a).map(rowToQuestion));
    pool.slice(0, 17).forEach(q => { selected.push(q); usedIds.add(q.id); });
  }

  const extras = shuffle(data.filter(r => !usedIds.has(r.id as string)).map(rowToQuestion)).slice(0, 1);
  extras.forEach(q => selected.push(q));

  return shuffle(selected);
}
