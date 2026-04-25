## What's actually happening

Stripe confirms `pl@paulineteo.com` has a real, **active Yield subscription** (`sub_1TKrlPCk4r0emyO8EEMKpuW3`, price `price_1TGHUFCk4r0emyO87YrgqXJH` → product `prod_UB6BVLnks6JWoJ`). So the data source is correct — the bug is purely in how the frontend reads and caches it.

The browser console at the moment of the bug shows:

```
warning: @supabase/gotrue-js: Lock "lock:authorsbureau-shared-auth"
acquisition timed out after 10000ms.
```

That's the smoking gun. Here is the chain that flips her badge to "Free":

1. `useAuth.checkSubscription` runs every 60 s and on every navigation.
2. It calls `getActiveToken()` → `sharedSupabase.auth.getSession()`.
3. When the gotrue Web Lock is contended (multiple tabs / fast nav / portal popup), `getSession()` hangs and times out after 10 s with no token returned.
4. `getActiveToken()` returns `null` → `checkSubscription` throws → the catch block writes:
   ```
   { subscribed: false, productId: null, checked: true }
   ```
   This **wipes** the previously-known "yield" state and the header re-renders as **Free**.
5. On the next interval (or when she opens the Manage Plan / billing portal popup, which steals the lock again) the same thing happens, so she sees the badge bouncing between Yield and Free.

The same catch path also fires whenever `check-subscription` returns a transient HTTP error, even though Stripe still has the subscription.

So nothing about the tier is hardcoded — but the recovery path is too aggressive. It treats *any* transient failure as "user downgraded to Free", instead of keeping the last-known good tier.

## Fix

### 1. `src/hooks/useAuth.tsx` — never overwrite a known tier on transient failure
- In the `catch` of `checkSubscription`, **do not reset** `productId` to `null`. Keep the previously-known `productId` and just mark `loading: false`. This means a single failed poll can never demote the user from Yield to Free.
- Add a `localStorage` cache of `{ productId, subscriptionEnd, checkedAt }` keyed by `user.id`. On mount, hydrate the initial subscription state from this cache (5-minute TTL) so the header shows the correct tier instantly instead of "Free" while the first network call is in flight.
- After a *successful* `check-subscription` response, write the cache.
- Keep the 60 s poll, but **only update state when the response is successful** — failures become silent.

### 2. `src/lib/get-active-token.ts` — survive gotrue lock timeouts
- Wrap `sharedSupabase.auth.getSession()` in a `Promise.race` with a 2-second timeout. If it times out, fall back to reading the cached session JSON directly from `localStorage` (`authorsbureau-shared-auth`) and decoding the `access_token` from it. This avoids waiting 10 s for the lock and lets `check-subscription` fire with the real token.

### 3. `supabase/functions/check-subscription/index.ts` — distinguish "no Stripe customer" from "no active sub"
- Today, when Stripe returns no active subscription, the function responds with `{ subscribed: false, product_id: null }`, which the client interprets as Free. Add a defensive secondary lookup: if no `active` sub is found, also check for `trialing` and `past_due` so a brief webhook lag or failed renewal doesn't downgrade her.
- Also include `tier` in the JSON response so the client doesn't have to re-derive it from the product ID — useful for logs/debugging only; the client still uses the product ID as the source of truth.

### 4. Customer Portal popup hand-off — don't steal the auth lock
- `src/pages/AccountSettings.tsx` `handleManageBilling` invokes the edge function while a popup window is being opened. While the new tab is loading, the parent's gotrue lock is briefly contended, which is what causes the badge to flip mid-click. Switch to opening the popup **after** the function returns successfully (we already have the URL), and use `window.open(url, "_blank")` only once. This keeps the parent stable.

### 5. Sanity audit — confirm no hardcoded downgrade paths
Searched the codebase — the only place that ever forces tier to "free" is the failure branch in `checkSubscription`. Superadmin override is the only hardcoded *upgrade* (and her email is not in that list, which is correct — she is on a real paid Yield plan, not a comp). No component writes `subscription_tier = 'free'` to the DB on the client.

## Files to edit

- `src/hooks/useAuth.tsx` — preserve last-known tier on failure, add local cache + hydration
- `src/lib/get-active-token.ts` — add 2 s race + cached-session fallback
- `supabase/functions/check-subscription/index.ts` — include `trialing`/`past_due` in the active-sub check, return `tier` field
- `src/pages/AccountSettings.tsx` — open billing-portal popup after invoke resolves, not before

## What this does NOT change

- No DB schema changes.
- No Stripe configuration changes (her subscription is healthy on Stripe's side).
- No pricing, plan labels, or routing changes.
- The 60 s background refresh still runs; it just stops being able to demote a user on a transient blip.

## How to verify after deploy

1. Sign in as `pl@paulineteo.com`. Header should show **Yield** within < 500 ms (from cache) and stay there.
2. Open Account Settings → Billing → Open Billing Portal. The popup should open in a new tab and the header should remain **Yield** in the original tab — no flicker to Free.
3. Throttle the network in DevTools to "Slow 3G" and reload `/dashboard` — header should still show **Yield** immediately from cache, then re-confirm silently in the background.
4. Open two tabs of the dashboard at once. The gotrue lock will be contended; the badge in both tabs must remain **Yield** (previously this is when it would flip).