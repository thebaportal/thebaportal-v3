-- ============================================================
-- BrainWave employer_sources seed — Workday + SmartRecruiters
-- Run once in Supabase SQL editor.
-- Safe to re-run: deletes existing rows by name+platform first.
-- ============================================================

-- ── 1. Remove any existing rows for these employers (idempotent) ──────────────

DELETE FROM employer_sources
WHERE (name, platform) IN (
  ('RBC',                'workday'),
  ('TD Bank',            'workday'),
  ('BMO',                'workday'),
  ('CIBC',               'workday'),
  ('Manulife',           'workday'),
  ('Deloitte Canada',    'smartrecruiters')
);

-- ── 2. Workday — Canadian banks & insurers (verified endpoints) ───────────────

INSERT INTO employer_sources (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('RBC',      'workday', NULL, 'rbc',     3, 'RBCGLOBAL1',      'https://jobs.rbc.com',                                        'CA', true, true, 0),
  ('TD Bank',  'workday', NULL, 'td',      3, 'TD_Bank_Careers',  'https://jobs.td.com',                                         'CA', true, true, 0),
  ('BMO',      'workday', NULL, 'bmo',     3, 'External',         'https://jobs.bmo.com',                                        'CA', true, true, 0),
  ('CIBC',     'workday', NULL, 'cibc',    3, 'search',           'https://cibc.wd3.myworkdayjobs.com/search',                   'CA', true, true, 0),
  ('Manulife', 'workday', NULL, 'manulife',3, 'MFCJH_Jobs',       'https://manulife.wd3.myworkdayjobs.com/MFCJH_Jobs',           'CA', true, true, 0);

-- ── 3. SmartRecruiters — consulting ──────────────────────────────────────────

INSERT INTO employer_sources (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('Deloitte Canada', 'smartrecruiters', 'Deloitte6', NULL, NULL, NULL, 'https://careers.smartrecruiters.com/Deloitte6', 'CA', true, true, 0);

-- ── 4. Deactivate Greenhouse slugs confirmed 404 ──────────────────────────────
-- These hit HTTP 404 from the Greenhouse boards API.
-- Kept in table (not deleted) so they can be corrected later.

UPDATE employer_sources
SET    active = false
WHERE  platform = 'greenhouse'
AND    name IN (
  'Wealthsimple',
  'Clio',
  '1Password',
  'Kinaxis',
  'Arctic Wolf',
  'Xanadu',
  'Properly',
  'Borealis AI',
  'Tulip Retail'
);

-- ── 5. Confirm results ────────────────────────────────────────────────────────

SELECT
  platform,
  COUNT(*)                                      AS total,
  SUM(CASE WHEN active   = true THEN 1 ELSE 0 END) AS active_count,
  SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) AS verified_count
FROM employer_sources
GROUP BY platform
ORDER BY platform;
