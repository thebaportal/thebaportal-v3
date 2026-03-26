-- Fix Workday board names that were wrong in the initial seed.
-- RBC's board is RBC_GHP_ExternalCareerSite, not RBCGLOBAL1.
-- Run in Supabase SQL editor.

UPDATE employer_sources SET board_name = 'RBC_GHP_ExternalCareerSite' WHERE name = 'RBC'     AND platform = 'workday';
UPDATE employer_sources SET board_name = 'TD_Bank_Careers'            WHERE name = 'TD Bank'  AND platform = 'workday';
UPDATE employer_sources SET board_name = 'External'                   WHERE name = 'BMO'      AND platform = 'workday';
UPDATE employer_sources SET board_name = 'search'                     WHERE name = 'CIBC'     AND platform = 'workday';
UPDATE employer_sources SET board_name = 'MFCJH_Jobs'                 WHERE name = 'Manulife' AND platform = 'workday';

-- Delete any jobs with broken Workday apply URLs so they get re-fetched cleanly.
DELETE FROM jobs WHERE source_type = 'workday' AND (
  apply_url LIKE '%community.workday.com%' OR
  apply_url IS NULL OR
  apply_url = ''
);

-- Confirm
SELECT name, platform, board_name, active FROM employer_sources WHERE platform = 'workday' ORDER BY name;
