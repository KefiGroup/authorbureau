# Fully-automated monthly payouts — Stripe now, PayPal-ready, no Wise

## What this delivers

By the 1st of next month, every author with at least $50 in earnings gets paid **without any admin intervention**:

- **Stripe Connect Express** → automatic transfer on the 1st (already coded, just needs a cron schedule)
- **PayPal Payouts API** → code wired and ready, **dormant** until you create a PayPal Business account and enable Payouts. Once you add the secrets, it activates automatically — no code changes needed
- **Wise** → removed from the UI and code (you said no Wise)
- **Annual statement** → generated as PDF and emailed to each author every Jan 5th

## Step-by-step plan

### 1. Remove Wise from the platform

- `src/components/dashboard/PayoutsSettings.tsx` and `PayoutSettingsPage.tsx` — remove the Wise radio option, copy, and recipient form
- `supabase/functions/run-monthly-payouts/index.ts` — remove the entire Wise branch (CSV generation, batch insert, totals)
- `supabase/functions/run-monthly-payouts/index.ts` — keep only `stripe` and `paypal` as valid `payout_method` values
- Migration: backfill any existing `wise` rows in `author_payout_settings` to `null` (forces them to re-pick) and add a CHECK constraint `payout_method IN ('stripe','paypal')`

### 2. Wire PayPal Payouts API (dormant until secrets exist)

Replace the current PayPal CSV branch with a real API call:

```ts
// supabase/functions/run-monthly-payouts/index.ts (PayPal branch)
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET");
const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") ?? "live"; // 'sandbox' | 'live'

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
  // Graceful skip — mark payout 'pending_setup' instead of 'queued'
  // Email owner: "PayPal Payouts not configured — N authors waiting"
  // No author penalty; their earnings stay unpaid for next run
} else {
  // 1. OAuth: POST https://api-m.paypal.com/v1/oauth2/token
  // 2. POST /v1/payments/payouts with sender_batch_id = ref, items array
  //    Each item: { recipient_type: 'EMAIL', amount: { value, currency: 'USD' },
  //                 receiver: settings.paypal_email_v2, note, sender_item_id }
  // 3. Response includes batch_id → store in author_payouts_v2.external_reference
  // 4. Set status = 'paid' (PayPal Payouts is fire-and-forget; track failures via webhook in step 3)
}
```

Add a new edge function `paypal-payouts-webhook` to receive `PAYMENT.PAYOUTS-ITEM.SUCCEEDED|FAILED|UNCLAIMED` events from PayPal. Updates `author_payouts_v2.status` accordingly and emails the author on failure.

When PayPal account is ready, you'll add three secrets (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE`) and configure the webhook URL — no redeploy needed.

### 3. Schedule both jobs in `cron.job` (insert SQL — contains anon key, not a migration)

```text
payouts-monthly-1st        0 9 1 * *  → run-monthly-payouts
generate-annual-statements 0 9 5 1 *  → generate-annual-statements
```

- **Monthly payouts:** 09:00 UTC on the 1st of every month. Covers prior month's earnings (function already calculates the right window).
- **Annual statements:** 09:00 UTC on January 5th. Defaults `tax_year` to prior year, gives Dec payouts time to settle.

### 4. Make annual statements actually reach authors

`supabase/functions/generate-annual-statements/index.ts`:
- Render statement as **PDF** (not HTML) using the same server-side PDF approach used in `generate-asset-pack`. Store at `statements/<author_id>/<year>.pdf`
- After upserting, look up author email and send a navy/gold branded email via `send-transactional-email` (system email, no `authorId`) with subject *"Your {year} Authors Bureau earnings statement is ready"* — body summarises totals and links to `/earnings`
- Migration: add `author_annual_statements.emailed_at timestamptz` so re-runs don't double-send
- Add admin "Re-send statement" button in `AdminPayoutsDashboard`

### 5. Owner-visible safety net

`src/components/admin/AdminPayoutsDashboard.tsx`:
- Add **"Run payouts now"** button (admin-only, calls `run-monthly-payouts`) for emergency / off-cycle runs
- Add **"Generate {prior year} statements now"** button
- Show banner if PayPal secrets missing: *"PayPal Payouts API not configured — N authors with PayPal selected are waiting. Add `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` in Lovable Cloud secrets."*
- Add admin auth guard to both `run-monthly-payouts` and `generate-annual-statements` (currently anyone with a JWT can hit them)

### 6. Author-side UX

`src/components/dashboard/PayoutsSettings.tsx`:
- Two payout options only: **Stripe Connect Express (recommended, auto)** and **PayPal (auto, requires PayPal email)**
- For Stripe: existing onboarding link to Stripe Express
- For PayPal: just an email field (validated). Show a small note: *"Payouts arrive within 1–3 business days of the 1st of each month."*
- Keep the locked 92/8 fee copy

### 7. Memory update

Add to Core: *"Payouts run automatically on the 1st of every month at 09:00 UTC. Stripe Connect = live. PayPal Payouts API = code-ready, activates when `PAYPAL_CLIENT_ID` + `PAYPAL_SECRET` secrets are added. Wise is not supported. Annual statements run Jan 5th, emailed to authors as PDF."*

## Files to change

- `supabase/functions/run-monthly-payouts/index.ts` — remove Wise, replace PayPal CSV with PayPal Payouts API call (graceful skip when secrets missing), add admin auth guard
- `supabase/functions/generate-annual-statements/index.ts` — PDF render, email author, admin auth guard, emailed_at guard
- New: `supabase/functions/paypal-payouts-webhook/index.ts` — receives PayPal item-level status events
- `src/components/dashboard/PayoutsSettings.tsx` — remove Wise option, simplify to Stripe + PayPal
- `src/components/dashboard/PayoutSettingsPage.tsx` — same
- `src/components/admin/AdminPayoutsDashboard.tsx` — Run-now buttons, PayPal-not-configured banner, re-send statement button
- New migration: `author_annual_statements.emailed_at`, CHECK constraint on `payout_method`, backfill Wise rows to NULL
- Insert SQL (not migration) to register the two cron jobs

## What I will NOT touch

- 92/8 fee math (already correct)
- Stripe Connect transfer logic (already correct)
- Reader checkout, Commerce Engine, BuyNowButton — unrelated
- Existing `payouts` storage bucket structure
- Existing `mark-payout-paid` function (kept for emergency manual marking)

## What you'll need to do separately (outside Lovable)

1. **Apply for PayPal Business + Payouts** at paypal.com (free, 1–2 weeks for Payouts approval). Once approved, you'll have Client ID + Secret from the PayPal Developer dashboard. Add them as Lovable Cloud secrets — code activates automatically.
2. **Set the PayPal webhook URL** in PayPal Developer dashboard to `https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/paypal-payouts-webhook` and subscribe to `PAYMENT.PAYOUTS-ITEM.*` events.

## Result

| When | What happens | Admin work |
|---|---|---|
| 1st of every month, 09:00 UTC | Stripe authors paid via auto-transfer; PayPal authors paid via API (once secrets added); failures email author + owner | **Zero** |
| Jan 5th, 09:00 UTC | Annual PDF statement emailed to every author with prior-year earnings | **Zero** |
| Author selects payout method | Picks Stripe (onboards in 5 min) or PayPal (just email) | **Zero** |
| PayPal account not yet ready | Earnings accumulate; owner banner shows "N authors waiting"; Stripe payouts continue normally | **Zero** until you add secrets |

Approve and I'll implement all of the above in one pass.
