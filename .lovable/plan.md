

## Fix: Use `authUrl` to Complete Authentication

### Problem
The shared backend verify endpoint returns `{success, email, authUrl, session_data}` where `session_data` is null. The actual authentication token is embedded in the `authUrl` field, not in `session_data`. The current code never looks at `authUrl`.

### Solution
Update `src/pages/Auth.tsx` to extract the token hash from `authUrl` and use it with `supabase.auth.verifyOtp()`.

The `authUrl` likely has a format like:
`https://...supabase.co/auth/v1/verify?token=...&type=email` or contains a token hash in its query parameters or fragment.

### Technical Details

**File: `src/pages/Auth.tsx`** -- Update `handleVerifyOtp`:

1. Before the deep-search fallback error, add logic to parse `authUrl`:
   - Extract `token_hash`, `token`, or `access_token`/`refresh_token` from the URL's query params or hash fragment
   - If a `token_hash` or `token` is found, call `supabase.auth.verifyOtp({ token_hash, type: "email" })`
   - If `access_token` and `refresh_token` are found in the URL fragment, call `supabase.auth.setSession()`

2. Add a console log of the raw `authUrl` value for debugging in case the URL format is unexpected

3. The parsing logic will:
   - Create a `URL` object from `authUrl`
   - Check `searchParams` for `token_hash`, `token`, `access_token`
   - Check the hash fragment (after `#`) for token parameters
   - Use whichever token is found to complete the auth flow

This should resolve the login issue since the backend is clearly providing the auth URL instead of raw session tokens.
