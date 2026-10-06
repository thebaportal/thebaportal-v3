-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Source: production catalog captured 2026-10-05 (no repo SQL file existed).
-- Body identical to production's pg_get_functiondef output.
--
-- !! KNOWN-INSECURE AS WRITTEN — deliberately not fixed here. !!
-- SECURITY DEFINER with EXECUTE granted to PUBLIC, anon and authenticated:
-- anyone with the public anon key can call /rest/v1/rpc/activate_pro_subscription
-- and grant Pro to any user id without paying. Corrected in
-- 0010_security_hardening.sql.
--
-- Legitimate callers (both use the service-role key, server-side):
--   src/app/api/stripe/webhook/route.ts        (checkout.session.completed)
--   src/app/api/stripe/verify-session/route.ts (after Stripe confirms the session)
-- ════════════════════════════════════════════════════════════════════════════

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

-- Production grants EXECUTE to PUBLIC, anon, authenticated (and its owner).
revoke all on function public.activate_pro_subscription(uuid) from public, anon, authenticated, service_role;
grant execute on function public.activate_pro_subscription(uuid) to public, anon, authenticated;
