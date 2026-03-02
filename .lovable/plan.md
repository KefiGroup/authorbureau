

## Root Cause

The `redirectToPublishNow` function makes a **raw `fetch()` call directly from the browser** to `wuftdpnekscrsghqtssd.supabase.co/functions/v1/sso-handoff`. This is a cross-origin request from the Authors Bureau preview/production domain to the PublishNow shared backend. The "Failed to fetch" means the browser is blocking it — either the shared backend's `sso-handoff` function doesn't allow this origin in its CORS headers, or the function isn't deployed.

The retry logic added previously is a band-aid — retrying a CORS-blocked request will always fail.

Every other shared backend call in this project (e.g. `check-subscription`, `create-checkout`, `user-auth`) works because they're invoked via `supabase.functions.invoke()` which routes through the Supabase JS client's built-in request pipeline, or because those specific functions have permissive CORS. The SSO handoff uses raw `fetch()` and hits CORS.

## Bulletproof Fix

**Create a local proxy edge function** on this project's backend. The browser calls the local function (same-origin, CORS is `*` and always works). The local function then calls the shared backend's `sso-handoff` **server-to-server** — no CORS restrictions apply to server-side requests.

```text
Browser ──(same-origin)──> Authors Bureau sso-proxy ──(server-to-server)──> Shared Backend sso-handoff
                           (no CORS issue)                                  (no CORS issue)
```

### File 1: Create `supabase/functions/sso-proxy/index.ts`
- Receives the SSO request from the browser with the user's auth token
- Validates the user via the shared backend's service role key
- Calls the shared backend's `sso-handoff` function server-to-server using `SHARED_BACKEND_SERVICE_ROLE_KEY` (already configured as a secret)
- Returns the SSO token to the browser

### File 2: Update `src/lib/publishnow-redirect.ts`
- Stop calling the shared backend directly from the browser
- Call the local `sso-proxy` edge function instead, using the local project URL (`import.meta.env.VITE_SUPABASE_URL`)
- Keep the retry logic (for genuine network blips) and fallback URL (for total outages)
- Use proper auth headers from the shared backend session

### No coordination with PublishNow needed
This fix is entirely self-contained. The server-to-server call bypasses CORS entirely, so it doesn't matter what origins the shared backend allows.

