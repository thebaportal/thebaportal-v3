-- ============================================================
-- Remove all Workday data — run in Supabase SQL editor.
-- Safe to re-run.
-- ============================================================

-- 1. Delete all Workday job listings (including broken community.workday.com ones)
DELETE FROM job_listings WHERE source_type = 'workday';

-- 2. Deactivate all Workday employer sources so the pipeline skips them
UPDATE employer_sources SET active = false WHERE platform = 'workday';

-- 3. Confirm
SELECT platform, COUNT(*) AS total,
  SUM(CASE WHEN active = true THEN 1 ELSE 0 END) AS active
FROM employer_sources
GROUP BY platform
ORDER BY platform;
