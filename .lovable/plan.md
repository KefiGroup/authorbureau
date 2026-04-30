# Audit #3b — Payout Fee Wording + Automation Mismatch (final, locked copy)

## What you asked

1. Use this exact copy in the Payout Agreement (and align all other places that mention the 8%):

   > Authors Bureau retains an 8% platform fee to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. You keep 92% of every sale.

2. Make sure the automation actually does what we say (no hidden Stripe / Wise / PayPal deduction from the author's 92%).

## Audit finding

The automation **does NOT match the policy**. Right now `process-purchase` and `verify-purchase` both deduct the 8% platform fee AND a separate Stripe processing fee from the author:

```text
gross         = $100.00
platform_fee  = 8% of gross           = $8.00   ← kept by Authors Bureau
stripe_fee    = 2.9% + $0.30          = $3.20   ← ALSO deducted from author
net_for_author = gross − stripe_fee − platform_fee = $88.80
```

So today the author nets **$88.80** on a $100 sale, not 92%. That contradicts the wording above and the Core memory rule. There is also no logic anywhere absorbing Wise/PayPal payout fees out of the platform's 8% — they would silently eat into the author's share when those payout methods run.

## The fix — 3 parts

### 1. Reword (UI + all surfaces)

Replace the fee bullet in `PayoutsSettings.tsx` with the exact line you supplied. Trim the framing banner on `PayoutSettingsPage.tsx` to match:

> Readers pay Authors Bureau at checkout. Authors Bureau retains an 8% platform fee to cover all payment-processing costs — so no extra processing fees are ever deducted from your share. You keep 92% of every sale, paid out monthly.

Also remove "lowest FX fees" / "higher FX fees" wording from the Wise / PayPal radio cards (it implies the author pays them — they don't). Replace with neutral wording about speed and country coverage.

### 2. Fix the automation (math)

In `supabase/functions/process-purchase/index.ts` and `supabase/functions/verify-purchase/index.ts`:

- **Stop deducting any gateway fee from the author's net.** Authors Bureau absorbs Stripe / Wise / PayPal fees out of the 8%.
- Author's net becomes: `net_for_author = gross − platform_fee` (i.e. exactly 92%).
- Keep recording `stripe_fee_usd` for **internal accounting only** so we know our own margin — it must NOT reduce `net_usd`.

```ts
const platformFee  = +(amount * feeRate).toFixed(2);          // 8%
const stripeFee    = +((amount * 0.029) + 0.30).toFixed(2);   // recorded only
const netForAuthor = +(amount - platformFee).toFixed(2);      // 92% — no gateway deduction
```

### 3. Verify monthly payout engine (Stripe / Wise / PayPal)

`run-monthly-payouts` already sums `net_usd` from `author_earnings`, so once (2) is fixed the engine will transfer exactly 92% regardless of payout method. I'll add a one-line comment in that function so future edits don't accidentally subtract Wise/PayPal fees from the payout amount.

## Other places that need the same wording

- `src/pages/TermsOfService.tsx` — fee section
- `src/pages/MicrositePage.tsx` — any fee mention
- `supabase/functions/business-consultant/index.ts` — ABBY prompt currently says "covers Stripe and other payment-gateway processing"; align to the locked copy
- `supabase/functions/generate-annual-statements/index.ts` — annual statement wording
- `ba11-publish-audiobook` + `distribute-audiobook` already say "92% you / 8% platform fee" — no change needed

## Memory update

Update Core memory rule (`commerce-engine-v1`) to:

> "Platform fee 8% covers ALL payment-processing fees (Stripe / Wise / PayPal). Author always keeps exactly 92% of gross. Gateway fees are NEVER deducted from the author's share."

## Files to change

- `src/components/dashboard/PayoutsSettings.tsx` (locked copy in agreement bullet + checkbox label + radio descriptions)
- `src/components/dashboard/PayoutSettingsPage.tsx` (header + framing banner)
- `src/pages/TermsOfService.tsx`
- `src/pages/MicrositePage.tsx`
- `supabase/functions/process-purchase/index.ts` (math)
- `supabase/functions/verify-purchase/index.ts` (math)
- `supabase/functions/run-monthly-payouts/index.ts` (clarifying comment only)
- `supabase/functions/business-consultant/index.ts` (ABBY prompt copy)
- `supabase/functions/generate-annual-statements/index.ts`
- `mem://architecture/commerce-engine-v1` + `mem://index.md`

## What I will NOT touch

- `stripe-connect` (Express onboarding — unrelated)
- Database schema (existing `stripe_fee_usd` column stays for internal margin tracking)
- Stripe Connect transfer logic in `run-monthly-payouts` (math is already correct once step 2 is fixed)

Approve and I'll implement all of the above in one pass.
