# Stripe: `subscription_current_period_end` is never saved

**Status:** open. Logged 2026-10-06. Not fixed: deliberately kept out of the
0010 security-hardening batch.
**Area:** `src/app/api/stripe/webhook/route.ts`, plus the Settings billing panel.

## Symptom

`profiles.subscription_current_period_end` stays `NULL` for every subscriber.

Settings → Billing (`src/app/settings/SettingsClient.tsx:378-382`) is meant to
show "Next billing on {date}", or "Access until {date}" when a subscription is
cancelled. Because the field is always empty, neither line ever appears.

This was seen in production on 2026-10-06. A test-mode checkout made the
profile `pro`/`active`, and the production webhook set
`stripe_subscription_id`, but the period end was still empty.

## Root cause

The webhook reads the period end from the top level of the subscription:

```ts
// webhook/route.ts:71-72  (customer.subscription.created / .updated)
subscription_current_period_end: (subscription as any).current_period_end
  ? new Date((subscription as any).current_period_end * 1000).toISOString()
  : null,
```

From API version 2025-03-31 ("basil") onwards, Stripe moved
`current_period_start`/`current_period_end` from the Subscription to each
**Subscription Item**. The app pins `apiVersion: "2026-02-25.clover"` and uses
`stripe@20.4.0`, whose `Subscription` type has no `current_period_end`; it only
exists on `SubscriptionItem` (`types/SubscriptionItems.d.ts:53`). The
`as any` cast hid the mismatch from TypeScript, so the read always returns
`undefined` and the code writes `null`.

## Where the period end lives now

These were confirmed read-only against the test Stripe sandbox, using the
header `Stripe-Version: 2026-02-25.clover`.

| Object or event | Field | Value in the sandbox |
|---|---|---|
| Subscription | `current_period_end` | **missing**; only `cancel_at_period_end` remains |
| Subscription | `items.data[].current_period_end` | present, e.g. `1793984150` |
| `customer.subscription.created` event | `data.object.current_period_end` | **missing** |
| `customer.subscription.created` event | `data.object.items.data[0].current_period_end` | present |
| Invoice (`subscription_create`) | `period_end` | equals `period_start`. **Not** the billing-period end, so don't use it |
| Invoice (`subscription_create`) | `lines.data[].period.end` | the correct period end |

Webhook payloads are rendered at the API version of the Stripe webhook
endpoint, not the SDK's version. Production's endpoint version hasn't been
checked yet, so the fix should read from the items first and fall back to the
old top-level field.

## Events that should set the field

| Event | What to do | Why |
|---|---|---|
| `customer.subscription.created` | Set it from the items | First period after checkout. |
| `customer.subscription.updated` | Set it from the items | Fires on every renewal, plan change, and cancel or uncancel. This keeps the date current. |
| `customer.subscription.deleted` | Set it to `null` | Already done correctly (route.ts:91). |
| `checkout.session.completed` | Leave unchanged | It calls `activate_pro_subscription` only; `subscription.created` covers the period end. |
| `invoice.paid` | Optional; not needed | `subscription.updated` already covers renewals. If ever added, use `lines.data[].period.end`, not `invoice.period_end`. |

`verify-session` can stay as it is. It only activates Pro, and the
subscription events set the date shortly afterwards.

## Proposed code change (not applied)

In `src/app/api/stripe/webhook/route.ts`, `customer.subscription.created/updated`:

```ts
// Billing-period end lives on subscription items since API 2025-03-31 (basil).
// Fall back to the legacy top-level field for endpoints on older API versions.
const itemPeriodEnds = subscription.items?.data?.map(i => i.current_period_end).filter(Boolean) ?? [];
const legacyPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
const periodEnd = itemPeriodEnds.length ? Math.max(...itemPeriodEnds) : legacyPeriodEnd ?? null;
...
subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
```

The subscriptions have a single Pro price, so `Math.max` over the items equals
`items[0]`. It still behaves correctly if more items are added later. While
editing this, also replace `(subscription as any).cancel_at_period_end`: that
field is typed on the current version, so the cast isn't needed.

No database change is needed, because the column already exists. Writes go
through the service-role key, which keeps its full access to `profiles` after
0010.

## Tests (test Supabase project + Stripe sandbox only)

The repo has no unit-test runner, so the checks would extend the scratchpad
harness already used for the 0010 validation (`testproj/webhook.mjs`,
`flows.mjs`). The isolated app runs on :3100 against the test project. The
sandbox has **zero webhook endpoints**, so events are replayed to the local app
with the local test-only signing secret.

1. **Created:** after a real sandbox checkout (test card 4242), fetch the
   sandbox's `customer.subscription.created` event, sign it and send it to the
   local app. Expect `subscription_current_period_end` to equal
   `items.data[0].current_period_end`, converted to an ISO date.
2. **Renewal:** create the subscription on a Stripe **test clock**, advance the
   clock past the period end, fetch the resulting
   `customer.subscription.updated` event and replay it. Expect the stored date
   to move forward by one billing period.
3. **Cancel at period end:** set `cancel_at_period_end=true` in the sandbox and
   replay the `updated` event. Expect the status to be `canceled`, the tier to
   stay `pro`, and the period end to be kept. Settings should show "Access until
   {date}".
4. **Deleted:** replay `customer.subscription.deleted`. Expect the tier `free`
   and the period end `null`.
5. **Legacy payload:** sign a synthetic `updated` event that has only a
   top-level `current_period_end` and no items. Expect the fallback to store it.
6. **UI:** Settings → Billing shows "Next billing on {date}" for an active
   subscription.
7. **Regressions:** re-run `webhook.mjs`, `flows.mjs stripe`, `attacks.mjs`
   and the smoke suite.

Before any production change, check the production Stripe webhook endpoint's
API version in the Stripe dashboard (Developers → Webhooks). Existing
production subscribers: 0 Pro profiles as of 2026-10-06, so no backfill is
needed now. If there are paying subscribers by the time this ships, backfill
with a one-off service-role script that reads each subscription's items.
