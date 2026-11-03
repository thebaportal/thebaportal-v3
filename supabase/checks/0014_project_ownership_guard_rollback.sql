-- Rollback for 0014_project_ownership_guard.sql: removes the six triggers and the function.
-- No data is changed. Run as one transaction.
drop trigger if exists artifacts_project_owner_guard on public.artifacts;
drop trigger if exists decision_log_project_owner_guard on public.decision_log;
drop trigger if exists artifact_conversations_project_owner_guard on public.artifact_conversations;
drop trigger if exists ba_intel_sessions_project_owner_guard on public.ba_intel_sessions;
drop trigger if exists ba_intel_findings_project_owner_guard on public.ba_intel_findings;
drop trigger if exists impact_reviews_project_owner_guard on public.impact_reviews;
drop function if exists public.enforce_project_owner();
