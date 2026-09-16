-- Artifact-level lineage: which upstream artifacts a downstream artifact was built from
-- (e.g. a Requirements artifact generated from a Problem Analysis + Stakeholder Analysis).
-- Item-level traceability (BR-001, US-001, TC-001, etc.) lives inside artifact content
-- itself, not in the schema — see project memory project_v1_scope_freeze / B1 taxonomy.
-- Run in Supabase SQL editor.
alter table public.artifacts
  add column if not exists source_artifact_ids uuid[] default '{}'::uuid[];
