-- READ-ONLY post-apply check for 0010_security_hardening.sql.
-- Selects catalog metadata only; changes nothing. Every row should show ok = true.

select 'no public-read policy on profiles' as check_name,
       not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                   and policyname = 'Public profiles are viewable by everyone') as ok
union all
select 'own-row select policy exists',
       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
               and policyname = 'Users can view their own profile' and cmd = 'SELECT')
union all
select 'no browser insert policy',
       not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                   and policyname = 'Users can insert their own profile')
union all
select 'own-row update policy kept',
       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
               and policyname = 'Users can update their own profile')
union all
select 'service-role policies kept (2)',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles'
        and policyname in ('service_role_all', 'service_role_bypass')) = 2
union all
select 'anon has no profiles privileges',
       not has_table_privilege('anon', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
union all
select 'authenticated can select profiles',
       has_table_privilege('authenticated', 'public.profiles', 'SELECT')
union all
select 'authenticated cannot insert/delete/truncate profiles',
       not has_table_privilege('authenticated', 'public.profiles', 'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER')
union all
select 'authenticated can update full_name',
       has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
union all
select 'authenticated cannot update subscription_tier',
       not has_column_privilege('authenticated', 'public.profiles', 'subscription_tier', 'UPDATE')
union all
select 'authenticated cannot update stripe/status/email columns',
       not (has_column_privilege('authenticated', 'public.profiles', 'subscription_status', 'UPDATE')
         or has_column_privilege('authenticated', 'public.profiles', 'stripe_customer_id', 'UPDATE')
         or has_column_privilege('authenticated', 'public.profiles', 'stripe_subscription_id', 'UPDATE')
         or has_column_privilege('authenticated', 'public.profiles', 'subscription_current_period_end', 'UPDATE')
         or has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')
         or has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'))
union all
select 'service_role keeps full profiles access',
       has_table_privilege('service_role', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE')
union all
select 'activate_pro: anon cannot execute',
       not has_function_privilege('anon', 'public.activate_pro_subscription(uuid)', 'EXECUTE')
union all
select 'activate_pro: authenticated cannot execute',
       not has_function_privilege('authenticated', 'public.activate_pro_subscription(uuid)', 'EXECUTE')
union all
select 'activate_pro: no PUBLIC grant',
       not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                   where p.oid = 'public.activate_pro_subscription(uuid)'::regprocedure
                   and a.grantee = 0 and a.privilege_type = 'EXECUTE')
union all
select 'activate_pro: service_role can execute',
       has_function_privilege('service_role', 'public.activate_pro_subscription(uuid)', 'EXECUTE')
union all
select 'activate_pro: still SECURITY DEFINER, search_path pinned',
       exists (select 1 from pg_proc where oid = 'public.activate_pro_subscription(uuid)'::regprocedure
               and prosecdef and proconfig @> array['search_path=""'])
union all
select 'handle_new_user: anon/authenticated cannot execute',
       not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
       and not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
union all
select 'handle_new_user: search_path pinned',
       exists (select 1 from pg_proc where oid = 'public.handle_new_user()'::regprocedure
               and prosecdef and proconfig @> array['search_path=""'])
union all
select 'sign-up trigger still attached',
       exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'
               and tgrelid = 'auth.users'::regclass and not tgisinternal)
union all
select 'no other SECURITY DEFINER function in public lacks a search_path',
       not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and prosecdef
                   and not coalesce(proconfig::text, '') like '%search_path=%')
order by 1;
