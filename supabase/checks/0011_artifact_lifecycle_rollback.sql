-- EMERGENCY ROLLBACK for 0011_artifact_lifecycle_integrity.sql.
--
-- NON-DESTRUCTIVE BY DESIGN: removes the enforcement (functions, triggers,
-- unique indexes, lineage CHECK) but KEEPS artifacts.lineage_id and every value
-- in it. Once users have created Decision Lab revisions, lineage_id is the only
-- record of which versions belong to which decision; dropping it would destroy
-- version history. This script never drops the column, and there is
-- deliberately no "drop lineage_id" step anywhere in the migration set.
--
-- After rollback the application code from before 0011 still works: it ignores
-- lineage_id (nullable, no default). Re-applying 0011 is safe — it re-creates
-- the enforcement and leaves existing lineage values as they are.
-- Not a migration; never run by the CLI. Runs as one transaction.

do $$
declare f text;
begin
  foreach f in array array[
    'public.artifact_approve(uuid, uuid, uuid)',
    'public.artifact_revise(uuid, uuid, uuid)',
    'public.artifact_save_working_draft(uuid, uuid, text, text, text, jsonb, uuid[])',
    'public.artifact_create_decision(uuid, uuid, text, text, jsonb, uuid[])',
    'public.artifact_insert_approved(uuid, uuid, text, text, text, jsonb, uuid[])',
    'public.artifact_lineage_lock(uuid, uuid, text, uuid)'] loop
    execute format('drop function if exists %s', f);
  end loop;
end $$;

drop trigger if exists artifacts_insert_guard on public.artifacts;
drop trigger if exists artifacts_update_guard on public.artifacts;
drop function if exists public.artifacts_insert_guard();
drop function if exists public.artifacts_update_guard();

drop index if exists public.artifacts_one_approved_per_lineage;
drop index if exists public.artifacts_one_working_draft_per_lineage;
drop index if exists public.artifacts_unique_version_per_lineage;

alter table public.artifacts drop constraint if exists artifacts_lineage_matches_type;

-- artifacts.lineage_id and its data are intentionally preserved.
