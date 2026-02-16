

# Fix SSO Race Condition (Authors Bureau Only)

No changes needed on PublishNow. The SSO token generation and `sso-handoff` edge function work correctly. The issue is purely client-side in the Authors Bureau React app.

## Problem

When a user lands on `/sso?token=...`, two Supabase auth operations run concurrently:

1. `AuthProvider` calls `supabase.auth.getSession()` on mount
2. `SSO` component calls `supabase.auth.setSession()` after fetching session data

These compete for the same internal lock in the Supabase client, causing "signal is aborted without reason".

The current `setSessionWithRetry` helper mitigates this but is unreliable -- all 3 retry attempts can still overlap with a slow `getSession()`.

## Solution

Make SSO wait for AuthProvider to finish before acting. The `useAuth()` hook already exposes a `loading` flag that is `true` while `getSession()` is in-flight.

## File: `src/pages/SSO.tsx`

- Import `useAuth` from `@/hooks/useAuth`
- Read `loading` from `useAuth()`
- Guard the `useEffect`: skip while `loading` is `true`
- Once `loading` becomes `false` (meaning `getSession()` is done), proceed with the SSO flow
- Remove the `setSessionWithRetry` helper -- it is no longer needed since there is no lock contention
- Use plain `supabase.auth.setSession()` directly
- Keep the `hasRun` ref guard and `cancelled` flag
- Keep network retry logic for `TypeError` errors
- Dependency array becomes `[loading, navigate]`

## How It Works

```text
BEFORE (race):
  AuthProvider --> getSession() --[LOCK]--> ...
  SSO effect ----> setSession() --[LOCK CONFLICT]--> ABORT

AFTER (sequential):
  AuthProvider --> getSession() --[LOCK]--> done (loading=false)
  SSO effect --------- waits -----------> setSession() --[LOCK FREE]--> success
```

## Technical Notes

- `navigate` from react-router is stable across renders, so `[loading, navigate]` won't cause spurious re-runs
- The `hasRun` ref ensures the flow executes exactly once even if `loading` toggles multiple times
- No changes needed to `useAuth.tsx`, `AuthProvider`, PublishNow, or any edge functions

