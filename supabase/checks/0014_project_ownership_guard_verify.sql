-- READ-ONLY post-apply check for 0014_project_ownership_guard.sql. Every row should be ok = true.
with t(name) as (values ('artifacts'), ('decision_log'), ('artifact_conversations'),
                        ('ba_intel_sessions'), ('ba_intel_findings'), ('impact_reviews'))
select 'enforce_project_owner() exists, SECURITY DEFINER, pinned search_path' as check_name,
       exists (select 1 from pg_proc where oid = to_regprocedure('public.enforce_project_owner()')
               and prosecdef and proconfig @> array['search_path=""']) as ok
union all
select 'function: no EXECUTE for PUBLIC/anon/authenticated',
       not (has_function_privilege('anon', 'public.enforce_project_owner()', 'EXECUTE')
            or has_function_privilege('authenticated', 'public.enforce_project_owner()', 'EXECUTE')
            or exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                       where p.oid = to_regprocedure('public.enforce_project_owner()') and a.grantee = 0))
union all
select 'guard trigger on all 6 project-scoped tables (BEFORE INSERT/UPDATE, enabled)',
       (select count(*) from t join pg_trigger g on g.tgrelid = ('public.' || t.name)::regclass
          and g.tgname = t.name || '_project_owner_guard' and g.tgenabled = 'O'
          and g.tgfoid = to_regprocedure('public.enforce_project_owner()')) = 6
union all
select 'no existing row references a project its user does not own',
       not exists (select 1 from public.artifacts x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id))
   and not exists (select 1 from public.decision_log x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id))
   and not exists (select 1 from public.artifact_conversations x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id))
   and not exists (select 1 from public.ba_intel_sessions x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id))
   and not exists (select 1 from public.ba_intel_findings x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id))
   and not exists (select 1 from public.impact_reviews x where not exists (select 1 from public.projects p where p.id = x.project_id and p.user_id = x.user_id));
