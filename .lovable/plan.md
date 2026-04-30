## Problem

The dashboard shows two contradictory pages:

1. **Connect Stripe** — Tells the author they must connect a Stripe account to receive their 92% payout. Shows "Payments Active" when "connected".
2. **Payout Settings** — Offers a choice of three payout methods: Stripe, PayPal, or Wise.

This is contradictory because:
- Page 1 implies Stripe is **required** for payouts.
- Page 2 implies Stripe is **one of three optional** payout methods.
- The "Payments Active" badge on Page 1 is fake — `useStripeConnect()` is a deprecated stub that always returns `connected: true`. So the badge shows green even if the author has done nothing.
- Per the project's actual architecture (Sprint 41, Commerce Engine v1): **Authors Bureau is the Merchant of Record**. Readers pay Authors Bureau's Stripe — the author does NOT connect their own Stripe to receive customer payments. Authors only choose **where** to receive their monthly 92% payout (Stripe, PayPal, or Wise).

As an author, this is genuinely confusing — you can't tell whether Stripe is mandatory, what "Payments Active" means, or why there's a separate "Connect Stripe" page if PayPal/Wise are valid options.

## Recommended Fix

Remove the legacy "Connect Stripe" sidebar page entirely. Everything an author needs lives in **Payout Settings**, which is the source of truth.

### Changes

1. **Sidebar (`DashboardSidebar.tsx`)**
   - Remove the "Connect Stripe / Stripe Connected" sidebar entry.
   - Keep "Payout Settings" as the single entry point under Revenue & Tools.

2. **Routing (`AuthorDashboard.tsx`)**
   - Remove the `connect-stripe` case from the section switch.
   - Add a redirect: if anyone lands on `?section=connect-stripe` (old links, bookmarks), auto-route them to `?section=payout-settings`.
   - Remove the `ConnectStripePage` import.

3. **Payout Settings page (`PayoutSettingsPage.tsx`)**
   - Add a short header banner above the method picker that frames the page correctly:
     > "Readers pay Authors Bureau at checkout. We keep an 8% platform fee and pay out your 92% share monthly. Choose how you'd like to receive it below."
   - For the **Stripe option**, change the description from "Direct transfer to your connected Stripe account" to "Direct transfer via Stripe — fastest option for US/EU authors." Keep the existing non-blocking warning that onboarding is needed before payouts actually run.
   - Make the existing "Complete Stripe Connect onboarding" button visible inline under the Stripe radio, only when Stripe is selected, so the connect flow is reachable from the same screen (no separate page needed).

4. **Delete the legacy file**
   - Delete `src/components/dashboard/ConnectStripePage.tsx` so it can't be reintroduced by accident.

5. **Leave alone (already correct per memory)**
   - `StripeConnectBanner.tsx` — already a deprecated no-op stub returning `null`.
   - `StripeRequiredModal.tsx` — gated by paid-product publishing flow; separate concern.
   - Backend `author_payout_settings` and `usePayoutReadiness` — already correct after the previous fix.

## Result

One page, one mental model: **"Choose your payout method."** No contradiction, no fake "Payments Active" badge, no question about whether Stripe is required.
