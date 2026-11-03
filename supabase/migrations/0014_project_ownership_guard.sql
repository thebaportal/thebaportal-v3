-- 0014_project_ownership_guard.sql
-- Cross-project integrity: a row in a project-scoped table must belong to the
-- owner of the project it references.
--
-- Before this migration, RLS on these tables checked only auth.uid() = user_id,
-- so a signed-in user could insert (or re-point) their own row at ANOTHER user's
-- project id, directly through the REST API. The owner never saw such rows
-- (reads filter by user_id), but the database accepted them.
--
-- The guard is a BEFORE INSERT / UPDATE OF (project_id, user_id) trigger, so it
-- applies to every role, including the service role used by the API routes.
-- It only rejects rows whose user_id does not own project_id. Production had
-- 0 such rows on 2026-11-02 (checked read-only), and updates that do not touch
-- project_id/user_id are not re-checked, so existing rows are unaffected.
--
-- Adds one function and six triggers. No table, column, policy or data changes.
-- Checks: checks/0014_project_ownership_guard_verify.sql
-- Rollback: checks/0014_project_ownership_guard_rollback.sql

create or replace function public.enforce_project_owner()
returns trigger
language plpgsql
security definer          -- must see public.projects regardless of the caller's RLS
set search_path to ''
as $$
begin
  if new.project_id is null or new.user_id is null or not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'project_not_owned: project % does not belong to this user', new.project_id
      using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function public.enforce_project_owner() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['artifacts', 'decision_log', 'artifact_conversations',
                           'ba_intel_sessions', 'ba_intel_findings', 'impact_reviews'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_project_owner_guard', t);
    execute format(
      'create trigger %I before insert or update of project_id, user_id on public.%I
         for each row execute function public.enforce_project_owner()',
      t || '_project_owner_guard', t);
  end loop;
end $$;
