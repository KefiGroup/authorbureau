# Stripe-only payouts: remove dormant PayPal/Wise code

You confirmed Stripe is the only payout rail you'll ever support (US, SG, AU, NZ all fully covered). Cleaning out the dormant PayPal code so the codebase matches reality and future-me never re-suggests other rails.

## Changes

### 1. `supabase/functions/run-monthly-payouts/index.ts`
- Delete the `PAYPAL_CLIENT_ID/SECRET/MODE/BASE` constants and the `getPayPalAccessToken()` + `createPayPalBatch()` helpers (lines 16, 29–79).
- Delete the `PAYPAL_FEE_PCT` constant.
- Drop the `paypal` branch in the per-author loop: remove `paypal_email_v2` from the settings select, remove the `method === "paypal"` skip, the `payoutFee` conditional, the `paypalQueue.push(...)`, and the entire "Send PayPal batch" block.
- Simplify the run summary: remove `paypalTotal`, `paypalAuthors`, `paypalFailures`, `skippedPayPalNotConfigured`, the `paypal: {...}` field, and the `paypal_pending_setup` field.
- Update the failure-email and reminder-email copy to mention Stripe only (drop the "or PayPal" branches).
- Keep `STRIPE_TRANSFER_FEE_USD = 0` for internal reporting.

### 2. `supabase/functions/paypal-payouts-webhook/index.ts`
- **Delete the entire file.** Will also call `supabase--delete_edge_functions` to remove the deployed function.

### 3. `src/hooks/usePayoutReadiness.ts`
- Change `PayoutMethod` from `"paypal" | "stripe"` to just `"stripe"`.
- Remove the `paypal_email_v2` select and the `method === "paypal"` branch.
- Update the JSDoc comment.

### 4. `src/components/dashboard/PayoutsSettings.tsx`
- Drop the trailing "More payout options (PayPal) coming soon." sentence (line 145).
- The `paypal_email_v2: null` in the upsert payload stays — it explicitly clears any legacy value.

### 5. `src/components/dashboard/PayoutSettingsPage.tsx`
- Remove the stale "Wise/PayPal" comments in the JSDoc and inline comment (lines 7, 11, 32).
- Drop "More payout options coming soon." from the framing banner.

### 6. `src/components/admin/AdminPayoutsDashboard.tsx`
- Remove `paypal_ready` from the `PayoutsStatus` interface.
- Update the automation status banner to show only "Stripe Connect: configured / missing STRIPE_SECRET_KEY".

### 7. `supabase/functions/admin-data/index.ts`
- Drop `paypalReady` from the `payouts-status` action and remove `paypal_ready` from the response.

### 8. Memory updates
- Update `mem://features/automated-payouts-stripe-only` to reflect Stripe-only (no longer "dormant PayPal code").
- Update the Core "Commerce Engine" rule to drop "Wise, AND PayPal" from the fee-coverage list (now: "covers ALL payment-processing fees — Stripe").
- Add a Core rule: "**Payout rail**: Stripe Express only. Do NOT propose PayPal, Wise, or any other rail. Target markets (US, SG, AU, NZ) all fully supported by Stripe."

## Deploy
- Redeploy `run-monthly-payouts`, `admin-data`.
- Delete `paypal-payouts-webhook` from the project.

## Out of scope
- DB columns (`paypal_email_v2`, etc.) stay in `author_payout_settings` — harmless, dropping them would require a destructive migration. They're never written to by the new code.
- Incidental "PayPal" mentions in unrelated functions (e.g. `business-consultant`, `generate-author-bio`) — those are AI prompt examples, not payout logic.
