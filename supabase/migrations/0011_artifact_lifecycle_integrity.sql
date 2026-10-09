-- ════════════════════════════════════════════════════════════════════════════
-- 0011 — ARTIFACT LIFECYCLE INTEGRITY        STATUS: PENDING REVIEW — NOT APPLIED
-- ════════════════════════════════════════════════════════════════════════════
-- The foundational lifecycle, enforced by the database rather than app code:
--   one authoritative Approved version + at most one working Draft
--   + immutable history, per artifact LINEAGE.
--
-- Lineage:
--   normal Work artifacts  = (project_id, user_id, type)            lineage_id IS NULL
--   decision_lab_output    = (project_id, user_id, type, lineage_id) one lineage per decision
-- Stored type values were taken from production + code (2026-10-08): the only
-- multi-instance type is 'decision_lab_output'; every other type is single-lineage.
--
-- What this adds:
--   1. artifacts.lineage_id + a CHECK tying it to the type, and an insert guard
--      that a Decision Lab version can only join an existing lineage root.
--   2. Partial unique indexes: one Approved / one working Draft / unique versions
--      per lineage — enforced even when requests race.
--   3. History immutability trigger: Superseded/Archived rows are read-only;
--      Approved rows only ever become Superseded, and only inside the atomic
--      approval/import functions; Approved cannot be archived or reverted.
--   4. Atomic lifecycle functions (one transaction each, serialised per lineage):
--      artifact_approve, artifact_revise, artifact_save_working_draft,
--      artifact_create_decision, artifact_insert_approved.
--      EXECUTE: service_role only (the server API derives the acting user from
--      the authenticated session and passes it in; browsers cannot call these).
--
-- Applies atomically (one transaction) and refuses to apply if existing data
-- already violates the rules — it never "fixes" data silently.
-- Verify:   supabase/checks/0011_artifact_lifecycle_verify.sql
-- Rollback: supabase/checks/0011_artifact_lifecycle_rollback.sql (keeps lineage data)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Pre-flight: refuse on existing violations ─────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from (
    select 1 from public.artifacts where status = 'approved' and type <> 'decision_lab_output'
    group by project_id, user_id, type having count(*) > 1) x;
  if n > 0 then raise exception '0011 pre-flight: % lineage(s) already hold more than one Approved artifact', n; end if;

  select count(*) into n from (
    select 1 from public.artifacts where status in ('draft', 'in_review') and type <> 'decision_lab_output'
    group by project_id, user_id, type having count(*) > 1) x;
  if n > 0 then raise exception '0011 pre-flight: % lineage(s) already hold more than one working Draft', n; end if;

  select count(*) into n from (
    select 1 from public.artifacts where type <> 'decision_lab_output'
    group by project_id, user_id, type, version having count(*) > 1) x;
  if n > 0 then raise exception '0011 pre-flight: % duplicate version number(s)', n; end if;
end $$;

-- ── 1. Lineage ───────────────────────────────────────────────────────────────
alter table public.artifacts add column if not exists lineage_id uuid;
-- Existing Decision Lab rows: each is its own decision (no reliable link to infer).
update public.artifacts set lineage_id = id where type = 'decision_lab_output' and lineage_id is null;

alter table public.artifacts drop constraint if exists artifacts_lineage_matches_type;
alter table public.artifacts add constraint artifacts_lineage_matches_type
  check ((type = 'decision_lab_output') = (lineage_id is not null));

