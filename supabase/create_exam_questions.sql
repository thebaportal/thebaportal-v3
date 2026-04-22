-- Exam questions table
-- Run this in the Supabase SQL editor before seeding

CREATE TABLE IF NOT EXISTS exam_questions (
  id           TEXT PRIMARY KEY,
  area         TEXT NOT NULL,
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('ecba', 'ccba', 'cbap')),
  question     TEXT NOT NULL,
  options      JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation  TEXT NOT NULL,
  babok_ref    TEXT NOT NULL DEFAULT '',
  technique    TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_area       ON exam_questions(area);
CREATE INDEX IF NOT EXISTS idx_exam_questions_difficulty ON exam_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_questions_area_diff  ON exam_questions(area, difficulty);

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read questions
CREATE POLICY "exam_questions_select"
  ON exam_questions FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (used by seed route)
CREATE POLICY "exam_questions_service_write"
  ON exam_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
