-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/add_artifact_source_ids.sql. Matches production exactly.
-- ════════════════════════════════════════════════════════════════════════════

-- Artifact-level lineage: which upstream artifacts a downstream artifact was built from.
alter table public.artifacts
  add column if not exists source_artifact_ids uuid[] default '{}'::uuid[];
