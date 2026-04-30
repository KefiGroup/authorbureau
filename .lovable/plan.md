# Fix: Payout Settings ID mismatch (author_id semantics)

## The bug

`author_payout_settings.author_id` is meant to be `author_profiles.id` — that's how every backend function (`run-monthly-payouts`, `process-purchase`) and the readiness hook (`usePayoutReadiness`) reads it. But two things are inconsistent with that contract:

1. **`PayoutSettingsPage.tsx`** (the UI Pauline is on) reads and writes `author_id = user.id` (the auth user UID). Any save creates an orphan row that no payout job, admin dashboard, or readiness check can find.
2. **The RLS policy** is `auth.uid() = author_id`, which would *block* a correct write (`author_id = profile.id`) entirely. It only "works" today because the page accidentally writes the wrong ID and the policy accidentally permits it.

Pauline currently has **zero rows** in `author_payout_settings`, so no data is corrupted — but the moment she clicks Save, an orphan is created and her real payout settings would still be invisible to the payout engine.

## What to fix

### 1. `src/components/dashboard/PayoutSettingsPage.tsx`

- Resolve `author_profiles.id` first (look up `id, stripe_onboarding_complete` by `user_id`).
- Use that `profileId` for both the `author_payout_settings` SELECT and UPSERT.
- Show a clear empty-state if no `author_profile` exists yet (defensive — shouldn't happen for a logged-in author, but worth a friendly message instead of a silent no-op).
- While we're in there: load and persist `paypal_email_v2`, `wise_recipient`, and `tax_self_declared_at` so the page is consistent with what the readiness check actually requires (`paypal_email`/`wise_email` columns are legacy and ignored by `usePayoutReadiness`). Keep the existing form fields, just persist them into the v2 columns.

### 2. New migration to fix RLS

The current policy is wrong. Replace with one that joins through `author_profiles`:

```sql
DROP POLICY "Authors can manage their own payout settings" ON author_payout_settings;

CREATE POLICY "Authors can manage their own payout settings"
  ON author_payout_settings
  FOR ALL
  TO authenticated
  USING (
    author_id IN (SELECT id FROM author_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    author_id IN (SELECT id FROM author_profiles WHERE user_id = auth.uid())
  );
```

Admin SELECT policy stays as-is.

### 3. No data backfill needed

Confirmed via DB query: `author_payout_settings` is empty. Nothing to migrate or clean up.

## What this does NOT change

- Stripe Connect onboarding flow (Pauline still needs to click "Connect Stripe" on the Connect Stripe page if she wants Stripe payouts — that's separate and working correctly).
- The 92/8 split, refund window logic, dual webhook, or any commerce wiring.
- The `usePayoutReadiness` hook, `run-monthly-payouts`, or `process-purchase` (they're already correct).

## Verification after deploy

1. As Pauline: open Payout Settings → pick PayPal → enter `pauline@example.com` → Save → toast success.
2. DB check: `SELECT author_id, payout_method, paypal_email_v2 FROM author_payout_settings WHERE author_id = '92326a2f-3ed0-4873-a8cf-7a0b1350995a';` returns one row with the profile ID (not the user ID).
3. Reload page → form pre-fills with PayPal + email.
4. `usePayoutReadiness` now returns `payout_method: 'paypal'` for Pauline.
