# Database migrations

An ordered, reproducible definition of TheBAPortal's app schema, in two parts.

| File | Kind | Production status |
|---|---|---|
| `0001_core_tables.sql` | Baseline | Already represented |
| `0002_artifact_conversations.sql` | Baseline | Already represented |
| `0003_ba_intelligence.sql` | Baseline | Already represented |
| `0004_artifact_source_ids.sql` | Baseline | Already represented |
| `0005_table_grants.sql` | Baseline | Already represented |
| `0006_artifact_conversations_unique_key.sql` | Baseline (explicit correction) | Already represented |
| `0007_profiles.sql` | Baseline (**known-insecure as written**) | Already represented |
| `0008_handle_new_user.sql` | Baseline | Already represented |
| `0009_activate_pro_subscription.sql` | Baseline (**known-insecure as written**) | Already represented |
| `0010_security_hardening.sql` | Security fix | **Applied 2026-10-06** |

## Production history

- **Baseline:** production already represents the state of `0001`–`0009`.
  Their SQL was never executed against production.
- **Validated before 0010:** on 2026-10-06 a read-only catalog snapshot of
  production matched the captured baseline exactly, with 0 differences across
  194 objects.
- **First applied migration:** `0010_security_hardening.sql` is the first
  migration from this ordered baseline actually applied to production. It was
  applied on 2026-10-06 at 22:08 UTC, exactly as committed in `d365c3e`, in a
  single transaction.
- **Verified after 0010:**
  - `checks/0010_security_hardening_verify.sql` returned 21/21 `ok`;
  - production's schema matches the hardened state validated on the test
    project, with 0 differences;
  - live smoke checks passed.
- **Bookkeeping:** there is no Supabase CLI migration-history table in
  production. Applied migrations are recorded here only. If the CLI is
  adopted later, bootstrap or repair its history deliberately at that time.

## Baseline: 0001–0009

These files reproduce production exactly as it was captured on 2026-10-05,
from a read-only catalog query. They include production's current policies
and grants, insecure ones included. Nothing was improved inside the baseline.

- **Never run them against production.** Production already contains all of
  this. They exist for history and to build new environments, such as the
  test Supabase project.
- If the Supabase CLI is adopted, mark them as applied in production without
  executing them:
  `supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009`
- They replace the unordered `supabase/*.sql` files as the source of truth for
  the app schema. Those files stay as they are for history. Run in
  alphabetical order, they break: `add_artifact_source_ids.sql` comes before the
  table exists, and `fix_handle_new_user…` comes before `sync_profile_names.sql`.
- `0005` resets grants with `REVOKE ALL` before restating them. This is only
  because a new Supabase project's default privileges may grant more than
  production has. The end state equals production.

### Deliberately outside the baseline

- **Unused legacy objects:** 27 tables, 7 enums, and the
  `set_updated_at()` function. They belong to the old career/learning product,
  which the current app doesn't use. They are left untouched in production.
- **One-off data backfill** in `sync_profile_names.sql`. It is data, not schema.
- **Supabase-managed objects:** extensions (`pgcrypto`, `uuid-ossp`,
  `pg_stat_statements`, `supabase_vault`) and the `auth.*` schema. Every
  Supabase project provides these.

## Security fix: 0010

`0010_security_hardening.sql` is the **only** file meant for production, and
only after:

1. it has been reviewed;
2. the full chain `0001`–`0010` has passed on the test Supabase project
   (validation plan below);
3. it has been explicitly approved for production.

It fixes:

- **Public profile read.** Anyone holding the anon key can read every user's
  email and Stripe IDs. The fix replaces this with an own-row read.
- **Browser profile writes.** The browser could set its own
  `subscription_tier` through UPDATE or INSERT. After the fix it can only
  update `full_name`, and it can't insert profiles at all.
- **`activate_pro_subscription()`.** Anyone could call it. After the fix only
  `service_role` can, and its `search_path` is pinned.
- **`handle_new_user()`.** Its `search_path` is pinned and client EXECUTE is
  removed.

