-- phase1_schema.sql created organizations/projects/artifacts/decision_log with RLS
-- policies, but never granted table-level privileges to the Supabase API roles.
-- RLS restricts which rows a role can see; without a GRANT, Postgres refuses the
-- query before RLS is ever evaluated (error 42501: permission denied for table X).
-- This is why these four tables return 42501 for every request, including the
-- service-role key, while every other table works normally.
-- Run in Supabase SQL editor.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.organizations to anon, authenticated, service_role;
grant select, insert, update, delete on public.projects       to anon, authenticated, service_role;
grant select, insert, update, delete on public.artifacts      to anon, authenticated, service_role;
grant select, insert, update, delete on public.decision_log   to anon, authenticated, service_role;
