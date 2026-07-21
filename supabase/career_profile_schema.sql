-- Career Profile: stores multiple resume versions per user
create table if not exists public.user_resumes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default 'My Resume',
  raw_text    text        not null,
  file_name   text,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table public.user_resumes enable row level security;

create policy "select own resumes"  on public.user_resumes for select  using (auth.uid() = user_id);
create policy "insert own resumes"  on public.user_resumes for insert  with check (auth.uid() = user_id);
create policy "update own resumes"  on public.user_resumes for update  using (auth.uid() = user_id);
create policy "delete own resumes"  on public.user_resumes for delete  using (auth.uid() = user_id);

-- Cache job analysis results against the resumes used
alter table public.saved_jobs
  add column if not exists analysis_result    jsonb,
  add column if not exists analyzed_at        timestamptz,
  add column if not exists analyzed_resume_ids text[];
