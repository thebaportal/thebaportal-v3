-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/fix_artifact_conversations_grants.sql (constraint part).
--
-- Explicit unique-key correction. 0002 created the key on
-- (project_id, workstream_type). Production has
--   artifact_conversations_project_workstream_user_key
--   UNIQUE (project_id, workstream_type, user_id)
-- and no two-column key. Without user_id in the key, a service-role upsert
-- (onConflict project_id,workstream_type) carrying another user's project_id
-- could overwrite that user's conversation row.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.artifact_conversations
  drop constraint if exists artifact_conversations_project_id_workstream_type_key;

alter table public.artifact_conversations
  add constraint artifact_conversations_project_workstream_user_key
  unique (project_id, workstream_type, user_id);
