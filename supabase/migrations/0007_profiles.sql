-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: production catalog captured 2026-10-05 (profiles never had a repo
-- SQL file). Reproduces production EXACTLY, including its policies and grants.
--
-- !! KNOWN-INSECURE AS WRITTEN — deliberately not fixed here. !!
--   * "Public profiles are viewable by everyone" lets anyone holding the public
--     anon key read every user's email and Stripe ids.
--   * "Users can update their own profile" has no column restriction, so a
--     signed-in user can set their own subscription_tier = 'pro'.
--   * "Users can insert their own profile" lets a user without a profile row
--     insert one with subscription_tier = 'pro'.
--   * anon and authenticated hold ALL table privileges.
-- All of these are corrected in 0010_security_hardening.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id uuid not null,
  email text not null,
  full_name text,
  subscription_tier text default 'free'::text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  subscription_current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_email_key unique (email),
  constraint profiles_subscription_tier_check check (subscription_tier = any (array['free'::text, 'pro'::text]))
);

alter table public.profiles enable row level security;

-- ── Policies (exact production names, commands, roles and expressions) ────────
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Two equivalent service-role allow-all policies exist in production. Both are
-- kept as-is (service_role bypasses RLS anyway).
drop policy if exists service_role_all on public.profiles;
create policy service_role_all
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

drop policy if exists service_role_bypass on public.profiles;
create policy service_role_bypass
  on public.profiles for all
  to service_role
  using (true)
  with check (true);

-- ── Grants (production: ALL privileges to anon, authenticated, service_role) ──
grant all on public.profiles to anon, authenticated, service_role;
