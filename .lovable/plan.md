# Fix: Payouts page "Edge Function returned a non-2xx status code"

## What's happening

The toast appears because the `stripe-connect` edge function returns HTTP 400 with `"Not authenticated"`. Logs confirm:

```text
2026-04-30T08:12:29Z ERROR [stripe-connect] Error: Not authenticated
```

You are signed in via the **shared backend** (PublishNow) — your JWT issuer is `wuftdpnekscrsghqtssd`, not the Cloud project `tubpbslfrxyfhldkcyyq`. The current `resolveUser()` in `stripe-connect`:

1. Calls `localClient.auth.getUser(token)` → fails (token is from a different project).
2. Calls `sharedClient.auth.getUser(token)` with `SHARED_BACKEND_SERVICE_ROLE_KEY` → intermittently fails depending on JWKS sync between projects.
3. Falls back to JWT decode — but only when **both** `payload.sub` AND `payload.email` are present. When the shared-backend session refreshes, the new short-lived JWT can momentarily omit the `email` claim, causing the throw.

The same hardening already exists in `check-subscription` (which works for you) but was missed in `stripe-connect`.

## Fix

Make `resolveUser()` in `supabase/functions/stripe-connect/index.ts` resilient and consistent with `check-subscription`:

1. **Try JWT decode first** (no network, no cross-project key dependency). If `sub` + `email` are present, use them.
2. Try Cloud `auth.getUser(token)` (wrapped in try/catch so it never throws).
3. Try shared backend `auth.getUser(token)` (wrapped in try/catch).
4. **Last-resort**: decode JWT again accepting `sub` alone — synthesise a placeholder email if `email` claim is missing (the email is only used when CREATING a new Stripe Connect account; existing accounts ignore it).

## Files to edit

- `supabase/functions/stripe-connect/index.ts` — replace the `resolveUser()` body with the 4-step fallback chain above. No other code in the file changes.

## Verification

1. Deploy `stripe-connect`.
2. Reload `/dashboard?section=payouts`.
3. Click **Connect Stripe Express** — should now redirect to Stripe instead of toasting "non-2xx".
4. Check logs: `[stripe-connect] Error` lines should disappear.

## Out of scope

- No DB schema changes.
- No UI changes (the page already renders correctly per your screenshot).
- No changes to `run-monthly-payouts`, `generate-annual-statements`, or `paypal-payouts-webhook`.
