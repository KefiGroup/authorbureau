# Fix: Paid users showing as "Free" tier

## Root cause

`pl@paulineteo.com` **does** have an active **Yield** subscription in Stripe (verified — `sub_1TKrlPCk4r0emyO8EEMKpuW3`, product `prod_UB6BVLnks6JWoJ`).

The `check-subscription` edge function exists and works correctly. The bug is in **`src/hooks/useAuth.tsx` lines 178–195**: `checkSubscription()` is a stub that hardcodes `productId: null` and never calls the edge function. Every signed-in user — regardless of what they paid for — resolves to `tier = "free"` unless their email is in the hardcoded `isSuperAdmin()` list.

```ts
// Current (broken) — never asks Stripe:
const checkSubscription = useCallback(async () => {
  if (!user) { setSubscription(signedOutSubscriptionState); return; }
  setSubscription({
    subscribed: false,
    productId: null,           // ← always null
    subscriptionEnd: null,
    loading: false,
    checked: true,
  });
}, [user]);
```

## Fix

Restore `checkSubscription()` to actually invoke the `check-subscription` edge function and map its response into state. The edge function already returns `{ subscribed, product_id, subscription_end }`, and `getTierFromProductId(productId)` already maps product IDs to `"yield" | "build" | "brand"`.

### Change in `src/hooks/useAuth.tsx`

Replace the stub with:

```ts
const checkSubscription = useCallback(async () => {
  if (!user) { setSubscription(signedOutSubscriptionState); return; }
  try {
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (error) throw error;
    setSubscription({
      subscribed: !!data?.subscribed,
      productId: data?.product_id ?? null,
      subscriptionEnd: data?.subscription_end ?? null,
      loading: false,
      checked: true,
    });
  } catch {
    // Don't block the app — fall back to free but mark as checked
    setSubscription({
      subscribed: false,
      productId: null,
      subscriptionEnd: null,
      loading: false,
      checked: true,
    });
  }
}, [user]);
```

No other changes needed — the rest of the chain (`tier`, `isPremium`, sidebar gating, CRM lock) already reads `subscription.productId` correctly.

## Expected result after fix

- `pl@paulineteo.com` header badge → **Yield Plan** (not Free)
- "My CRM" sidebar item → unlocked
- Auto-refresh every 60s already wired (line 245), so tier stays in sync after upgrades/cancellations
- Build/Brand subscribers will also resolve correctly for the first time

## Files touched

- `src/hooks/useAuth.tsx` — replace stubbed `checkSubscription` body (lines 178–195)
