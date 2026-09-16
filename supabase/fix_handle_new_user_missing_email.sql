-- Fix: handle_new_user() (introduced/replaced in sync_profile_names.sql) inserts
-- into public.profiles without the email column. profiles.email is NOT NULL
-- with no default, so every new signup has been failing since that migration
-- was applied:
--   null value in column "email" of relation "profiles" violates not-null constraint
--
-- auth.users.email is always populated for this app's email/password signup
-- (see src/app/api/auth/signup/route.ts, which requires and validates an
-- email before creating the auth user) and is the authoritative source, so
-- this restores it in the insert.
--
-- Existing profiles remediation: NOT required. Every existing profiles row
-- already has a non-null email — they were created before this regression
-- was introduced, by an earlier, correct version of this function. This
-- migration only affects signups going forward.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, subscription_tier)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'free'
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition is unchanged — only the function body above changes.
-- Re-stating it here keeps this migration self-contained and safely
-- re-runnable, matching the existing sync_profile_names.sql convention.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
