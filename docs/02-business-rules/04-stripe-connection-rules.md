# 04 · AB Stripe Connection Rules

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `mem://features/automated-payouts-stripe-only`
- `mem://architecture/commerce-engine-v1`
- `platform_config` table
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/_shared/node-readiness.ts`

---

## Locked rules (do not violate)

1. **Authors Bureau is Merchant of Record** on every reader transaction. Reader payments always flow into the platform Stripe account via `create-checkout-session`.
2. **Platform fee = 8 %** (`platform_config.platform_fee_percent`, default `0.08`). Covers ALL Stripe processing fees (checkout + Connect transfer).
3. **Author always receives 92 %** of gross. Gateway fees are NEVER deducted from the author's share.
4. **Stripe Express only** for author payouts. Sprint 44 permanently removed PayPal and Wise — Express covers US, SG, AU, NZ.
5. **Author Stripe connection is back-office only.** It must NEVER appear in `hasRequiredAssets()` or affect node Live status.

## Locked author-facing copy

> "Authors Bureau retains an 8% platform fee to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. You keep 92% of every sale."

This wording is the only approved phrasing — do not paraphrase.

## What the author sees

| Author Stripe state | Author dashboard | Reader's Buy Now button |
|---|---|---|
| Connected (Express) | "Payouts on" badge | Charges normally → automated transfer |
| Not connected | "Set up payouts" CTA, no blocker on publishing | Charges normally → admin processes manual payout |
| Disconnected after live | Banner "Payouts paused — reconnect to resume automated transfers" | Continues to charge |

## Webhook architecture

Two webhooks fire on every successful checkout:

- `verify-purchase` — synchronous, returns confirmation to the reader UI.
- `process-purchase` — asynchronous, writes to `purchases`, enrols, fires emails.

This dual-pattern keeps the reader-facing checkout fast even when downstream fulfilment is slow.

## What the reader sees

- Reader microsites use `<BuyNowButton>`.
- If the author has no Stripe and no platform fallback price, button shows a graceful "coming soon" modal instead of an error.
- All checkouts go to platform Stripe — reader never sees author's payment account.

## Admin manual payouts

When automated transfer is unavailable (no Stripe Express on author), admins use the Payouts dashboard to process manually. `author_payouts_v2` records both automatic and manual payouts with provenance.
