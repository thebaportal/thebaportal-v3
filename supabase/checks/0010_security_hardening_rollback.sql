-- EMERGENCY ROLLBACK for 0010_security_hardening.sql — restores the exact
-- pre-0010 production state (as captured 2026-10-05), INCLUDING its known
-- security holes. Use only if 0010 breaks a legitimate flow in production and
-- a forward fix is not possible quickly. Not a migration; never run by the CLI.

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

revoke update (full_name) on public.profiles from authenticated;
grant all on public.profiles to anon, authenticated;

create or replace function public.activate_pro_subscription(p_user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
  BEGIN
    UPDATE profiles
    SET subscription_tier   = 'pro',
        subscription_status = 'active',
        updated_at          = NOW()
    WHERE id = p_user_id;
  END;
  $function$;
revoke execute on function public.activate_pro_subscription(uuid) from service_role;
grant execute on function public.activate_pro_subscription(uuid) to public, anon, authenticated;

alter function public.handle_new_user() reset search_path;
revoke execute on function public.handle_new_user() from supabase_auth_admin;
grant execute on function public.handle_new_user() to public, anon, authenticated;
