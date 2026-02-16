

# Fix SSO "signal is aborted" -- The Real Root Cause

## Problem

The error is NOT coming from the `fetch` call to `sso-handoff`. It comes from `supabase.auth.setSession()` on line 48 of SSO.tsx.

Here is what happens:

1. User navigates to `/sso?token=...`
2. `AuthProvider` mounts and calls `supabase.auth.getSession()` (useAuth.tsx line 113)
3. SSO component mounts and calls `supabase.auth.setSession()` (SSO.tsx line 48)
4. These two operations race inside the Supabase GoTrueClient's internal lock mechanism
5. One aborts the other, producing "signal is aborted without reason"

The previous fixes (AbortController, useRef guard, removing searchParams) addressed the wrong layer -- the fetch call was fine; the Supabase auth client itself was the source of the abort.

## Solution

Wrap `supabase.auth.setSession()` in retry logic that catches the "signal is aborted" error specifically. If setSession fails with an abort error, wait briefly (letting the initial getSession complete) and retry.

### File: `src/pages/SSO.tsx`

Add a helper that retries `setSession` up to 3 times with a short delay when it encounters abort-related errors:

```text
async function setSessionWithRetry(accessToken: string, refreshToken: string, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) return;
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("abort") && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 500 * attempt));
      continue;
    }
    throw error;
  }
}
```

Replace the current `setSession` call (lines 48-52) with a call to this helper.

Also expand the retry logic for the outer `run()` function: currently it only retries `TypeError` (network errors). It should also retry any error containing "abort" in the message.

## Technical Details

| Layer | Error source | Current handling | Fix |
|-------|-------------|-----------------|-----|
| fetch to sso-handoff | Network errors | Retry on TypeError -- correct | Keep as-is |
| supabase.auth.setSession | Internal GoTrueClient lock race with getSession | No retry -- throws and shows error | Add retry with delay for abort errors |

### Changes to `src/pages/SSO.tsx`:
- Add `setSessionWithRetry` helper function before the component
- Replace direct `supabase.auth.setSession()` call with `setSessionWithRetry()`
- Expand the catch block to also retry on "abort" errors (not just TypeError)

