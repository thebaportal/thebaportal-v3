-- ════════════════════════════════════════════════════════════════════════════
-- 0012 — IMPACT REVIEWS                      STATUS: PENDING REVIEW — NOT APPLIED
-- ════════════════════════════════════════════════════════════════════════════
-- Project impact, Slice 1: when an Approved version is superseded by a newly
-- Approved version, current work that recorded the old version as a source may
-- be affected. Detection is computed by the application from recorded
-- source_artifact_ids (src/lib/projects/impact.ts) and is never stored.
--
-- This table stores only the Business Analyst's acknowledgement that one exact
-- change needs no revision: (affected version, superseded source version,
-- current source version). A later newly Approved source version is a different
-- triple, so it raises a fresh impact. Nothing here edits any artifact.
--
-- What this adds:
--   1. public.impact_reviews — append-only acknowledgement rows.
--   2. An insert guard: all three versions belong to the review's project and
--      user, the source really was superseded by that lineage's current Approved
--      version, and the affected version is current work that recorded it.
--   3. Access: RLS on with no client policies; anon/authenticated have no
--      privileges. The server API (service_role) reads and writes it after
--      deriving the user from the session and re-computing current impacts.
--
-- Adds a table only; no existing table, row or function changes.
-- Verify:   supabase/checks/0012_impact_reviews_verify.sql
-- Rollback: supabase/checks/0012_impact_reviews_rollback.sql
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.impact_reviews (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id)  on delete cascade,
  user_id              uuid not null references auth.users(id)       on delete cascade,
  artifact_id          uuid not null references public.artifacts(id) on delete cascade,  -- exact affected version
  superseded_source_id uuid not null references public.artifacts(id) on delete cascade,  -- the version it recorded
  new_source_id        uuid not null references public.artifacts(id) on delete cascade,  -- current Approved when reviewed
  outcome              text not null default 'no_change_needed' check (outcome = 'no_change_needed'),
  note                 text check (note is null or length(note) <= 1000),
  created_at           timestamptz not null default now(),
  constraint impact_reviews_one_per_change unique (artifact_id, superseded_source_id, new_source_id)
);
create index if not exists impact_reviews_project_user_idx on public.impact_reviews (project_id, user_id);

alter table public.impact_reviews enable row level security;
revoke all on table public.impact_reviews from public, anon, authenticated;
grant select, insert on table public.impact_reviews to service_role;

-- ── Insert guard: a review can only acknowledge a real, current change ──────
create or replace function public.impact_reviews_insert_guard()
returns trigger language plpgsql set search_path to '' as $$
declare w public.artifacts; s public.artifacts; n public.artifacts;
begin
  select * into w from public.artifacts where id = new.artifact_id;
  select * into s from public.artifacts where id = new.superseded_source_id;
  select * into n from public.artifacts where id = new.new_source_id;
  if w.project_id <> new.project_id or w.user_id <> new.user_id
     or s.project_id <> new.project_id or s.user_id <> new.user_id
     or n.project_id <> new.project_id or n.user_id <> new.user_id then
    raise exception 'impact_review_ownership: every version must belong to this project and user' using errcode = '23514';
  end if;
  if w.status not in ('approved', 'draft', 'in_review') then
    raise exception 'impact_review_not_current: % versions are history', w.status using errcode = '23514';
  end if;
  if not (new.superseded_source_id = any (coalesce(w.source_artifact_ids, '{}'))) then
    raise exception 'impact_review_not_a_source: the affected version did not record this source' using errcode = '23514';
  end if;
  if s.status <> 'superseded' or n.status <> 'approved' or n.type <> s.type
     or n.lineage_id is distinct from s.lineage_id or n.id = s.id then
    raise exception 'impact_review_not_current: the source was not superseded by this current Approved version' using errcode = '23514';
  end if;
  return new;
end $$;

-- Append-only: an acknowledgement is never edited (a newer source raises a new impact).
create or replace function public.impact_reviews_update_guard()
returns trigger language plpgsql set search_path to '' as $$
begin
  raise exception 'impact_review_immutable: reviews are append-only' using errcode = '23514';
end $$;

drop trigger if exists impact_reviews_insert_guard on public.impact_reviews;
create trigger impact_reviews_insert_guard before insert on public.impact_reviews
  for each row execute function public.impact_reviews_insert_guard();
drop trigger if exists impact_reviews_update_guard on public.impact_reviews;
create trigger impact_reviews_update_guard before update on public.impact_reviews
  for each row execute function public.impact_reviews_update_guard();

revoke all on function public.impact_reviews_insert_guard() from public, anon, authenticated;
revoke all on function public.impact_reviews_update_guard() from public, anon, authenticated;
