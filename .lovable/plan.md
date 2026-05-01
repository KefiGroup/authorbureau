# Correct Commerce Readiness: Decouple Stripe Express from "Live" Status

## Background

The previous audit incorrectly added a `stripeConnected` gate to 17 commerce nodes in `node-readiness.ts`. This was based on a wrong mental model.

**Correct model (locked in memory):**
- Authors Bureau is **Merchant of Record** — the platform's Stripe account processes ALL reader payments
- Readers can buy from any author's product the moment content is ready
- Author's Stripe Express connection only matters for **payouts** (admin sending the author their 92%)
- Whether payouts are automated (Stripe Express transfer) or manual (admin task) is a back-office decision — not a customer-facing readiness gate

## Goal

Remove Stripe-connection from the commerce-readiness gate. A commerce node is "Live" when it has the required content + pricing assets. Payout setup is a separate, admin-side concern.

## Changes

### 1. `supabase/functions/_shared/node-readiness.ts` and `src/lib/node-readiness.ts`
- Remove `COMMERCE_NODES` set and the `ctx.stripeConnected === false` short-circuit at the top of `hasRequiredAssets()`
- Remove `stripeConnected` from the `ReadinessContext` type (or keep the type field as optional/unused for backward compat, but stop reading it)
- **Keep** all asset-specific gates added in the previous sprint:
  - BP-01: requires `email_sequence_id` + `steps[]`
  - BP-03: requires `posts_generated > 0` or `content_calendar_id`
  - BA-11: requires `narration_script_url` / `acx_guide_generated` / `chapters[]`
  - BA-17: ≥ 2 bundle items + commerce signal (price_usd > 0 OR stripe_price_id)
  - YR-19..28: title + commerce signal; session-style nodes (YR-19/22/23/24) also require `session_type` or `booking_url`
- Commerce signal stays as **`price_usd > 0` OR `stripe_price_id` set on the node** — this is product pricing, NOT author Stripe connection

### 2. `src/hooks/useBookNodeProgress.ts` and `src/hooks/useNodeLiveStats.ts`
- Remove the `author_profiles.stripe_onboarding_complete` fetch added last sprint
- Stop passing `stripeConnected` into `hasRequiredAssets()`
- Simplifies the hooks back to a single query path

### 3. `supabase/functions/author-stats/index.ts`
- Remove the `stripe_onboarding_complete` lookup
- Stop threading `stripeConnected` into the readiness call
- Redeploy the function

### 4. `src/lib/__tests__/node-readiness.test.ts`
- Delete the "commerce-rejected when Stripe not connected" fixture group
- Keep all asset-specific fixture groups (these are still correct)
- Add a positive fixture: commerce node with content + price but no author Stripe → must be **Live**

### 5. Memory updates
Update `mem://architecture/commerce-engine-v1` to add an explicit clause:

> **Stripe Express connection NEVER gates commerce readiness or "Live" status.** It only governs payout method (automated transfer vs. admin-handled manual payout). Authors Bureau collects all reader payments via the platform's Stripe account regardless of author payout setup.

Add a Core rule line to `mem://index.md`:

> **Payout vs Commerce Separation**: Stripe Express connection is a back-office payout-method decision only. It must NEVER appear in `hasRequiredAssets()` or affect node Live status. Reader payments always flow to the Authors Bureau Stripe account; payouts to authors are a separate admin process.

## Out of scope

- No changes to `BuyNowButton` — it already correctly routes to platform `create-checkout-session`
- No changes to platform_fee (8%) or merchant-of-record copy
- No changes to admin payout UI — manual vs automated payout remains an admin choice per the existing Automated Payouts Stripe-Only memory
- No DB migrations

## Verification

1. Run the updated Vitest fixtures — all 28 nodes should pass with content+price, regardless of any Stripe context
2. Confirm a YR-22 node with title + price_usd=500 + curriculum but no `stripe_account_id` on the author shows as **Live** in the X/28 count
3. Confirm `<BuyNowButton>` still routes purchases to platform Stripe (unchanged behavior)

## Files touched
- `supabase/functions/_shared/node-readiness.ts`
- `src/lib/node-readiness.ts`
- `src/hooks/useBookNodeProgress.ts`
- `src/hooks/useNodeLiveStats.ts`
- `supabase/functions/author-stats/index.ts`
- `src/lib/__tests__/node-readiness.test.ts`
- `mem://architecture/commerce-engine-v1`
- `mem://index.md`
