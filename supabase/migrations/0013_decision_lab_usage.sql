-- ════════════════════════════════════════════════════════════════════════════
-- 0013 — DECISION LAB USAGE (FREE QUOTA)      STATUS: PENDING REVIEW — NOT APPLIED
-- ════════════════════════════════════════════════════════════════════════════
-- Free users get a fixed number of SUCCESSFUL full Decision Lab analyses per
-- UTC calendar month; Pro/Enterprise bypass this entirely (decided by the
-- server's entitlement helper, never by the client).
--
-- Reserve → model call → settle / release, per logical request:
--   decision_lab_reserve  before the model call. Serialised per user + month by
--                         an advisory lock, so simultaneous requests cannot
--                         exceed the limit. Idempotent by (user, request_id):
--                         a retry of the same request never takes a second slot;
--                         after success it replays the stored result.
--   decision_lab_settle   after a successful model call: the slot is consumed.
--   decision_lab_release  after a failed / aborted call: the slot is freed.
--   decision_lab_quota    used / limit / resets_at, for the UI.
-- A reservation that is never settled or released (crashed request) stops
-- counting after 10 minutes. Month and reset boundaries use the DATABASE's UTC
-- clock. p_at exists only so tests can pin the clock; the server never passes it.
--
-- Access: RLS on, no client policies; anon/authenticated have no privileges.
-- Functions: SECURITY INVOKER, pinned search_path, EXECUTE service_role only.
-- Verify:   supabase/checks/0013_decision_lab_usage_verify.sql
-- Rollback: supabase/checks/0013_decision_lab_usage_rollback.sql
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.decision_lab_usage (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  request_id          uuid not null,
  fingerprint         text not null check (length(fingerprint) between 16 and 128),
  period              date not null,
  status              text not null check (status in ('reserved', 'consumed', 'released')),
  reserved_at         timestamptz not null default now(),
  settled_at          timestamptz,
  result              text,
  source_artifact_ids uuid[] not null default '{}',
  constraint decision_lab_usage_one_per_request unique (user_id, request_id)
);
create index if not exists decision_lab_usage_user_period_idx on public.decision_lab_usage (user_id, period);

alter table public.decision_lab_usage enable row level security;
revoke all on table public.decision_lab_usage from public, anon, authenticated;
grant select, insert, update on table public.decision_lab_usage to service_role;

-- UTC month start for a moment.
create or replace function public.decision_lab_period(p_at timestamptz)
returns date language sql immutable set search_path to '' as $$
  select (pg_catalog.date_trunc('month', p_at at time zone 'UTC'))::date
$$;

-- Slots in use this period: consumed, or reserved within the last 10 minutes.
create or replace function public.decision_lab_used(p_user_id uuid, p_period date, p_at timestamptz)
returns int language sql stable set search_path to '' as $$
  select count(*)::int from public.decision_lab_usage
   where user_id = p_user_id and period = p_period
     and (status = 'consumed' or (status = 'reserved' and reserved_at > p_at - interval '10 minutes'))
$$;

create or replace function public.decision_lab_reserve(p_user_id uuid, p_request_id uuid, p_fingerprint text, p_limit int, p_at timestamptz default null)
returns jsonb language plpgsql set search_path to '' as $$
declare
  v_at timestamptz := coalesce(p_at, pg_catalog.now());
  v_period date := public.decision_lab_period(v_at);
  v_resets timestamptz := ((v_period + interval '1 month')::timestamp at time zone 'UTC');
  r public.decision_lab_usage; v_used int;
begin
  -- One quota decision at a time per user + month.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('decision_lab:' || p_user_id::text || ':' || v_period::text, 0));

  select * into r from public.decision_lab_usage where user_id = p_user_id and request_id = p_request_id for update;
  if found then
    if r.fingerprint <> p_fingerprint then
      return pg_catalog.jsonb_build_object('outcome', 'conflict');
    end if;
    if r.status = 'consumed' then
      return pg_catalog.jsonb_build_object('outcome', 'replay', 'result', r.result, 'source_artifact_ids', pg_catalog.to_jsonb(r.source_artifact_ids));
    end if;
    if r.status = 'reserved' and r.reserved_at > v_at - interval '10 minutes' then
      return pg_catalog.jsonb_build_object('outcome', 'in_progress');
    end if;
    -- released, or reserved but stale: reuse this request's own row if a slot is free
    v_used := public.decision_lab_used(p_user_id, v_period, v_at);
    if v_used >= p_limit then
      return pg_catalog.jsonb_build_object('outcome', 'quota_exceeded', 'used', v_used, 'limit', p_limit, 'resets_at', v_resets);
    end if;
    update public.decision_lab_usage set status = 'reserved', reserved_at = v_at, settled_at = null, period = v_period where id = r.id;
    return pg_catalog.jsonb_build_object('outcome', 'reserved', 'used', v_used + 1, 'limit', p_limit, 'resets_at', v_resets);
  end if;

  v_used := public.decision_lab_used(p_user_id, v_period, v_at);
  if v_used >= p_limit then
    return pg_catalog.jsonb_build_object('outcome', 'quota_exceeded', 'used', v_used, 'limit', p_limit, 'resets_at', v_resets);
  end if;
  insert into public.decision_lab_usage (user_id, request_id, fingerprint, period, status, reserved_at)
  values (p_user_id, p_request_id, p_fingerprint, v_period, 'reserved', v_at);
  return pg_catalog.jsonb_build_object('outcome', 'reserved', 'used', v_used + 1, 'limit', p_limit, 'resets_at', v_resets);
end $$;

create or replace function public.decision_lab_settle(p_user_id uuid, p_request_id uuid, p_result text, p_source_artifact_ids uuid[], p_at timestamptz default null)
returns boolean language plpgsql set search_path to '' as $$
begin
  update public.decision_lab_usage
     set status = 'consumed', settled_at = coalesce(p_at, pg_catalog.now()), result = p_result,
         source_artifact_ids = coalesce(p_source_artifact_ids, '{}')
   where user_id = p_user_id and request_id = p_request_id and status = 'reserved';
  return found;
end $$;

create or replace function public.decision_lab_release(p_user_id uuid, p_request_id uuid, p_at timestamptz default null)
returns boolean language plpgsql set search_path to '' as $$
begin
  update public.decision_lab_usage set status = 'released', settled_at = coalesce(p_at, pg_catalog.now())
   where user_id = p_user_id and request_id = p_request_id and status = 'reserved';
  return found;
end $$;

create or replace function public.decision_lab_quota(p_user_id uuid, p_limit int, p_at timestamptz default null)
returns jsonb language plpgsql stable set search_path to '' as $$
declare
  v_at timestamptz := coalesce(p_at, pg_catalog.now());
  v_period date := public.decision_lab_period(v_at);
begin
  return pg_catalog.jsonb_build_object('used', public.decision_lab_used(p_user_id, v_period, v_at), 'limit', p_limit,
    'resets_at', ((v_period + interval '1 month')::timestamp at time zone 'UTC'));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.decision_lab_period(timestamptz)',
    'public.decision_lab_used(uuid, date, timestamptz)',
    'public.decision_lab_reserve(uuid, uuid, text, int, timestamptz)',
    'public.decision_lab_settle(uuid, uuid, text, uuid[], timestamptz)',
    'public.decision_lab_release(uuid, uuid, timestamptz)',
    'public.decision_lab_quota(uuid, int, timestamptz)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
