-- ============================================================
-- Migration: add source health columns to employer_sources
-- Run once in Supabase SQL editor.
-- ============================================================

ALTER TABLE employer_sources
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error      TEXT;

-- Confirm
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_name = 'employer_sources'
ORDER  BY ordinal_position;
