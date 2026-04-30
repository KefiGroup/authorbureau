# Audit #3 — Payout System for Authors

## What I found

There are **two parallel payout pages** in the app, and they don't agree with each other. That's why "Stripe onboarding" looks missing from where you're standing.

### Page A — Dashboard › Payout Settings (the page in your screenshot)
- File: `src/components/dashboard/PayoutSettingsPage.tsx`
- Route: `/dashboard?section=payout-settings`
- Lets you pick Stripe / PayPal / Wise.
- **Has no "Connect Stripe" button.** It only reads `stripe_onboarding_complete` and shows a hint. There is literally nowhere to click to start onboarding from this page.
- Does not capture the Payout Agreement (tax self-declaration), so saving here never satisfies `usePayoutReadiness` → publishing paid products stays blocked even after "saving".

### Page B — Account Settings › Payouts tab (the working one)
- File: `src/components/dashboard/PayoutsSettings.tsx`
- Route: `/account-settings?tab=payouts`
- Has the actual **"Connect Stripe Express"** button → calls the `stripe-connect` edge function (`action: "onboard"`) → Stripe-hosted onboarding → returns to `/account-settings?tab=payouts&stripe_connected=true`.
- Captures the Payout Agreement (Merchant of Record, 8% fee, monthly on the 1st, US$50 minimum, self-declared taxes).
- This is the flow `RequirePayoutSetup` and the `run-monthly-payouts` job actually expect.

### Backend (verified end-to-end, all wired correctly)
- `stripe-connect` edge function: creates payout-only Express account (`transfers` capability only), returns hosted onboarding URL, syncs `stripe_onboarding_complete` both ways. Healthy.
- `run-monthly-payouts`: runs on the 1st, only pays Stripe authors when `stripe_onboarding_complete = true`, falls back to Wise/PayPal CSV batches, emails authors, alerts owner on failures. Healthy.
- `usePayoutReadiness` hook: requires method **+** matching details **+** `tax_self_declared_at`. Page A can't satisfy the third — Page B can.
- DB confirms: Pauline Teo has **no Stripe account, no payout method saved, no agreement signed**. Her record is empty because Page A is what she's been using and Page A doesn't actually finish the job.

## The fix — collapse to one canonical page

Make the dashboard page show the **same** controls as the Account Settings page (Connect Stripe button + agreement checkbox + full Wise fields), so authors never need to leave the dashboard to get paid.

### 1. Replace `PayoutSettingsPage.tsx` with a wrapper around `PayoutsSettings`
- Dashboard › Payout Settings will render the proven `PayoutsSettings` component (kept as the single source of truth).
- Keep the dashboard page header + the framing banner ("You don't need to connect Stripe to publish or sell…") above it.
- Remove the duplicate radio/refund-window UI and the duplicate save logic in `PayoutSettingsPage.tsx`.

### 2. Make `PayoutsSettings` aware of where it's rendered
- Update `connectStripe()` return URLs in the edge function call so authors come back to the **same page they started from** — pass `origin + window.location.pathname + "?stripe_connected=true"` and detect that on mount to refresh status. Today it always returns to `/account-settings?tab=payouts`.

### 3. Keep `RequirePayoutSetup`'s deep link consistent
- Update `goToPayouts` in `RequirePayoutSetup.tsx` to `/dashboard?section=payout-settings` (the dashboard page is now the canonical entry point and matches the sidebar).

### 4. Add a Refund Window field to `PayoutsSettings` (it only existed on Page A)
- Persist `refund_window_days` alongside the rest of the payload. No data loss when we retire Page A's UI.

### 5. Pauline-specific recovery
- After deploy, walk Pauline through: open Dashboard › Payout Settings → click **Connect Stripe Express** → finish Stripe-hosted onboarding → check Payout Agreement → Save. That single flow will populate `stripe_account_id`, flip `stripe_onboarding_complete`, store the agreement, and unblock her next payout run.

## Files touched

- `src/components/dashboard/PayoutSettingsPage.tsx` — slim wrapper (header + banner + `<PayoutsSettings/>`).
- `src/components/dashboard/PayoutsSettings.tsx` — dynamic return URL on Stripe Connect onboarding; add Refund Window card; auto-refresh on `?stripe_connected=true`.
- `src/components/dashboard/RequirePayoutSetup.tsx` — point CTA to `/dashboard?section=payout-settings`.
- No DB migration needed — `author_payout_settings` already has every column we use.
- No edge-function changes needed — `stripe-connect` already does the right thing.

## Out of scope (intentionally)

- Removing the Account Settings › Payouts tab. We'll keep it as a second entry point so existing email links (`run-monthly-payouts` reminder emails point to `/account-settings?tab=payouts`) keep working. Both routes will render the same component.
- Stripe enablement / new Stripe products — Stripe is already enabled and the Connect Express flow is live.
