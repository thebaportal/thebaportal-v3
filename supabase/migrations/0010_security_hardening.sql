-- ════════════════════════════════════════════════════════════════════════════
-- 0010 — SECURITY HARDENING            STATUS: PENDING REVIEW — NOT APPLIED
-- ════════════════════════════════════════════════════════════════════════════
-- The only migration intended to run against production, and only after
-- review and a passing run on the test Supabase project. See README.md.
--
-- Fixes, against the production state reproduced by 0001–0009:
--   A. profiles readable by everyone (anon key exposes all emails / Stripe ids)
--   B. browser can set its own subscription_tier (UPDATE and INSERT paths)
--   C. activate_pro_subscription() callable by anon/authenticated (free Pro)
--   D. SECURITY DEFINER functions: pin search_path, remove client EXECUTE
--
-- Preserved legitimate behaviour (all verified against src/ on 2026-10-05):
--   * Settings name save: browser (anon key + user session)
--       profiles.update({ full_name }).eq("id", userId)
--     -> needs UPDATE(full_name) + SELECT on own row      -> kept
--   * Template Studio: server, session client (RLS applies)
--       profiles.select("full_name, subscription_tier").eq("id", user.id)
--     -> needs SELECT on own row                         -> kept
--   * Every other profiles read/write (projects, settings page, Stripe
--     checkout/portal/webhook, admin/sync-names) uses the service-role key
--     -> unaffected (service_role keeps ALL; it bypasses RLS)
--   * Stripe webhook + verify-session call activate_pro_subscription via the
--     service-role key -> EXECUTE granted to service_role
--   * Sign-up: auth.users trigger -> handle_new_user() (SECURITY DEFINER,
--     owner postgres) inserts the profile -> unaffected by client grants
--
-- Not changed (out of scope by decision): duplicate service_role_all /
-- service_role_bypass policies; legacy tables, enums and set_updated_at();
-- the core app tables' grants and policies.
--
-- Atomicity: the Supabase CLI runs a migration file in one transaction, and
-- the Dashboard SQL editor runs a multi-statement script as one implicit
-- transaction, so this either applies completely or not at all.
-- ════════════════════════════════════════════════════════════════════════════


-- ── A. profiles: replace "readable by everyone" with own-row read ────────────
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);


-- ── B. profiles: browser may update only full_name; no browser INSERT ────────
-- RLS restricts rows, not columns, so the column restriction is enforced with
-- privileges. The existing own-row UPDATE policy stays as the row restriction.
-- Profiles are created only by handle_new_user() (SECURITY DEFINER) or by
-- service-role server code; no browser code inserts or deletes profiles.
drop policy if exists "Users can insert their own profile" on public.profiles;

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;

grant select             on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- service_role keeps ALL on profiles (unchanged).


-- ── C + D. activate_pro_subscription(uuid) ───────────────────────────────────
-- SECURITY DEFINER. search_path was 'public'; pinned to '' (empty) with the
-- table reference schema-qualified, so name resolution cannot be redirected.
-- Behaviour is otherwise identical. CREATE OR REPLACE keeps the owner.
create or replace function public.activate_pro_subscription(p_user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
  BEGIN
    UPDATE public.profiles
    SET subscription_tier   = 'pro',
        subscription_status = 'active',
        updated_at          = NOW()
    WHERE id = p_user_id;
  END;
  $function$;

revoke execute on function public.activate_pro_subscription(uuid) from public;
revoke execute on function public.activate_pro_subscription(uuid) from anon, authenticated;
grant  execute on function public.activate_pro_subscription(uuid) to service_role;


-- ── D. handle_new_user() ─────────────────────────────────────────────────────
-- SECURITY DEFINER, previously no search_path (inherits the caller's). Its body
-- already schema-qualifies public.profiles and uses only built-ins, so an
-- empty search_path changes nothing functionally. Body untouched.
alter function public.handle_new_user() set search_path to '';

-- Trigger function: it can only run as a trigger, so clients never need
-- EXECUTE. Postgres does not check EXECUTE when firing a trigger; the explicit
-- grant to supabase_auth_admin (the role that inserts into auth.users) is
-- belt-and-braces so sign-up cannot depend on that detail.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
grant  execute on function public.handle_new_user() to supabase_auth_admin;


-- ── Reviewed, intentionally unchanged ────────────────────────────────────────
-- update_updated_at(), set_updated_at(): SECURITY INVOKER trigger functions
-- (run with the caller's own privileges), so they carry no escalation risk.
-- They are the only other functions in the public schema.
