-- URL verification columns for job_listings.
-- Run in Supabase SQL editor before deploying the verify pipeline.

ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS raw_apply_url      TEXT,
  ADD COLUMN IF NOT EXISTS verified_apply_url TEXT,
  ADD COLUMN IF NOT EXISTS apply_url_status   TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS last_verified_at   TIMESTAMPTZ;

-- Non-Workday sources (Greenhouse, Lever, SmartRecruiters) have stable URLs.
-- Mark them valid immediately so they get Apply buttons right away.
UPDATE job_listings
SET
  raw_apply_url      = apply_url,
  verified_apply_url = apply_url,
  apply_url_status   = 'valid',
  last_verified_at   = NOW()
WHERE source_type IN ('greenhouse', 'lever', 'smartrecruiters');

-- Existing Workday jobs need verification.
UPDATE job_listings
SET
  raw_apply_url    = apply_url,
  apply_url_status = 'pending'
WHERE source_type = 'workday';

-- Index so the verify job can query pending rows efficiently.
CREATE INDEX IF NOT EXISTS idx_job_listings_verify
  ON job_listings (source_type, apply_url_status)
  WHERE apply_url_status IN ('pending', 'unverified');

SELECT source_type, apply_url_status, COUNT(*) AS n
FROM job_listings
GROUP BY source_type, apply_url_status
ORDER BY source_type, apply_url_status;
