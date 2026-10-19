-- ROLLBACK for 0012_impact_reviews.sql. Not a migration; never run by the CLI. Runs as one transaction.
--
-- Drops the acknowledgement table and its guards. The only data lost is "reviewed —
-- no change needed" acknowledgements: after rollback those impacts are shown again
-- as possible impacts (detection is computed from artifacts and is unaffected).
-- No artifact, project or other table is touched. Re-applying 0012 is safe.

drop trigger if exists impact_reviews_insert_guard on public.impact_reviews;
drop trigger if exists impact_reviews_update_guard on public.impact_reviews;
drop table if exists public.impact_reviews;
drop function if exists public.impact_reviews_insert_guard();
drop function if exists public.impact_reviews_update_guard();
