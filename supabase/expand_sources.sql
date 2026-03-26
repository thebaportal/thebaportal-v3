-- ============================================================
-- Expand employer sources — iCIMS, more Workday, fix Greenhouse
-- Run in Supabase SQL editor.
-- Safe to re-run.
-- ============================================================

-- ── 1. iCIMS sources ─────────────────────────────────────────────────────────
-- iCIMS is used by large Canadian employers including CGI and Aviva.
-- The slug is the subdomain: {slug}.icims.com

DELETE FROM employer_sources WHERE platform = 'icims';

INSERT INTO employer_sources
  (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('CGI Group',     'icims', 'cgi',       NULL, NULL, NULL, 'https://www.cgi.com/en/careers',       'CA', true, false, 0),
  ('Aviva Canada',  'icims', 'aviva',      NULL, NULL, NULL, 'https://careers.aviva.com/ca',         'CA', true, false, 0),
  ('WSP Global',    'icims', 'wsp',        NULL, NULL, NULL, 'https://www.wsp.com/en-CA/careers',    'CA', true, false, 0),
  ('Stantec',       'icims', 'stantec',    NULL, NULL, NULL, 'https://www.stantec.com/en/careers',   'CA', true, false, 0);
-- Note: verified=false — these slugs need to be confirmed by the first pipeline run.
-- If a slug is wrong the adapter logs a 404 and skips cleanly.

-- ── 2. More Workday sources ───────────────────────────────────────────────────
-- Board names are best-effort. URL verification (7am cron) will validate them.
-- Wrong board names result in "View job on company site" fallback — not a blocker.

DELETE FROM employer_sources
WHERE platform = 'workday'
AND name IN ('EY Canada', 'KPMG Canada', 'Telus', 'Intact Insurance', 'Sun Life');

INSERT INTO employer_sources
  (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('EY Canada',         'workday', NULL, 'ey',       1, 'EY-Careers',           'https://www.ey.com/en_ca/careers',                       'CA', true, false, 0),
  ('KPMG Canada',       'workday', NULL, 'kpmg',     1, 'kpmg_careers',         'https://home.kpmg/ca/en/home/careers.html',              'CA', true, false, 0),
  ('Telus',             'workday', NULL, 'telus',    3, 'TELUS_External',       'https://www.telus.com/en/about/careers',                 'CA', true, false, 0),
  ('Intact Insurance',  'workday', NULL, 'intact',   3, 'Intact_External',      'https://careers.intact.ca',                              'CA', true, false, 0),
  ('Sun Life',          'workday', NULL, 'sunlife',  3, 'SunLife',              'https://sunlife.wd3.myworkdayjobs.com/en-US/SunLife',    'CA', true, false, 0);

-- ── 3. Greenhouse — replace broken US slugs with Canadian employers ───────────
-- Deactivate remaining US/global companies that have no Canadian BA presence.

UPDATE employer_sources
SET active = false
WHERE platform = 'greenhouse'
AND name IN ('AbCellera', 'Hootsuite', 'D2L');
-- AbCellera: biotech, almost no BA roles
-- Hootsuite: shrinking, few BA postings
-- D2L: Canadian but ed-tech with few BA roles — keep if you want but low signal

-- Add Canadian employers confirmed to use Greenhouse with BA roles
DELETE FROM employer_sources
WHERE platform = 'greenhouse'
AND name IN ('OpenText', 'Softchoice', 'Hatch', 'Agora', 'Loblaw Digital');

INSERT INTO employer_sources
  (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('OpenText',       'greenhouse', 'opentext',  NULL, NULL, NULL, 'https://careers.opentext.com', 'CA', true, false, 0),
  ('Softchoice',     'greenhouse', 'softchoice',NULL, NULL, NULL, 'https://www.softchoice.com/careers', 'CA', true, false, 0),
  ('Hatch',          'greenhouse', 'hatch',     NULL, NULL, NULL, 'https://www.hatch.com/About-Us/Careers', 'CA', true, false, 0);
-- verified=false — if slugs are wrong the adapter logs 404 and skips cleanly.

-- ── 4. Fix Lever — replace both broken sources ────────────────────────────────

UPDATE employer_sources
SET active = false
WHERE platform = 'lever'
AND name IN ('Clearco', 'TouchBistro');

DELETE FROM employer_sources
WHERE platform = 'lever'
AND name IN ('Ritual', 'Wave', 'Lightspeed');

INSERT INTO employer_sources
  (name, platform, slug, tenant, wd_num, board_name, careers_url, region_hint, active, verified, consecutive_failures)
VALUES
  ('Ritual',      'lever', 'ritual',     NULL, NULL, NULL, 'https://ritual.co/careers',     'CA', true, false, 0),
  ('Wave',        'lever', 'wavehq',     NULL, NULL, NULL, 'https://www.waveapps.com/about/careers', 'CA', true, false, 0),
  ('Lightspeed',  'lever', 'lightspeed', NULL, NULL, NULL, 'https://www.lightspeedhq.com/careers/', 'CA', true, false, 0);

-- ── 5. Summary ────────────────────────────────────────────────────────────────

SELECT
  platform,
  COUNT(*)                                              AS total,
  SUM(CASE WHEN active   = true  THEN 1 ELSE 0 END)    AS active,
  SUM(CASE WHEN verified = true  THEN 1 ELSE 0 END)    AS verified
FROM employer_sources
GROUP BY platform
ORDER BY platform;
