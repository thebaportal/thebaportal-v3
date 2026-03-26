-- Deactivate Greenhouse sources that are global tech companies with
-- almost no Canadian BA roles. They generate 1500+ raw jobs per run
-- that get rejected, slowing the pipeline down.

UPDATE employer_sources
SET active = false
WHERE platform = 'greenhouse'
AND name IN (
  'Databricks',   -- 834 raw jobs, almost all US/global
  'Stripe',       -- 512 raw jobs, almost all US/global
  'GitLab',       -- 174 raw jobs, mostly global
  'AbCellera',    -- biotech, not BA-focused
  'Hootsuite'     -- not a BA employer
);

-- Confirm what's still active
SELECT name, platform, active
FROM employer_sources
WHERE platform = 'greenhouse'
ORDER BY active DESC, name;
