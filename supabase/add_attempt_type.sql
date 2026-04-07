-- Add attempt_type discriminator to challenge_attempts
-- Run this in Supabase SQL editor before deploying Interview Lab

ALTER TABLE challenge_attempts
  ADD COLUMN IF NOT EXISTS attempt_type TEXT DEFAULT 'simulation';

-- Backfill existing rows
UPDATE challenge_attempts
  SET attempt_type = 'simulation'
  WHERE attempt_type IS NULL;
