-- Add final_redirect_url column to job_listings.
-- Safe to re-run — uses IF NOT EXISTS guard.

ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS final_redirect_url TEXT;

-- Backfill existing verified rows
UPDATE job_listings
SET final_redirect_url = verified_apply_url
WHERE final_redirect_url IS NULL
  AND verified_apply_url IS NOT NULL;
