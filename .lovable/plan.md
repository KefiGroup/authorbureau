# Fix: My Library shows "Unauthorized"

## Root cause

Pauline is signed in via the **shared backend (PublishNow)**, so her browser holds a JWT signed by the shared Supabase project. The `get-author-library` edge function only validates against the **local Cloud project's** auth, so the token is rejected.

Edge function logs confirm:
```
get-author-library auth failed: invalid JWT: unable to parse or verify signature,
unrecognized JWT kid 10e65b79-... for algorithm ES256
```
→ returned `401 Unauthorized` → frontend shows the red "Unauthorized / Try again" panel.

Other functions (e.g. `dashboard-state`, `marketing-hub-state`, `author-stats`) already implement the dual-token pattern: try shared backend first, fall back to local Cloud auth, then use the local service-role client to read data.

## Fix

Update **`supabase/functions/get-author-library/index.ts`** to use the same dual-token verification pattern as `dashboard-state`:

1. Read the bearer token from the `Authorization` header (no early "Unauthorized" rejection just for kid mismatch).
2. Validate against the shared backend (`https://wuftdpnekscrsghqtssd.supabase.co`) first using its anon key.
3. If that fails, fall back to local Cloud `auth.getUser()`.
4. If neither resolves a user, return `401 { error: "Invalid session" }`.
5. Once `userId` is resolved, continue with the existing service-role lookup of `author_profiles`, `author_nodes`, and `marketing_assets` — unchanged.
6. Also support cross-platform ID drift the same way `dashboard-state` does: if the profile lookup by `user_id` misses, look up author profile by the user's email (via service role on `author_profiles.owner_email`/sibling profiles) so authors created under a different auth ID still resolve. (Mirror the small pen-name/email sibling block from `dashboard-state` lines 73–95 area.)

No frontend changes needed — `AuthorLibrary.tsx` already calls through `invokeWithTimeout` which sends `getActiveToken()`.

## Files touched

- `supabase/functions/get-author-library/index.ts` — replace the auth block with the shared-first / local-fallback pattern; keep the rest of the handler intact.

## Verification

1. Reload `/dashboard?section=library` as Pauline → list of nodes/assets renders (no red Unauthorized).
2. Edge function logs no longer contain `unrecognized JWT kid`.
3. A locally-signed-in test user (no shared session) still loads their library — fallback path works.
4. An unauthenticated request still returns `401 Invalid session`.
