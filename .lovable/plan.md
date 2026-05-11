## Goal
Make every subscriber who originally redeemed promo code **BP100**, **BA100**, or **YR100** never be charged again — replace their current discount with a 100%-off **forever** coupon.

## Background
The existing Stripe coupons `BP100` / `BA100` / `YR100` are 100% off but `duration: once`, so they only zeroed the first invoice. From the next renewal onward, customers were getting charged full price. We need a forever-duration equivalent and to retro-apply it.

There is already a `SUCK100` coupon (100% off, forever) we can reuse, but for clarity I'll create three properly named ones.

## Steps

1. **Create three new forever coupons in Stripe** (100% off, duration `forever`):
   - `BP100-FOREVER` — Brand Package, 100% off forever
   - `BA100-FOREVER` — Build Package, 100% off forever
   - `YR100-FOREVER` — Yield Package, 100% off forever

2. **Collect the subscriber list from the user.** You provide the customer emails grouped by which code they used (BP100 / BA100 / YR100). Include Pauline Teo and Veronica Tan under YR100 — their previously-applied $250-off-forever coupon will be replaced with 100%-off-forever.

3. **For each email**, reuse the existing `admin-apply-subscription-coupon` edge function to:
   - Look up the customer in Stripe by email
   - Find their active subscription
   - Attach the matching forever coupon (replacing any existing discount)

4. **Verify** by re-fetching each subscription and confirming `discount.coupon.id` matches the new forever coupon and `duration: forever`.

5. **Report back** a summary table: email, subscription id, coupon attached, next-invoice amount (should be $0.00).

## What I need from you to start implementation
Please paste the list of customer emails grouped by code, e.g.:
```
BP100: alice@example.com, bob@example.com
BA100: carol@example.com
YR100: pauline@..., veronica@..., dave@example.com
```

## Out of scope
- Not modifying any application code or UI
- Not touching the original BP100/BA100/YR100 coupon definitions (they remain `once` for any future redemptions you may want to convert manually)
- Not issuing refunds for any past charges (let me know separately if you want that)
