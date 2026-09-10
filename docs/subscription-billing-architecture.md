# Subscription Billing Architecture

Tracks issue #171: define how Little Loops charges €9.99/month.

## Context

An earlier billing architecture (#19, implemented in #32–#48) targeted a
**one-time €9.99 lifetime unlock** sold through native Apple/Google
in-app-purchase, for a Capacitor-wrapped native app. That native wrapper
(iOS/Android projects, Capacitor config) was removed on 2026-06-01 when the
product pivoted to a web-only app deployed to GitHub Pages. None of that
billing code exists in the repo today — this is a fresh design, not a
resurrection of the old one.

The current ask is different in two ways:
- **Recurring**, not one-time (€9.99/month vs. a lifetime unlock)
- **Web-only**, not native — so store IAP (which requires a native app
  binary) is not an option; this needs a web payment processor

## Recommendation: Stripe Checkout + Billing, gated at the household level

Why Stripe over alternatives:
- No native app to hang App Store/Play Store IAP off of
- Subscriptions, EU VAT/tax handling, dunning (failed-payment retries), and
  a self-serve customer portal (cancel/update card) are built in — building
  any of that by hand is a lot of surface area for a solo-maintained app
- Supabase (already in use) has no native billing product; Stripe integrates
  cleanly via a couple of Edge Functions, which this repo already has a
  pattern for (`supabase/functions/`)

Entitlement is tied to the **household**, matching the existing data model
in [accounts-architecture.md](accounts-architecture.md) — one subscription
per household, any parent member of a subscribed household gets full access.

## Data model changes

New columns on `households` (migration
`supabase/migrations/<timestamp>_add_subscription_fields.sql`):

```sql
alter table households
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text
    check (subscription_status in
      ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'))
    not null default 'none',
  add column current_period_end timestamptz;

create index households_stripe_customer_id_idx on households (stripe_customer_id);
```

`subscription_status` mirrors Stripe's own subscription status values
directly (minus a couple Stripe statuses that collapse to `none` for our
purposes) so the webhook handler can set it 1:1 without a translation table
that can drift out of sync.

RLS: these columns are readable by household members (existing `households`
select policy already covers this) but writable **only** by the
service-role key used inside the webhook Edge Function — parents must never
be able to set their own `subscription_status` from the client. Add an
explicit `update` policy denial (or simply don't grant `update` on these
columns to the `authenticated` role) alongside the webhook's service-role
bypass.

## Backend: two Supabase Edge Functions

### `create-checkout-session`
- Input: household ID of the caller's household (derived from the
  authenticated session, not trusted from the client body)
- Creates (or reuses) a Stripe Customer for the household, creates a
  Checkout Session in `subscription` mode for the €9.99/month Price, with
  `success_url`/`cancel_url` back into the app
- Returns the Checkout Session URL; the client redirects the browser to it
- This function needs the Stripe **secret** key as a Supabase Edge Function
  secret (`STRIPE_SECRET_KEY`) — never shipped to the client

### `stripe-webhook`
- Verifies the Stripe signature header against a webhook signing secret
  (`STRIPE_WEBHOOK_SECRET`) before trusting any payload — this is the one
  place fraud/spoofing risk lives if skipped
- Handles:
  - `checkout.session.completed` → store `stripe_customer_id` +
    `stripe_subscription_id` on the household, set status from the session
  - `customer.subscription.updated` → sync `subscription_status` +
    `current_period_end` (covers renewals, plan changes, Stripe's own
    past-due retry cycle)
  - `customer.subscription.deleted` → set `subscription_status = 'canceled'`
  - `invoice.payment_failed` → no separate handling needed;
    `customer.subscription.updated` already fires with `status: 'past_due'`
- Must be idempotent — Stripe retries webhooks on non-2xx and can send the
  same event twice; upsert on `stripe_subscription_id`, don't assume
  exactly-once delivery

### `customer-portal-session` (self-serve billing management)
- Input: same household-derived auth as above
- Creates a Stripe Billing Portal session for the household's
  `stripe_customer_id`, returns the URL
- This is what "cancel my subscription" / "update card" links to in
  Parent Settings — building a custom cancel/upgrade UI is unnecessary,
  Stripe's hosted portal covers it

## Frontend changes

- `ParentSettings.tsx`: subscription status section — "Subscribe" button
  (calls `create-checkout-session`, redirects) when `status` is `none`;
  "Manage billing" button (calls `customer-portal-session`) when
  `status` is `active`/`trialing`/`past_due`
- A household-level entitlement check (e.g. `useHouseholdSubscription()`
  hook reading `subscription_status` from the already-fetched household
  row) gates whichever features are meant to be paid-only — this repo
  doesn't currently have a "free vs. paid" feature split defined, so that
  gating boundary is a product decision that needs to happen before this
  is implementable, not a technical one
- `past_due` should not immediately lock the household out — Stripe's
  automatic retry (Smart Retries) already gives a grace window; treat
  `past_due` the same as `active` in the UI, only gate on `canceled`/`none`

## What's explicitly out of scope for v1

- Free trial period — easy to add later as a Stripe Price/Checkout Session
  parameter, not a schema change, so deferring doesn't cost rework
- Annual billing option — same, add a second Stripe Price later
- Proration/multiple households per subscription — current data model is
  one household per parent account (per accounts-architecture.md), so this
  doesn't apply yet

## What's needed from Dora before implementation can start

- A Stripe account for Little Loops (test mode is enough to build against)
- The €9.99/month Price created in the Stripe dashboard, and its Price ID
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set as Supabase Edge
  Function secrets (`supabase secrets set`) — these are the only two values
  needed to wire this up once the design below is implemented

## Build order

1. Migration: add subscription columns to `households`
2. `create-checkout-session` Edge Function + Stripe test-mode Price
3. `stripe-webhook` Edge Function, registered in the Stripe dashboard
   pointing at the deployed function URL
4. `customer-portal-session` Edge Function
5. Frontend: subscription section in Parent Settings + entitlement hook
6. End-to-end test in Stripe test mode: subscribe, cancel via portal,
   simulate a failed payment (Stripe test card `4000 0000 0000 0341`)
7. Switch to Stripe live mode keys for production
