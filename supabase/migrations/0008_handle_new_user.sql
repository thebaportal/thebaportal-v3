-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: supabase/fix_handle_new_user_missing_email.sql (the final version;
-- it supersedes sync_profile_names.sql). Function body is identical to
-- production's pg_get_functiondef output: SECURITY DEFINER, no search_path.
-- The one-off name backfill in sync_profile_names.sql is data, not schema,
-- and is intentionally not part of the baseline.
-- ════════════════════════════════════════════════════════════════════════════

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

-- Production grants EXECUTE to PUBLIC, anon, authenticated (and its owner).
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
