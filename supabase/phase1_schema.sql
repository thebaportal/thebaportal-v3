-- Phase 1 Schema: Organizations, Projects, Artifacts, Decision Log
-- Run this in: Supabase Dashboard > SQL Editor > New Query

-- ── Organizations ──────────────────────────────────────────────────────────────
create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  country text,
  industry text,
  default_methodology text default 'agile',
  created_at timestamptz default now()
);

alter table organizations enable row level security;

drop policy if exists "Users manage their own organizations" on organizations;
create policy "Users manage their own organizations"
  on organizations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Projects ───────────────────────────────────────────────────────────────────
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  problem_statement text,
  methodology text default 'agile',
  industry text,
  country text,
  relevant_context text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;

drop policy if exists "Users manage their own projects" on projects;
create policy "Users manage their own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Artifacts ─────────────────────────────────────────────────────────────────
create table if not exists artifacts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text,
  content text not null,
  reasoning_context jsonb default '{}'::jsonb,
  status text default 'draft',
  version integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table artifacts enable row level security;

drop policy if exists "Users manage their own artifacts" on artifacts;
create policy "Users manage their own artifacts"
  on artifacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Decision Log ───────────────────────────────────────────────────────────────
create table if not exists decision_log (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  decision_text text not null,
  made_by text,
  decision_date date default current_date,
  status text default 'open',
  impact_notes text,
  linked_artifact_ids uuid[] default '{}',
  created_at timestamptz default now()
);

alter table decision_log enable row level security;

drop policy if exists "Users manage their own decisions" on decision_log;
create policy "Users manage their own decisions"
  on decision_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Auto-update timestamps ────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

drop trigger if exists artifacts_updated_at on artifacts;
create trigger artifacts_updated_at
  before update on artifacts
  for each row execute function update_updated_at();
