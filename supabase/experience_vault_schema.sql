-- Experience Vault: stores candidate-confirmed evidence across applications
-- Each row is one Q&A pair — the candidate's exact words, never AI-generated claims

create table if not exists public.user_experience_vault (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  question         text        not null,
  answer           text        not null,
  tags             jsonb       default '{}'::jsonb,
  source_job_id    uuid,
  source_job_title text,
  source_company   text,
  created_at       timestamptz not null default now()
);

alter table public.user_experience_vault enable row level security;

create policy "select own vault" on public.user_experience_vault for select using (auth.uid() = user_id);
create policy "insert own vault" on public.user_experience_vault for insert with check (auth.uid() = user_id);
create policy "update own vault" on public.user_experience_vault for update using (auth.uid() = user_id);
create policy "delete own vault" on public.user_experience_vault for delete using (auth.uid() = user_id);

grant all on public.user_experience_vault to service_role;
grant all on public.user_experience_vault to authenticated;
