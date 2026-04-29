## Goal

Standardize the platform fee to **8%** (author keeps **92%**) across DB, edge functions, dashboard UI, public copy, and AI-advisor prompts. Today the codebase is mixed: backend math already uses 8%, but legacy copy in many places still says "5% / 95%".

## Source of truth

- **DB row** `platform_config.platform_fee_percent = 0.08` — already correct, no change needed.
- **Code default fallback** for that row — already `0.08` everywhere math runs (`create-checkout-session`, `verify-purchase`, `process-purchase`, `value-ladder-engine`, `RevenueDashboard`).
- **Display copy** is what's wrong. Fix it.

## Files to edit (copy-only changes — no math changes)

### Author-facing dashboard copy
1. `src/components/dashboard/ConnectStripePage.tsx` — 2 strings: "5% platform fee … 95% share" → **"8% platform fee … 92% share"**.
2. `src/components/dashboard/RevenueDashboard.tsx` line 136 — label `"Platform Fee (5%)"` → **`"Platform Fee (8%)"`** (math at line 88 is already `* 0.08`).
3. `src/components/dashboard/builders/shared/StageEditorDrawer.tsx` line 432 — "keeps 5% and pays you 95%" → **"keeps 8% and pays you 92%"**.
4. `src/components/dashboard/framework-dashboard/SubscriptionSalesPitch.tsx` — 3 bullet lines `"+ 5% platform fee on sales"` → **`"+ 8% platform fee on sales"`**, plus the footnote about "~92%" stays correct.
5. `src/components/dashboard/framework-dashboard/SubscriptionPricing.tsx` — same 3 bullet lines, change to **8%**.
6. `src/lib/value-ladder-engine.ts` line 164 — JSDoc comment `(5%)` → **`(8%)`** (the actual math `* 0.08` is correct).

### Public / microsite / receipts
7. `src/pages/MicrositePage.tsx` line 2649 — code-comment "5% platform fee" → **"8% platform fee"** (cosmetic, but keeps reviewers from re-introducing the bug).
8. `supabase/functions/generate-annual-statements/index.ts` line 56 — annual tax statement footnote: **"…the 8% platform fee…"**.
9. `supabase/functions/ba11-publish-audiobook/index.ts` line 83 — `royalty: "95% you / 5% platform fee"` → **`"92% you / 8% platform fee"`**.
10. `supabase/functions/distribute-audiobook/index.ts` line 59 — same change.

### AI Business Advisor prompts (so Abby stops telling authors the wrong number)
11. `supabase/functions/business-consultant/index.ts` — three places mention "5% transaction fee" referring to Authors Bureau's own fee (lines ~682 and ~2609). Change to **8%**. (Line ~916's "Teachable 5% transaction fee" stays — it's a competitor comparison, not our fee.)

### Already correct — leave alone
- `src/pages/EarningsDashboard.tsx` (says 8% / 92%) ✓
- `src/components/dashboard/PayoutsSettings.tsx` (says 8% and 92%) ✓
- `src/components/dashboard/PayoutSettingsPage.tsx` (says 92%) ✓
- `src/components/admin/AdminPayoutsDashboard.tsx` (says "Platform Fees (8%)") ✓
- All edge functions doing the actual fee math (`create-checkout-session`, `verify-purchase`, `process-purchase`, `run-monthly-payouts`) — already 0.08. ✓
- `platform_config.platform_fee_percent` DB row — already `0.08`. ✓

## What stays the same

- Merchant-of-Record model: Authors Bureau collects 100%, then pays out 92%.
- Monthly payout flow via `run-monthly-payouts` + `mark-payout-paid` is unchanged.
- No DB migration. No data backfill. Existing `author_earnings` rows already have the correct `platform_fee_usd` because the math has been 8% all along.

## Verification after changes

1. `rg "5% platform|95% you|platform fee.*5%|Platform Fee \(5%\)" src supabase` should return zero hits (excluding the Teachable competitor mention).
2. Visit `/connect-stripe` and `?section=payouts` — copy reads "8% / 92%" everywhere.
3. Open Revenue Dashboard — card label reads "Platform Fee (8%)" and the dollar amount equals `gross * 0.08`.
4. Trigger a $297 test purchase — `author_earnings.platform_fee_usd` = $23.76, `net_usd` ≈ gross − Stripe fee − $23.76.

## Risk

Zero math risk — all backend calculations and the DB config are already 8%. This is a pure copy-consistency pass so authors, readers, and Abby all see the same number.
