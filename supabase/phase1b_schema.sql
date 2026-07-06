-- Phase 1b: Conversation persistence per workstream
-- Run in Supabase Dashboard > SQL Editor > New Query

create table if not exists artifact_conversations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  workstream_type text not null,
  artifact_id uuid references artifacts(id) on delete set null,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, workstream_type)
);

alter table artifact_conversations enable row level security;

drop policy if exists "Users manage their own conversations" on artifact_conversations;
create policy "Users manage their own conversations"
  on artifact_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists conversations_updated_at on artifact_conversations;
create trigger conversations_updated_at
  before update on artifact_conversations
  for each row execute function update_updated_at();
