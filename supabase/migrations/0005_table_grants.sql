-- ════════════════════════════════════════════════════════════════════════════
-- BASELINE — already represented in production. Do NOT run against production.
-- Historical / reproducibility only (see supabase/migrations/README.md).
-- Sources: supabase/fix_phase1_table_grants.sql,
--          supabase/fix_artifact_conversations_grants.sql (grant part),
--          supabase/ba_intelligence_schema.sql (grant part).
--
-- Each table is first reset with REVOKE ALL, then given exactly the privileges
-- production has (captured 2026-10-05): SELECT, INSERT, UPDATE, DELETE for
-- anon, authenticated and service_role. The reset is there only because a new
-- Supabase project's default privileges may grant more (e.g. TRUNCATE) than
-- production has. The end state equals production; nothing is tightened here.
-- ════════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

revoke all on public.organizations          from anon, authenticated, service_role;
revoke all on public.projects               from anon, authenticated, service_role;
revoke all on public.artifacts              from anon, authenticated, service_role;
revoke all on public.decision_log           from anon, authenticated, service_role;
revoke all on public.artifact_conversations from anon, authenticated, service_role;
revoke all on public.ba_intel_sessions      from anon, authenticated, service_role;
revoke all on public.ba_intel_findings      from anon, authenticated, service_role;

grant select, insert, update, delete on public.organizations          to anon, authenticated, service_role;
grant select, insert, update, delete on public.projects               to anon, authenticated, service_role;
grant select, insert, update, delete on public.artifacts              to anon, authenticated, service_role;
grant select, insert, update, delete on public.decision_log           to anon, authenticated, service_role;
grant select, insert, update, delete on public.artifact_conversations to anon, authenticated, service_role;
grant select, insert, update, delete on public.ba_intel_sessions      to anon, authenticated, service_role;
grant select, insert, update, delete on public.ba_intel_findings      to anon, authenticated, service_role;

-- update_updated_at(): production grants EXECUTE to PUBLIC, anon, authenticated
-- (and its owner). Reset and restate so a new project matches exactly.
revoke all on function public.update_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.update_updated_at() to public, anon, authenticated;
