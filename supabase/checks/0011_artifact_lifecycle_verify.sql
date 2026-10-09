-- READ-ONLY post-apply check for 0011_artifact_lifecycle_integrity.sql. Every row should be ok = true.
with fns(sig) as (values
  ('public.artifact_approve(uuid,uuid,uuid)'), ('public.artifact_revise(uuid,uuid,uuid)'),
  ('public.artifact_save_working_draft(uuid,uuid,text,text,text,jsonb,uuid[])'),
  ('public.artifact_create_decision(uuid,uuid,text,text,jsonb,uuid[])'),
  ('public.artifact_insert_approved(uuid,uuid,text,text,text,jsonb,uuid[])'),
  ('public.artifact_lineage_lock(uuid,uuid,text,uuid)'))
select 'lineage_id column exists' as check_name,
       exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'artifacts' and column_name = 'lineage_id') as ok
union all
select 'lineage CHECK ties lineage_id to decision_lab_output',
       exists (select 1 from pg_constraint where conname = 'artifacts_lineage_matches_type' and conrelid = 'public.artifacts'::regclass)
union all
select 'unique index: one Approved per lineage',
       exists (select 1 from pg_indexes where indexname = 'artifacts_one_approved_per_lineage' and indexdef like '%UNIQUE%' and indexdef like '%status = ''approved''%')
union all
select 'unique index: one working Draft per lineage',
       exists (select 1 from pg_indexes where indexname = 'artifacts_one_working_draft_per_lineage' and indexdef like '%UNIQUE%')
union all
select 'unique index: version per lineage',
       exists (select 1 from pg_indexes where indexname = 'artifacts_unique_version_per_lineage' and indexdef like '%UNIQUE%')
union all
select 'insert + update guard triggers attached',
       (select count(*) from pg_trigger where tgrelid = 'public.artifacts'::regclass and not tgisinternal
         and tgname in ('artifacts_insert_guard', 'artifacts_update_guard')) = 2
union all
select 'lifecycle functions exist with pinned search_path',
       (select count(*) from fns f join pg_proc p on p.oid = to_regprocedure(f.sig) where p.proconfig @> array['search_path=""']) = 6
union all
select 'lifecycle functions: no EXECUTE for PUBLIC/anon/authenticated',
       not exists (select 1 from fns f, lateral (select to_regprocedure(f.sig) as o) x
                   where has_function_privilege('anon', x.o, 'EXECUTE') or has_function_privilege('authenticated', x.o, 'EXECUTE')
                      or exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = x.o and a.grantee = 0))
union all
select 'lifecycle functions: service_role can EXECUTE',
       (select bool_and(has_function_privilege('service_role', to_regprocedure(sig), 'EXECUTE')) from fns)
union all
select 'data: Decision Lab rows all carry a lineage, others none',
       not exists (select 1 from public.artifacts where (type = 'decision_lab_output') <> (lineage_id is not null))
union all
select 'data: at most one Approved per lineage',
       not exists (select 1 from public.artifacts where status = 'approved'
                   group by project_id, user_id, type, lineage_id having count(*) > 1)
union all
select 'data: at most one working Draft per lineage',
       not exists (select 1 from public.artifacts where status in ('draft', 'in_review')
                   group by project_id, user_id, type, lineage_id having count(*) > 1)
order by 1;
