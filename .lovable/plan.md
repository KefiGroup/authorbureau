
# Plan: Close the "paying subscriber but invisible" gap

Two independent fixes, shipped together. Both are admin/back-office plumbing — no author-facing UI changes.

---

## Part 1 — Auto-create CRM contact on every paid subscription

**Goal:** Every Stripe customer with an active subscription appears in the platform CRM, regardless of whether they came through a lead funnel.

### What we build

1. **New edge function `sync-stripe-subscriber-to-crm`** (`verify_jwt = false`, service-role)
   - Input: `{ stripe_customer_id?, email?, subscription_id? }` (any one is enough; we fetch the rest from Stripe)
   - Resolves: email, name, subscription status, price/product, coupon
   - Upserts into `crm_contacts` keyed on email (case-insensitive). Sets:
     - `source = 'stripe_subscription'`
     - `tags` += `['paying_subscriber', tier]` (tier inferred from price → BP/BA/YR)
     - `last_node_id` left null (no funnel touchpoint), `archetype` skipped
     - `author_id` = the Authors Bureau platform admin author (so it shows in admin CRM, not a single author's CRM). If we have a matching `author_profiles.user_id` for that email, attach there too.
   - Logs a `lead_activities` row: `type = 'subscription_started'`, payload = subscription/price/coupon ids
   - Idempotent: re-running on the same subscription updates tags + activity, never duplicates.

2. **Stripe webhook handler additions** (existing `stripe-webhook` function — extend, don't fork)
   - Listen for `customer.subscription.created` and `customer.subscription.updated` (status → active)
   - Fire `sync-stripe-subscriber-to-crm` with the subscription id
   - Webhook secret already in env (`STRIPE_WEBHOOK_SECRET`)

3. **One-time backfill**
   - Admin-only edge function `backfill-stripe-subscribers-to-crm` that lists all active Stripe subscriptions and runs the sync function for each. Run once after deploy. Idempotent so re-runs are safe.

### Verify
- Trigger: create a test subscription → confirm row appears in `crm_contacts` within seconds, with `paying_subscriber` tag and a `lead_activities` entry.
- Backfill: confirm Veronica + Pauline + every other paying author shows up.

---

## Part 2 — Ghost author profile claim flow

**Goal:** Veronica (and any future ghost) can log into the dashboard.

### What we build

1. **Admin RPC `admin_send_claim_invite(p_author_profile_id uuid)`** (security definer)
   - Verifies caller is admin
   - Reads `author_profiles.id` → resolves email via `books.owner_email` (since `user_id` is null/ghost)
   - Calls Supabase Admin API `inviteUserByEmail(email, { data: { claim_author_profile_id } })` via an edge function (RPCs can't call admin API directly — so this is really an edge function `admin-invite-ghost-author` that the RPC just routes to)
   - On invite acceptance, a trigger on `auth.users` insert backfills `author_profiles.user_id` where `author_profiles.id = raw_user_meta_data->>'claim_author_profile_id'`
   - Logs to `admin_audit_log` with `event_key = 'author.claim_invite_sent'`

2. **Admin UI surface** (small addition only)
   - In the existing admin Authors tab, ghost rows (`user_id is null` or fails `auth.users` exists check) get a **"Send claim invite"** button
   - Uses the existing `list_author_profile_orphans()` RPC to surface them in a dedicated "Ghost profiles" section above the main list
   - After click → toast "Invite sent to {email}" + audit log entry

3. **One-shot for Veronica**
   - Run the invite for `veronicagogetter320@gmail.com` immediately after deploy as the smoke test.

### Verify
- Veronica receives invite email → sets password → logs in → her existing `author_profiles` row gets `user_id` populated → her book + subscription appear in her dashboard.

---

## Out of scope
- No changes to the BP100/BA100/YR100 forever-coupon work (still pending the email list from you).
- No author-facing CRM changes (this fills the *admin* CRM; per-author CRM still requires funnel touchpoints).
- No new pricing/plan logic.

## Technical notes (for the dev)
- Stripe webhook events to add: `customer.subscription.created`, `customer.subscription.updated`. Already wired for `checkout.session.completed` and `invoice.*`.
- `crm_contacts.author_id` legacy convention = `user_id` (per memory `Sprint 58 — CRM Daily Intelligence`). Use the platform admin's `auth.uid()` for platform-level subscriber rows.
- `lead_activities.author_id` = `author_profiles.id` (different convention — same memory).
- Invite link uses Supabase auth's built-in invite flow; redirect URL = `/auth/claim?profile={id}`.
- Trigger on `auth.users` AFTER INSERT: if `raw_user_meta_data->>'claim_author_profile_id'` is set and that profile has `user_id IS NULL`, set `user_id = NEW.id`.

## Order of operations
1. Migration: add `auth.users` AFTER INSERT trigger for claim backfill.
2. Deploy `sync-stripe-subscriber-to-crm` + extend `stripe-webhook`.
3. Deploy `backfill-stripe-subscribers-to-crm` and `admin-invite-ghost-author`.
4. Add admin UI ghost-profile section + invite button.
5. Run backfill once. Send Veronica's invite. Verify both.
