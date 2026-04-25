## Plan

The app is still showing Free because the subscription check is being sent through the wrong client.

`useAuth.tsx` currently imports `supabase` from `@/lib/shared-backend` and calls:

```ts
supabase.functions.invoke("check-subscription")
```

That shared client points at the external shared auth backend, while the `check-subscription` function you want lives in this project’s own backend. So the frontend is not reliably hitting the function that returns your Yield plan.

## What I’ll change

1. Update `src/hooks/useAuth.tsx` so `checkSubscription()` calls this project’s backend function URL directly, using the existing shared-session token helper.
2. Reuse the established pattern already used by `useAuthorStats`:
   - get the active shared auth token
   - call `${VITE_SUPABASE_URL}/functions/v1/check-subscription`
   - send `Authorization: Bearer <token>`
3. Keep the current loading/fallback behavior, but only fall back to Free after a real request failure.
4. Verify any tier-derived UI that depends on `useAuth` will then resolve from the returned `product_id` as intended.

## Expected result

After this fix, your signed-in account (`pl@paulineteo.com`) should resolve to `yield` on the frontend, so:
- the plan badge should stop showing Free
- Yield-gated areas like CRM should unlock
- Account Settings / pricing state should reflect the paid plan correctly

## Technical details

Files to update:
- `src/hooks/useAuth.tsx`

Implementation approach:
- replace `shared-backend` function invocation for subscription lookup
- import and use `getActiveToken` + `fetchWithTimeout` from `src/lib/get-active-token.ts`
- parse the function JSON response into:
  - `subscribed`
  - `productId`
  - `subscriptionEnd`
- preserve safe fallback if token is missing or request truly fails

If you approve, I’ll apply that frontend fix next.