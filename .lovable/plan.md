# AB Audit (Apr 28) — Fix Plan

The audit confirms 7 fixes from last sprint and lists 8 remaining bugs. I'll tackle them in the audit's recommended sprint order so each unlock builds on the previous one.

## Sprint 3A — Email Engine Goes Live

**BUG-R5: 11 sequences stuck in Draft**
- In `SequencesTab.tsx`, add an "Activate all sequences" button at the top (next to "Generate sequences for all 28 nodes") that flips every `draft` row to `active` via the existing `toggleStatus` path in one bulk call.
- Add a top-of-tab callout when ≥1 sequence is `draft`: "X sequences ready to send — Activate all".
- Confirmation modal lists how many will turn on.

**BUG-R6: Sender email verification unclear**
- In Marketing Hub → Settings, surface the Resend domain/sender verification status with a clear pill: `Verified` / `Pending verification` / `Not sent`.
- Add a "Send confirmation email" button (calls existing Resend verification endpoint, or add one if missing) and an inline banner instructing Pauline to check her inbox.
- Block the "Activate all sequences" action with a tooltip if sender isn't verified, so we never silently fail to send.

## Sprint 3B — Revenue Dashboard Goes Live

**BUG-R2: Revenue Dashboard shows $0 despite Stripe connected**
- Diagnose the `process-purchase` webhook: the function exists and reads `STRIPE_WEBHOOK_SECRET`, so the most likely causes are (a) webhook endpoint not registered in Stripe, (b) secret missing/mismatched, or (c) `verify-purchase` runs but rows aren't landing in the revenue table the dashboard reads from.
- I'll: (1) check `STRIPE_WEBHOOK_SECRET` is set, (2) verify the Connect webhook endpoint exists in Stripe pointing to `…/functions/v1/process-purchase`, (3) inspect recent function logs + the table the Revenue Dashboard queries, (4) re-run a test purchase end-to-end.
- Fix whatever is broken (register endpoint via Stripe API, correct secret, or patch the insert/aggregation query).
- Remove the "Projected" label from cards once real data is wired; show "Actual" when revenue rows exist, "Projected" only when zero.

**BUG-R8: Connect Stripe page misleading copy**
- Update copy on the Connect Stripe page: replace "Payments go directly to your Stripe account" with the accurate destination-charge model: "Readers pay Authors Bureau. We collect a 5% platform fee and pay out the remaining 95% to your connected Stripe account on Stripe's standard payout schedule."

## Sprint 3C — Book Detail Becomes a Storefront

**BUG-R1: Book detail page has no AB products**
- `DynamicBookMicrosite.tsx` currently renders only Amazon CTAs + newsletter. Add a "Get the Full Experience" section between the hero and "Also by" that lists this book's published, paid Authors Bureau products (Workbook, Home Study, Course, Coaching, etc.) sourced from `author_nodes` filtered by `book_id` and `is_live = true`.
- Reuse `<AuthorProductCard>` / `<BuyNowButton>` so checkout, Stripe gating, and analytics already work.
- Hide the section cleanly when no products are live (per public-microsite rules).

**BUG-R7: Funnel views = 0 but conversions = 2**
- Funnels overview aggregate and per-card stats read from different sources. Unify them: switch the per-card card to read from the same aggregate query (likely `track-funnel-view` rollup) the overview uses, or recompute the overview from per-funnel rows. One source of truth either way.

## Sprint 3D — Funnels & Social Calendar Self-Drive

**BUG-R3: 4 funnels stuck in Draft, no guided setup**
- For each step (Traffic / Checkout / Thank You / Onboarding Email), replace the blank editor with a guided card showing: what this step does, what's required, a primary "Set up now" CTA that pre-fills sensible defaults from the book + author profile, and a "Skip for now" link.
- A funnel becomes Publishable when all 4 steps are green; show a single "Publish funnel" button at the top.

**BUG-R4: Social calendar auto-refill never runs**
- The banner promises overnight auto-refill but no scheduled job exists. Add a `pg_cron` job that calls `auto-refill-social-calendar` daily for any author whose runway is ≤7 days.
- Update the banner to show last refill timestamp and next scheduled run, so it stops lying when the job is queued.

## Action Checklist for Pauline (no code)

I'll surface these as dashboard nudges (non-blocking cards) so she sees them on next login:
1. Verify sender email
2. Activate 4 paused campaigns
3. Generate 30 more days of social content (until cron lands)
4. Complete Linny Teo $2.99 test purchase
5. Activate all 11 email sequences (becomes one click after Sprint 3A)

## Technical Notes

- Files most affected:
  - `src/components/dashboard/marketing-hub/SequencesTab.tsx`, `…/SettingsTab.tsx` (or equivalent)
  - `supabase/functions/process-purchase/index.ts` + Stripe webhook registration (via Stripe API)
  - `src/pages/ConnectSettings.tsx` (Stripe copy)
  - `src/pages/DynamicBookMicrosite.tsx` (+ small `author_nodes` query)
  - `src/components/dashboard/FunnelsHub.tsx`, `src/pages/FunnelPage.tsx`
  - New migration: `pg_cron` job for `auto-refill-social-calendar`
- No schema changes expected except the cron schedule. Revenue Dashboard fix may need a tiny adjustment to the products/orders aggregation query depending on root cause.
- Memory rules respected: BuyNowButton for paid products, public microsite hides empty sections, no emdashes, "Powered by Authors Bureau" footer untouched, gpt-5 calls keep default temperature.

## Suggested Order of Execution

1. Sprint 3A (email engine) — biggest immediate revenue unlock
2. Sprint 3B (Stripe webhook + copy) — makes revenue visible
3. Sprint 3C (book detail products + funnel stats) — turns traffic into revenue
4. Sprint 3D (funnel wizard + social cron) — automation polish

Approve and I'll start with Sprint 3A.
