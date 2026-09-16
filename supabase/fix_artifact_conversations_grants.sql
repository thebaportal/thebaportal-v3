-- artifact_conversations was created in phase1b_schema.sql with RLS enabled and a
-- correct policy, but — like organizations/projects/artifacts/decision_log before
-- fix_phase1_table_grants.sql — it never received table-level GRANTs. RLS restricts
-- which rows a role can see; without a GRANT, Postgres refuses the query before RLS
-- is ever evaluated (error 42501: permission denied for table X), for every role
-- including service_role. This is the same mechanism as fix_phase1_table_grants.sql,
-- applied to a table that schema file predates.
-- Run in: Supabase Dashboard > SQL Editor > New Query

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.artifact_conversations to anon, authenticated, service_role;

-- Separate, real issue found while diagnosing the above: the table's unique
-- constraint is (project_id, workstream_type) only, not including user_id. The
-- conversations route upserts via onConflict "project_id,workstream_type" using the
-- service-role client (which bypasses RLS by design, same as every other route in
-- this app). A request carrying another user's project_id could collide on that
-- constraint and overwrite their row, including its user_id and messages. Widening
-- the constraint to include user_id closes that gap: a different user's upsert can
-- no longer target the same row, and app-level ownership checks (already present in
-- the route) remain the enforcement layer, consistent with how every other table in
-- this schema is protected.
alter table artifact_conversations
  drop constraint if exists artifact_conversations_project_id_workstream_type_key;

alter table artifact_conversations
  add constraint artifact_conversations_project_workstream_user_key
  unique (project_id, workstream_type, user_id);
