## Fix: Recognize Annual Stripe Products in Tier Resolution

### Problem
Each tier (Brand / Build / Yield) has **two Stripe products** — a monthly one and a duplicate "annual" one created for the "Save 17%" receipts. The frontend and `check-subscription` edge function only recognize the monthly product IDs, so any author subscribing via the **annual** payment links will be returned as `tier: "free"` and locked out of paid features.

| Tier | Monthly product (recognized) | Annual product (currently ignored) |
|---|---|---|
| Brand | `prod_UB6BxxNnqv6UpV` | `prod_UDQttfkI82vPTf` |
| Build | `prod_UB6BfcKCAYrgp0` | `prod_UDQtofrWi6NpKc` |
| Yield | `prod_UB6BVLnks6JWoJ` | `prod_UDQtP7TtNPX0jm` |

This affects every future annual subscriber.

### Approach
Add the annual product IDs as additional accepted IDs for each tier in both the frontend and the edge function. Keep monthly IDs as the canonical `product_id` so existing UI/checkout flows are untouched.

### Changes

**1. `src/hooks/useAuth.tsx`**
- Add `annual_product_id` field to each entry in the `TIERS` config:
  - `brand.annual_product_id = "prod_UDQttfkI82vPTf"`
  - `build.annual_product_id = "prod_UDQtofrWi6NpKc"`
  - `yield.annual_product_id = "prod_UDQtP7TtNPX0jm"`
- Update `getTierFromProductId()` to match either `product_id` or `annual_product_id` for each tier.

**2. `supabase/functions/check-subscription/index.ts`**
- Extend `TIER_MAP` to include the 3 annual product IDs mapping to the same tier strings (`brand`, `build`, `yield`).

### Optional cleanup (not required for the fix, can defer)
- Remove unused `LEGACY_TIER_MAP` (starter/pro/enterprise) if confirmed unreferenced.
- Audit `setup-stripe-product` and `create-product-checkout` edge functions to ensure they don't reintroduce drift.

### Verification after deploy
1. Confirm your existing Yield subscription still resolves correctly (monthly path unchanged).
2. Use a Stripe test mode annual checkout (or query an annual subscriber if any exist) and verify `check-subscription` returns the correct tier.
3. Check the dashboard badge and CRM access for an annual test account.

### Files to edit
- `src/hooks/useAuth.tsx`
- `supabase/functions/check-subscription/index.ts`
