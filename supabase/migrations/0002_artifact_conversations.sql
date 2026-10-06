-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/phase1b_schema.sql, as originally written.
--
-- NOTE: the original unique key here is (project_id, workstream_type). Production
-- has since been changed to (project_id, workstream_type, user_id). That change
-- is recorded explicitly in 0006_artifact_conversations_unique_key.sql rather
-- than edited into this file, so the history shows it.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.artifact_conversations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  workstream_type text not null,
  artifact_id uuid references public.artifacts(id) on delete set null,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, workstream_type)
);

alter table public.artifact_conversations enable row level security;

drop policy if exists "Users manage their own conversations" on public.artifact_conversations;
create policy "Users manage their own conversations"
  on public.artifact_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists conversations_updated_at on public.artifact_conversations;
create trigger conversations_updated_at
  before update on public.artifact_conversations
  for each row execute function public.update_updated_at();
