-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/phase1_schema.sql, checked against the production catalog
-- captured 2026-10-05. Matches production exactly.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Organizations ──────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  country text,
  industry text,
  default_methodology text default 'agile',
  created_at timestamptz default now()
);

alter table public.organizations enable row level security;

drop policy if exists "Users manage their own organizations" on public.organizations;
create policy "Users manage their own organizations"
  on public.organizations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Projects ───────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
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

alter table public.projects enable row level security;

drop policy if exists "Users manage their own projects" on public.projects;
create policy "Users manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Artifacts ─────────────────────────────────────────────────────────────────
create table if not exists public.artifacts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
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

alter table public.artifacts enable row level security;

drop policy if exists "Users manage their own artifacts" on public.artifacts;
create policy "Users manage their own artifacts"
  on public.artifacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Decision Log ───────────────────────────────────────────────────────────────
create table if not exists public.decision_log (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  decision_text text not null,
  made_by text,
  decision_date date default current_date,
  status text default 'open',
  impact_notes text,
  linked_artifact_ids uuid[] default '{}',
  created_at timestamptz default now()
);

alter table public.decision_log enable row level security;

drop policy if exists "Users manage their own decisions" on public.decision_log;
create policy "Users manage their own decisions"
  on public.decision_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Auto-update timestamps ────────────────────────────────────────────────────
-- SECURITY INVOKER, no search_path: exactly as in production.
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

drop trigger if exists artifacts_updated_at on public.artifacts;
create trigger artifacts_updated_at
  before update on public.artifacts
  for each row execute function public.update_updated_at();
