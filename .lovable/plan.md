## Bug

Clicking a saved cover design now returns "Invalid token" (401). The earlier fix sent the right (shared-backend) token, but the edge function rejects it.

## Root cause

`supabase/functions/set-active-product-cover/index.ts` validates the bearer token with `userClient.auth.getUser()` against the **Cloud** project's anon key. The user's session JWT was issued by the **shared backend** (`wuftdpnekscrsghqtssd.supabase.co`), not Cloud. Cloud's GoTrue therefore returns `Invalid token` and the function 401s before it ever runs the ownership check.

Every other edge function in the project handles this with `supabase/functions/_shared/resolve-user.ts`, which:
1. tries Cloud `auth.getUser()`
2. falls back to the shared-backend anon client
3. reconciles the shared-backend email to a Cloud `auth.users.id` via service role

This is the canonical pattern (see core memory: "Edge Function User Resolver — All edge fns MUST import `_shared/resolve-user.ts`").

## Fix (single edge function, no schema changes)

Refactor `supabase/functions/set-active-product-cover/index.ts`:

1. Import `resolveUser` from `../_shared/resolve-user.ts`.
2. Replace the manual `userClient.auth.getUser()` block with:
   ```ts
   const resolved = await resolveUser(req.headers.get("Authorization"));
   if (!resolved.id && !resolved.email) return 401 "Invalid session";
   ```
3. Update the ownership check to accept either:
   - `authorRow.user_id === resolved.id`, OR
   - the author's `owner_email` (from `books.owner_email` for the node's book) matches `resolved.email` — mirroring the pattern in `get-author-book` and other shared-resolved functions.

   Simplest path: keep the existing `author_profiles.user_id === resolved.id` check, and only fall through to email reconciliation when `resolved.id` is null.

No client changes. No migration. `generate-product-cover` already uses service role + ownership-by-author_id and isn't affected by this bug.

## Verification

1. Hard-refresh BP-08 → AI Cover Designs.
2. Click the inactive (left) design.
3. Confirm: toast says "Active design updated", gold ring + Active badge moves to clicked card, network tab shows `POST 200 /set-active-product-cover`.
4. Reload page → active design persists.
5. Edge function logs show no 401s.
