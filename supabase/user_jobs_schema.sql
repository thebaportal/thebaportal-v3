-- User-added jobs (external — LinkedIn, Indeed, company sites, etc.)
create table if not exists public.user_jobs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  company     text        not null,
  location    text,
  description text        not null,
  apply_url   text,
  analysis_result    jsonb,
  analyzed_at        timestamptz,
  analyzed_resume_ids text[],
  created_at  timestamptz not null default now()
);

alter table public.user_jobs enable row level security;

create policy "select own user_jobs" on public.user_jobs for select using (auth.uid() = user_id);
create policy "insert own user_jobs" on public.user_jobs for insert with check (auth.uid() = user_id);
create policy "update own user_jobs" on public.user_jobs for update using (auth.uid() = user_id);
create policy "delete own user_jobs" on public.user_jobs for delete using (auth.uid() = user_id);

grant all on public.user_jobs to service_role;
grant all on public.user_jobs to authenticated;
