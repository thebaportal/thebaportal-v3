-- READ-ONLY post-apply check for 0013_decision_lab_usage.sql. Every row should be ok = true.
with fns(sig) as (values
  ('public.decision_lab_period(timestamptz)'), ('public.decision_lab_used(uuid,date,timestamptz)'),
  ('public.decision_lab_reserve(uuid,uuid,text,integer,timestamptz)'), ('public.decision_lab_settle(uuid,uuid,text,uuid[],timestamptz)'),
  ('public.decision_lab_release(uuid,uuid,timestamptz)'), ('public.decision_lab_quota(uuid,integer,timestamptz)'))
select 'decision_lab_usage table exists' as check_name, to_regclass('public.decision_lab_usage') is not null as ok
union all
select 'RLS enabled, no client policies',
       (select relrowsecurity from pg_class where oid = 'public.decision_lab_usage'::regclass)
       and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decision_lab_usage')
union all
select 'anon/authenticated have no table privileges',
       not (has_table_privilege('anon', 'public.decision_lab_usage', 'SELECT,INSERT,UPDATE,DELETE')
            or has_table_privilege('authenticated', 'public.decision_lab_usage', 'SELECT,INSERT,UPDATE,DELETE'))
union all
select 'one row per (user, request_id)',
       exists (select 1 from pg_constraint where conname = 'decision_lab_usage_one_per_request' and contype = 'u')
union all
select 'status restricted to reserved/consumed/released',
       exists (select 1 from pg_constraint where conrelid = 'public.decision_lab_usage'::regclass and contype = 'c'
               and pg_get_constraintdef(oid) like '%reserved%consumed%released%')
union all
select 'all 6 functions exist with pinned search_path',
       (select count(*) from fns f join pg_proc p on p.oid = to_regprocedure(f.sig) where p.proconfig @> array['search_path=""']) = 6
union all
select 'functions: no EXECUTE for PUBLIC/anon/authenticated',
       not exists (select 1 from fns f, lateral (select to_regprocedure(f.sig) as o) x
                   where has_function_privilege('anon', x.o, 'EXECUTE') or has_function_privilege('authenticated', x.o, 'EXECUTE')
                      or exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = x.o and a.grantee = 0))
union all
select 'functions: service_role can EXECUTE',
       (select bool_and(has_function_privilege('service_role', to_regprocedure(sig), 'EXECUTE')) from fns)
union all
select 'period is the UTC month start',
       public.decision_lab_period('2026-10-31 23:59:59+00') = date '2026-10-01'
       and public.decision_lab_period('2026-11-01 00:00:00+00') = date '2026-11-01'
       and public.decision_lab_period('2026-10-31 20:30:00-05') = date '2026-11-01'
order by 1;
