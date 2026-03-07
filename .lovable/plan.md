

# Fix: "Unauthorized" Error in Abby Business Advisor

## Root Cause

The `business-consultant` edge function's `resolveUser` validates the JWT against the **local Cloud** auth system (`SUPABASE_URL`), but users authenticate via the **shared backend** (`wuftdpnekscrsghqtssd.supabase.co`). The local Cloud rejects the shared backend's JWT with "unrecognized JWT kid" — confirmed by auth logs showing repeated 403s on `/user`.

The working `consultation-session` function solves this by trying the shared backend **first**, then falling back to local Cloud. The `business-consultant` function lacks this dual-resolution pattern.

## Fix

### File: `supabase/functions/business-consultant/index.ts`

Replace the `resolveUser` function (lines 518-566) to try the shared backend first:

1. Add the shared backend constants (`SHARED_BACKEND_URL`, `SHARED_ANON_KEY`) at the top of the file
2. Rewrite `resolveUser` to:
   - **Tier 1**: Try shared backend `getUser(token)` — this is where most users authenticate
   - **Tier 2**: Fall back to local Cloud `getUser(token)` — for any local-only users
   - **Tier 3**: Keep the existing email-based profile/admin lookup as final fallback

This matches the pattern already proven in `consultation-session/index.ts`.

## Downstream Impact

The `user.id` returned will be the shared backend UUID (e.g., `ffbc179a-...`). This is already the ID used in `author_profiles.user_id` and `books.author_id`, so all downstream queries (profile lookup, book fetch, asset storage) will continue to work correctly.

