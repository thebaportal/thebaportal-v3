-- Application status + snapshot columns for saved_jobs and user_jobs
-- Status is a free-form label — no CHECK constraint so users can set any value

alter table public.saved_jobs
  add column if not exists status text not null default 'saved';

alter table public.user_jobs
  add column if not exists status text not null default 'saved';

-- Application snapshot: frozen at the moment the user marks a job as "applied"
alter table public.user_jobs
  add column if not exists submitted_resume_text  text,
  add column if not exists submitted_resume_name  text,
  add column if not exists applied_at             timestamptz;

-- Artifacts saved per role
alter table public.user_jobs
  add column if not exists cover_letter         text,
  add column if not exists jd_analysis          jsonb,
  add column if not exists interview_questions  jsonb;
