-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/ba_intelligence_schema.sql. Matches production exactly.
-- (Its table grants are restated, with the other tables', in 0005.)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Analysis sessions ─────────────────────────────────────────────────────────
create table if not exists public.ba_intel_sessions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_label text not null,
  source_text text not null,
  status text default 'analyzed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ba_intel_sessions enable row level security;

drop policy if exists "Users manage their own ba intel sessions" on public.ba_intel_sessions;
create policy "Users manage their own ba intel sessions"
  on public.ba_intel_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ba_intel_sessions_project_id_idx on public.ba_intel_sessions(project_id);

-- ── Findings ──────────────────────────────────────────────────────────────────
create table if not exists public.ba_intel_findings (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.ba_intel_sessions(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null check (category in ('requirement', 'business_rule', 'unresolved_question', 'contradiction', 'edge_case')),
  finding_text text not null,
  original_finding_text text,
  source_evidence text,
  review_status text not null default 'proposed' check (review_status in ('proposed', 'accepted', 'rejected')),
  linked_finding_ids uuid[] default '{}'::uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ba_intel_findings enable row level security;

drop policy if exists "Users manage their own ba intel findings" on public.ba_intel_findings;
create policy "Users manage their own ba intel findings"
  on public.ba_intel_findings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ba_intel_findings_session_id_idx on public.ba_intel_findings(session_id);
create index if not exists ba_intel_findings_project_id_idx on public.ba_intel_findings(project_id);

-- ── Auto-update timestamps ────────────────────────────────────────────────────
drop trigger if exists ba_intel_sessions_updated_at on public.ba_intel_sessions;
create trigger ba_intel_sessions_updated_at
  before update on public.ba_intel_sessions
  for each row execute function public.update_updated_at();

drop trigger if exists ba_intel_findings_updated_at on public.ba_intel_findings;
create trigger ba_intel_findings_updated_at
  before update on public.ba_intel_findings
  for each row execute function public.update_updated_at();