-- ── 2. Uniqueness per lineage (NULL lineage = the single normal lineage) ─────
create unique index if not exists artifacts_one_approved_per_lineage
  on public.artifacts (project_id, user_id, type, (coalesce(lineage_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  where status = 'approved';
create unique index if not exists artifacts_one_working_draft_per_lineage
  on public.artifacts (project_id, user_id, type, (coalesce(lineage_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  where status in ('draft', 'in_review');
create unique index if not exists artifacts_unique_version_per_lineage
  on public.artifacts (project_id, user_id, type, (coalesce(lineage_id, '00000000-0000-0000-0000-000000000000'::uuid)), version);

-- ── 3a. Insert guard ─────────────────────────────────────────────────────────
create or replace function public.artifacts_insert_guard()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.status not in ('draft', 'approved') then
    raise exception 'artifact_invalid_insert: new versions start as draft or approved, never %', new.status using errcode = '23514';
  end if;
  if new.type = 'decision_lab_output' then
    if new.lineage_id is null then
      raise exception 'artifact_lineage_missing: a Decision Lab version must carry its decision lineage' using errcode = '23514';
    end if;
    -- A version either starts a new decision (lineage_id = its own id) or joins an
    -- existing decision root of the same project/user. Nothing else is accepted.
    if new.lineage_id <> new.id and not exists (
      select 1 from public.artifacts r
      where r.id = new.lineage_id and r.lineage_id = r.id and r.type = 'decision_lab_output'
        and r.project_id = new.project_id and r.user_id = new.user_id) then
      raise exception 'artifact_lineage_malformed: lineage % is not a Decision Lab root of this project', new.lineage_id using errcode = '23514';
    end if;
  end if;
  if new.status = 'approved' then
    new.reasoning_context := coalesce(new.reasoning_context, '{}'::jsonb) || '{"was_approved": true}'::jsonb;
  end if;
  return new;
end $$;

drop trigger if exists artifacts_insert_guard on public.artifacts;
create trigger artifacts_insert_guard before insert on public.artifacts
  for each row execute function public.artifacts_insert_guard();

-- ── 3b. History immutability + allowed transitions ───────────────────────────
-- draft      → draft (edit), approved (stamped), archived (discard working draft)
-- in_review  → in_review (edit), draft (legacy "Back to draft"), approved, archived
-- approved   → superseded, ONLY inside artifact_approve / artifact_insert_approved
-- superseded, archived → nothing (read-only history)
-- Identity (id, project, user, type, version, lineage) never changes.
create or replace function public.artifacts_update_guard()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.id <> old.id or new.project_id <> old.project_id or new.user_id <> old.user_id
     or new.type <> old.type or new.version <> old.version or new.lineage_id is distinct from old.lineage_id then
    raise exception 'artifact_identity_immutable' using errcode = '23514';
  end if;
  if old.status in ('superseded', 'archived') then
    raise exception 'artifact_history_read_only: % versions cannot be changed', old.status using errcode = '23514';
  end if;
  if old.status = 'approved' then
    if new.status <> 'superseded' or coalesce(current_setting('app.artifact_transition', true), '') <> 'supersede' then
      raise exception 'artifact_approved_is_authoritative: an Approved version only changes by being superseded through an approval' using errcode = '23514';
    end if;
    if new.content is distinct from old.content or new.title is distinct from old.title
       or new.reasoning_context is distinct from old.reasoning_context
       or new.source_artifact_ids is distinct from old.source_artifact_ids then
      raise exception 'artifact_approved_is_authoritative: approved content is immutable' using errcode = '23514';
    end if;
    return new;
  end if;
  -- old.status is draft or in_review
  if new.status not in (old.status, 'approved', 'archived')
     and not (old.status = 'in_review' and new.status = 'draft') then
    raise exception 'artifact_invalid_transition: % → %', old.status, new.status using errcode = '23514';
  end if;
  if new.status = 'approved' then
    new.reasoning_context := coalesce(new.reasoning_context, '{}'::jsonb) || '{"was_approved": true}'::jsonb;
  end if;
  return new;
end $$;

drop trigger if exists artifacts_update_guard on public.artifacts;
create trigger artifacts_update_guard before update on public.artifacts
  for each row execute function public.artifacts_update_guard();

-- ── 4. Atomic lifecycle functions ────────────────────────────────────────────
-- Serialise every lifecycle change of one lineage (transaction-scoped lock).
create or replace function public.artifact_lineage_lock(p_project_id uuid, p_user_id uuid, p_type text, p_lineage_id uuid)
returns void language sql set search_path to '' as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_project_id::text || '|' || p_user_id::text || '|' || p_type || '|' || coalesce(p_lineage_id::text, ''), 0));
$$;

-- Draft → Approved, superseding the lineage's current Approved, in ONE transaction.
create or replace function public.artifact_approve(p_project_id uuid, p_user_id uuid, p_artifact_id uuid)
returns public.artifacts language plpgsql set search_path to '' as $$
declare t public.artifacts; cur public.artifacts;
begin
  select * into t from public.artifacts where id = p_artifact_id and project_id = p_project_id and user_id = p_user_id;
  if not found then raise exception 'artifact_not_found' using errcode = 'P0002'; end if;
  perform public.artifact_lineage_lock(t.project_id, t.user_id, t.type, t.lineage_id);
  select * into t from public.artifacts where id = p_artifact_id for update;            -- re-read under the lock
  if t.status = 'approved' then return t; end if;                                       -- idempotent
  if t.status not in ('draft', 'in_review') then
    raise exception 'artifact_not_approvable: % versions cannot be approved', t.status using errcode = 'P0001';
  end if;
  select * into cur from public.artifacts
   where project_id = t.project_id and user_id = t.user_id and type = t.type
     and lineage_id is not distinct from t.lineage_id and status = 'approved' for update;
  if found then
    if cur.version > t.version then
      raise exception 'artifact_stale_draft: v% is older than the approved v%', t.version, cur.version using errcode = 'P0001';
    end if;
    perform pg_catalog.set_config('app.artifact_transition', 'supersede', true);
    update public.artifacts set status = 'superseded', updated_at = pg_catalog.now() where id = cur.id;
    perform pg_catalog.set_config('app.artifact_transition', '', true);
  end if;
  update public.artifacts set status = 'approved', updated_at = pg_catalog.now() where id = t.id returning * into t;
  return t;
end $$;

-- Approved → new Draft. Never touches an existing Draft; refuses historical sources.
create or replace function public.artifact_revise(p_project_id uuid, p_user_id uuid, p_source_id uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare s public.artifacts; d public.artifacts; cur public.artifacts; n public.artifacts; v int;
begin
  select * into s from public.artifacts where id = p_source_id and project_id = p_project_id and user_id = p_user_id;
  if not found then raise exception 'artifact_not_found' using errcode = 'P0002'; end if;
  perform public.artifact_lineage_lock(s.project_id, s.user_id, s.type, s.lineage_id);
  select * into s from public.artifacts where id = p_source_id;
  select * into d from public.artifacts
   where project_id = s.project_id and user_id = s.user_id and type = s.type
     and lineage_id is not distinct from s.lineage_id and status in ('draft', 'in_review');
  if found then return pg_catalog.jsonb_build_object('outcome', 'existing_draft', 'artifact', pg_catalog.to_jsonb(d)); end if;
  if s.status <> 'approved' then
    select * into cur from public.artifacts
     where project_id = s.project_id and user_id = s.user_id and type = s.type
       and lineage_id is not distinct from s.lineage_id and status = 'approved';
    return pg_catalog.jsonb_build_object('outcome', 'not_latest', 'artifact', case when cur.id is null then null else pg_catalog.to_jsonb(cur) end);
  end if;
  select coalesce(max(version), 0) + 1 into v from public.artifacts
   where project_id = s.project_id and user_id = s.user_id and type = s.type and lineage_id is not distinct from s.lineage_id;
  insert into public.artifacts (project_id, user_id, type, title, content, reasoning_context, status, version, source_artifact_ids, lineage_id)
  values (s.project_id, s.user_id, s.type, s.title, s.content,
          (coalesce(s.reasoning_context, '{}'::jsonb) - 'was_approved') || pg_catalog.jsonb_build_object('revision_of', s.id),
          'draft', v, s.source_artifact_ids, s.lineage_id)
  returning * into n;
  return pg_catalog.jsonb_build_object('outcome', 'created', 'artifact', pg_catalog.to_jsonb(n));
end $$;

-- Work-area autosave: update-or-create the single working Draft (normal artifacts only).
create or replace function public.artifact_save_working_draft(p_project_id uuid, p_user_id uuid, p_type text, p_title text,
  p_content text, p_reasoning_context jsonb, p_source_artifact_ids uuid[])
returns public.artifacts language plpgsql set search_path to '' as $$
declare d public.artifacts; v int;
begin
  if p_type = 'decision_lab_output' then
    raise exception 'artifact_wrong_lineage: Decision Lab drafts are saved by id or created as a new decision' using errcode = 'P0001';
  end if;
  perform public.artifact_lineage_lock(p_project_id, p_user_id, p_type, null);
  select * into d from public.artifacts
   where project_id = p_project_id and user_id = p_user_id and type = p_type and lineage_id is null
     and status in ('draft', 'in_review') for update;
  if found then
    update public.artifacts set title = p_title, content = p_content, reasoning_context = coalesce(p_reasoning_context, '{}'::jsonb),
           source_artifact_ids = coalesce(p_source_artifact_ids, '{}'), updated_at = pg_catalog.now()
     where id = d.id returning * into d;
    return d;
  end if;
  select coalesce(max(version), 0) + 1 into v from public.artifacts
   where project_id = p_project_id and user_id = p_user_id and type = p_type and lineage_id is null;
  insert into public.artifacts (project_id, user_id, type, title, content, reasoning_context, status, version, source_artifact_ids)
  values (p_project_id, p_user_id, p_type, p_title, p_content, coalesce(p_reasoning_context, '{}'::jsonb), 'draft', v, coalesce(p_source_artifact_ids, '{}'))
  returning * into d;
  return d;
end $$;

-- Decision Lab "Save to project": a new decision = a new lineage root, Draft v1.
create or replace function public.artifact_create_decision(p_project_id uuid, p_user_id uuid, p_title text,
  p_content text, p_reasoning_context jsonb, p_source_artifact_ids uuid[])
returns public.artifacts language plpgsql set search_path to '' as $$
declare new_id uuid := gen_random_uuid(); d public.artifacts;
begin
  insert into public.artifacts (id, project_id, user_id, type, title, content, reasoning_context, status, version, source_artifact_ids, lineage_id)
  values (new_id, p_project_id, p_user_id, 'decision_lab_output', p_title, p_content, coalesce(p_reasoning_context, '{}'::jsonb),
          'draft', 1, coalesce(p_source_artifact_ids, '{}'), new_id)
  returning * into d;
  return d;
end $$;

-- Import as Approved (Replace / Add): supersede + insert in ONE transaction (normal artifacts only).
create or replace function public.artifact_insert_approved(p_project_id uuid, p_user_id uuid, p_type text, p_title text,
  p_content text, p_reasoning_context jsonb, p_source_artifact_ids uuid[])
returns public.artifacts language plpgsql set search_path to '' as $$
declare cur public.artifacts; v int; n public.artifacts;
begin
  if p_type = 'decision_lab_output' then
    raise exception 'artifact_wrong_lineage: Decision Lab outputs are approved through artifact_approve' using errcode = 'P0001';
  end if;
  perform public.artifact_lineage_lock(p_project_id, p_user_id, p_type, null);
  select coalesce(max(version), 0) + 1 into v from public.artifacts
   where project_id = p_project_id and user_id = p_user_id and type = p_type and lineage_id is null;
  select * into cur from public.artifacts
   where project_id = p_project_id and user_id = p_user_id and type = p_type and lineage_id is null and status = 'approved' for update;
  if found then
    perform pg_catalog.set_config('app.artifact_transition', 'supersede', true);
    update public.artifacts set status = 'superseded', updated_at = pg_catalog.now() where id = cur.id;
    perform pg_catalog.set_config('app.artifact_transition', '', true);
  end if;
  insert into public.artifacts (project_id, user_id, type, title, content, reasoning_context, status, version, source_artifact_ids)
  values (p_project_id, p_user_id, p_type, p_title, p_content, coalesce(p_reasoning_context, '{}'::jsonb), 'approved', v, coalesce(p_source_artifact_ids, '{}'))
  returning * into n;
  return n;
end $$;

-- ── 5. EXECUTE: trusted server (service_role) only ───────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.artifact_lineage_lock(uuid, uuid, text, uuid)',
    'public.artifact_approve(uuid, uuid, uuid)',
    'public.artifact_revise(uuid, uuid, uuid)',
    'public.artifact_save_working_draft(uuid, uuid, text, text, text, jsonb, uuid[])',
    'public.artifact_create_decision(uuid, uuid, text, text, jsonb, uuid[])',
    'public.artifact_insert_approved(uuid, uuid, text, text, text, jsonb, uuid[])',
    'public.artifacts_insert_guard()', 'public.artifacts_update_guard()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.artifact_lineage_lock(uuid, uuid, text, uuid)',
    'public.artifact_approve(uuid, uuid, uuid)',
    'public.artifact_revise(uuid, uuid, uuid)',
    'public.artifact_save_working_draft(uuid, uuid, text, text, text, jsonb, uuid[])',
    'public.artifact_create_decision(uuid, uuid, text, text, jsonb, uuid[])',
    'public.artifact_insert_approved(uuid, uuid, text, text, text, jsonb, uuid[])'] loop
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
