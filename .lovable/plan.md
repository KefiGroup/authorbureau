# Fix no-op ternary in `get-active-token.ts`

## Problem
Line ~129 of `src/lib/get-active-token.ts` has a ternary that returns the same value in both branches:

```ts
return refreshed && !isTokenExpired(refreshed) ? refreshed : refreshed;
```

The expiry check is computed but discarded — if the token is expired we still return it, which defeats the purpose of the surrounding logic.

## Fix
Replace with a proper guard that returns `null` when the fallback token is missing or expired, so callers (e.g. `marketing-hub-state.ts`) trigger the force-refresh retry path instead of sending a dead token to the server.

```ts
return refreshed && !isTokenExpired(refreshed) ? refreshed : null;
```

## Scope
- Single one-line change in `src/lib/get-active-token.ts`.
- No other files touched.
- No behaviour change for the happy path; only tightens the final fallback so we never return a known-expired token.

## Verification
- TypeScript compiles (no signature change — still `Promise<string | null>`).
- Marketing Hub retry logic in `marketing-hub-state.ts` already handles `null` token by surfacing "session expired" to the user.
