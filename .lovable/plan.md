## What's actually happening

The Stripe audits are unrelated. This error is a stale-session issue in the Marketing Hub.

When you opened **Marketing Hub → Sequences**, the browser called the `marketing-hub-state` edge function with a cached access token from `localStorage["authorsbureau-shared-auth"]`. That token had **expired** (Pauline's session has been open for a while). The edge function tried to verify it against the shared backend and the cloud backend — both returned "no user" — so it responded with `Invalid session. Please sign in again.`

Why the cached token went stale:
- `getActiveToken()` in `src/lib/get-active-token.ts` takes a **fast path**: if any token is in `localStorage`, it returns it immediately **without checking expiry**.
- The shared-backend client refreshes tokens in the background, but if the page sat idle past the access-token TTL (1 hour) before the next render, the cached value in storage is still the old expired one until the next refresh tick fires.
- Result: the first call after waking the tab uses a dead token, the edge function rejects it, the toast appears.

This is a real bug, not a Stripe/audit issue. It will keep happening intermittently to any author who leaves a tab open.

## The fix (3 small changes)

### 1. `src/lib/get-active-token.ts` — validate cached token expiry

Decode the JWT `exp` field on the cached token. If it's expired (or expires in <30s), skip the fast path and fall through to `supabase.auth.getSession()` so the client refreshes it. Pure client-side, no network call needed for the expiry check.

### 2. `src/lib/get-active-token.ts` — add `forceRefresh` option

Add an optional `{ forceRefresh: true }` parameter that calls `sharedSupabase.auth.refreshSession()` and returns the new access token. Used by the retry path below.

### 3. `src/lib/marketing-hub-state.ts` — retry once on "Invalid session"

In `callMarketingHubState`, if the response error is `"Invalid session. Please sign in again."`, call `getActiveToken({ forceRefresh: true })` once and retry the request. Only show the toast if the retry also fails.

Apply the same retry wrapper to any other shared helpers that hit the same edge function pattern (the helper is only used by Marketing Hub today, so scope is contained).

### Why not also change the edge function?

The edge function is already correct — it tries shared backend first, then cloud, then rejects. The problem is purely client-side: we send a known-expired token. Fixing the client also fixes every other call site (Buffer, sequences, social calendar, etc.) that goes through `getActiveToken`.

## Files touched

- `src/lib/get-active-token.ts` — add JWT expiry check + `forceRefresh` option (~25 lines)
- `src/lib/marketing-hub-state.ts` — one-shot retry on invalid-session (~10 lines)

No database changes, no edge-function redeploy, no Stripe/audit work needed.

## What you'll see after the fix

- The "Couldn't load sequences / Invalid session" toast stops appearing on stale tabs.
- Sequences load on first render even after the tab has been idle for hours.
- If the refresh token itself is genuinely expired (rare, ~30 days idle), you'll still get a single sign-in toast — but only after a real refresh attempt fails.
