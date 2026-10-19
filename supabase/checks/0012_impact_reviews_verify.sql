-- READ-ONLY post-apply check for 0012_impact_reviews.sql. Every row should be ok = true.
select 'impact_reviews table exists' as check_name,
       to_regclass('public.impact_reviews') is not null as ok
union all
select 'RLS enabled on impact_reviews',
       (select relrowsecurity from pg_class where oid = 'public.impact_reviews'::regclass)
union all
select 'no client policies on impact_reviews',
       not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'impact_reviews')
union all
select 'anon/authenticated have no privileges on impact_reviews',
       not (has_table_privilege('anon', 'public.impact_reviews', 'SELECT,INSERT,UPDATE,DELETE')
            or has_table_privilege('authenticated', 'public.impact_reviews', 'SELECT,INSERT,UPDATE,DELETE'))
union all
select 'service_role can SELECT and INSERT impact_reviews',
       has_table_privilege('service_role', 'public.impact_reviews', 'SELECT')
       and has_table_privilege('service_role', 'public.impact_reviews', 'INSERT')
union all
select 'one review per exact change (unique key)',
       exists (select 1 from pg_constraint where conname = 'impact_reviews_one_per_change' and contype = 'u'
               and conrelid = 'public.impact_reviews'::regclass)
union all
select 'outcome restricted to no_change_needed',
       exists (select 1 from pg_constraint where conrelid = 'public.impact_reviews'::regclass and contype = 'c'
               and pg_get_constraintdef(oid) like '%no_change_needed%')
union all
select 'insert + update guard triggers attached',
       (select count(*) from pg_trigger where tgrelid = 'public.impact_reviews'::regclass and not tgisinternal
         and tgname in ('impact_reviews_insert_guard', 'impact_reviews_update_guard') and tgenabled = 'O') = 2
union all
select 'guard functions pinned search_path, no EXECUTE for anon/authenticated',
       (select bool_and(p.proconfig @> array['search_path=""']
                        and not has_function_privilege('anon', p.oid, 'EXECUTE')
                        and not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
          from pg_proc p where p.oid in ('public.impact_reviews_insert_guard()'::regprocedure, 'public.impact_reviews_update_guard()'::regprocedure))
union all
select 'cascades: project, user and every referenced artifact',
       (select count(*) from pg_constraint where conrelid = 'public.impact_reviews'::regclass and contype = 'f' and confdeltype = 'c') = 5
order by 1;
