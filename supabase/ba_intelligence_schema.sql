-- BA Intelligence Phase 1: Stakeholder Input Analysis
-- Two tables: one analysis session per pasted input, and the structured
-- findings extracted from it. Findings are deliberately NOT stored in the
-- `artifacts` table — that table is one-evolving-document-per-type, and a
-- finding is a much smaller, individually-reviewable unit. See project
-- memory / architecture review for the full reasoning.
-- Run in: Supabase Dashboard > SQL Editor > New Query

-- ── Analysis sessions ─────────────────────────────────────────────────────────
-- One row per "paste input, run analysis" action. Findings are analyzed
-- synchronously in Phase 1, so a session is only ever written once analysis
-- has actually succeeded — there is no "analyzing" or "failed" row left behind
-- on error. The status column exists for a later phase (e.g. async/background
-- analysis) without needing a migration to add it then.
create table if not exists ba_intel_sessions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_label text not null,
  source_text text not null,
  status text default 'analyzed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ba_intel_sessions enable row level security;

drop policy if exists "Users manage their own ba intel sessions" on ba_intel_sessions;
create policy "Users manage their own ba intel sessions"
  on ba_intel_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ba_intel_sessions_project_id_idx on ba_intel_sessions(project_id);

-- ── Findings ──────────────────────────────────────────────────────────────────
-- review_status is intentionally three-valued only: proposed | accepted | rejected.
-- Editing is not a review status — it is captured by finding_text diverging from
-- original_finding_text while review_status stays 'proposed' until the BA
-- explicitly accepts. This preserves "AI proposes, BA edits if necessary, BA
-- explicitly validates" as a real state machine, not a status label.
create table if not exists ba_intel_findings (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references ba_intel_sessions(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
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

alter table ba_intel_findings enable row level security;

drop policy if exists "Users manage their own ba intel findings" on ba_intel_findings;
create policy "Users manage their own ba intel findings"
  on ba_intel_findings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ba_intel_findings_session_id_idx on ba_intel_findings(session_id);
create index if not exists ba_intel_findings_project_id_idx on ba_intel_findings(project_id);

-- ── Table-level grants ────────────────────────────────────────────────────────
-- Required in addition to RLS: without this, every request (including the
-- service-role key) fails with 42501 permission denied before RLS is ever
-- evaluated. See fix_phase1_table_grants.sql for the same issue on the
-- original Phase 1 tables — applying it here from the start.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.ba_intel_sessions to anon, authenticated, service_role;
grant select, insert, update, delete on public.ba_intel_findings to anon, authenticated, service_role;

-- ── Auto-update timestamps ────────────────────────────────────────────────────
-- Reuses update_updated_at(), already created by phase1_schema.sql.
drop trigger if exists ba_intel_sessions_updated_at on ba_intel_sessions;
create trigger ba_intel_sessions_updated_at
  before update on ba_intel_sessions
  for each row execute function update_updated_at();

drop trigger if exists ba_intel_findings_updated_at on ba_intel_findings;
create trigger ba_intel_findings_updated_at
  before update on ba_intel_findings
  for each row execute function update_updated_at();
