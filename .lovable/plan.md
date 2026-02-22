

## Fix: "Login succeeded but no session was returned" Error

### Root Cause
The `user-auth` verify endpoint on the shared PublishNow backend returns a successful response (HTTP 200), but the response body doesn't contain `token_hash` or session tokens (`access_token`/`refresh_token`) in the locations the code checks. The data may be nested differently than expected.

### Solution
Update `src/pages/Auth.tsx` to:

1. **Deep-search the response object** for `token_hash`, `access_token`, and `refresh_token` across multiple possible nesting levels (e.g., `data.data.token_hash`, `data.session.access_token`, etc.)
2. **Show the actual response keys in the error toast** so that if it still fails, you can see exactly what the backend returned and adjust accordingly
3. **Add a visible on-screen debug output** (temporary) that displays the verify response JSON so you can report back what the backend returns

### Technical Details

**File: `src/pages/Auth.tsx`** -- Update the `handleVerifyOtp` function:

- After parsing the JSON response, recursively search for `token_hash` in the response object at paths like:
  - `data.token_hash`
  - `data.data.token_hash`
  - `data.session.token_hash`
  - `data.result.token_hash`

- Similarly search for access/refresh tokens at:
  - `data.access_token` / `data.refresh_token`
  - `data.session.access_token` / `data.session.refresh_token`
  - `data.session_data.access_token` / `data.session_data.refresh_token`
  - `data.data.session.access_token` / `data.data.session.refresh_token`

- Update the fallback error message to include the actual response keys: `"No session in response. Keys: " + Object.keys(data).join(", ")` so you can diagnose the exact shape of the backend response without needing browser console access.

This approach will either fix the login flow immediately (if the data is there but nested differently) or give you clear diagnostic info to share.
