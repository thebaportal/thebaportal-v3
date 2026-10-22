-- ROLLBACK for 0013_decision_lab_usage.sql. Not a migration; never run by the CLI. Runs as one transaction.
--
-- Drops the Decision Lab usage table and its functions. Effect: this month's Free
-- usage counts are lost (Free users get a fresh allowance) and stored results for
-- idempotent replay are gone. No other table is touched. The app must be rolled
-- back to a version without the quota before (or together with) this script.
-- Re-applying 0013 is safe.

drop function if exists public.decision_lab_quota(uuid, int, timestamptz);
drop function if exists public.decision_lab_release(uuid, uuid, timestamptz);
drop function if exists public.decision_lab_settle(uuid, uuid, text, uuid[], timestamptz);
drop function if exists public.decision_lab_reserve(uuid, uuid, text, int, timestamptz);
drop function if exists public.decision_lab_used(uuid, date, timestamptz);
drop function if exists public.decision_lab_period(timestamptz);
drop table if exists public.decision_lab_usage;