Supporting files are in `supabase/checks/`. Neither one is a migration.

- `0010_security_hardening_verify.sql`: a read-only catalog check. Every row
  should come back `ok = true`.
- `0010_security_hardening_rollback.sql`: restores the exact pre-0010 state,
  security holes included. It is for emergencies only.

## Validation plan (test Supabase project)

- **Environment:** the test project only, never production. Use the synthetic
  account `e2e@thebaportal.test` plus fixture data, with AI calls blocked.
- **Stripe:** use test mode, or call the routes with a mocked or forged
  session in a local build.

### 1. Build

Apply `0001`–`0010` in order to a new project. Every file must apply without
errors.

### 2. Schema parity

Run the read-only introspection query (`schema-introspect.sql`) against the
test project. Then do the same on a second throwaway build of only `0001`–`0009`,
and diff each result against the production capture:

- **`0001`–`0009` only:** the app tables, constraints, indexes, policies,
  grants, triggers and functions must equal production exactly.
- **`0001`–`0010`:** the result differs from production only by the 0010
  changes.

### 3. Verification query

`checks/0010_security_hardening_verify.sql` returns all `ok = true`.

### 4. Attack checks

These must now fail. Use the anon key, and a signed-in user's JWT where noted.

| Request | Expected result |
|---|---|
| `GET /rest/v1/profiles?select=*` with anon key only | `401` or `permission denied` |
| `GET /rest/v1/profiles?select=*` as user A | Only A's row |
| `PATCH /rest/v1/profiles?id=eq.<A>` `{subscription_tier:'pro'}` as A | `permission denied` |
| `PATCH` setting `subscription_status`, `stripe_*` or `email` as A | `permission denied` |
| `PATCH /rest/v1/profiles?id=eq.<B>` `{full_name:'x'}` as A | 0 rows changed |
| `POST /rest/v1/profiles` as a user with no profile row | `permission denied` |
| `DELETE /rest/v1/profiles?id=eq.<A>` as A | `permission denied` |
| `POST /rest/v1/rpc/activate_pro_subscription` as anon | `permission denied` / not found |
| `POST /rest/v1/rpc/activate_pro_subscription` as A | `permission denied` / not found |
| `POST /rest/v1/rpc/handle_new_user` as anon or as A | Refused |

### 5. Legitimate flows

These must still work. Run them against a local build pointed at the test
project.

1. **Sign-up.** Create a new user through the app's sign-up route. A
   `profiles` row is created with `email`, `full_name` and tier `free`.
2. **Magic-link login.** Logging in reaches `/projects`, with the name and
   plan showing.
3. **Settings.** Change the name and save. It persists after reload, and the
   saved row shows that only `full_name` changed.
4. **Template Studio.** `/templates` shows the user's name and tier, not
   empty or null.
5. **Projects, Project Home, Intelligence, New Project.** These pages load and
   show the profile name and tier. They read through the service-role key.
6. **Stripe `verify-session`.** Use a completed test-mode Checkout session.
   The route returns `success`, and the profile becomes `pro`/`active`.
7. **Stripe webhook.** Send a test-mode `checkout.session.completed` with
   `metadata.supabase_user_id`. The profile becomes `pro`, and no
   `activate_pro_subscription failed` appears in the logs. Also check
   `customer.subscription.*` events, which update profiles directly through
   the service-role key.
8. **Checkout and billing portal.** Both routes still read and write
   `stripe_customer_id`.
9. **Smoke suite.** Run `rollout2.mjs`, pointed at the test project.

### 6. Rollback rehearsal

On the test project, run `checks/0010_security_hardening_rollback.sql`, then
re-apply `0010`. Both must succeed.

### 7. Production (after approval only)

1. Mark `0001`–`0009` as applied. This is bookkeeping only.
2. Apply `0010`.
3. Run the verify query.
4. Do a quick live check of sign-up, the Settings name save, Template Studio,
   and one test-mode Stripe checkout.
