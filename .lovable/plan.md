## Problem

The "Welcome / Build your business" modal fires every time `AuthorDashboard` mounts for `support@paulineteo.com`, including when navigating into My CRM. She has 2 books and 27 built nodes — clearly not a new user — but her `author_profiles.has_seen_journey_onboarding` is still `false` because she has never clicked through the modal to dismiss it.

The trigger in `src/pages/AuthorDashboard.tsx` (lines 326–339) only checks:
- `stats.bookCount > 0`
- `stats.analyzedCount === 0` (no book has had BP-00 analysis run)
- `has_seen_journey_onboarding === false`

It does **not** consider whether the author has already built nodes / made progress, so any author who skipped BP-00 but built content elsewhere keeps getting the intro modal forever.

## Fix (single file, frontend only)

**`src/pages/AuthorDashboard.tsx`** — strengthen the gate and auto-mark the flag so it never re-shows for established users.

1. In the `useEffect` that decides whether to show the modal, also bail out if the author has any meaningful progress. Use signals already available on `stats` from `useAuthorStats`:
   - `stats.products?.totalLive > 0` (any node live), OR
   - `stats.products?.totalReadyForReview > 0`, OR
   - any node count > 0 (use `stats.nodes?.total` if present; otherwise add a quick `author_nodes` head-count via `supabase.from('author_nodes').select('id', { count: 'exact', head: true }).eq('author_id', authorId).limit(1)`).

2. When we detect an established user (books > 0 AND has any node activity) AND `has_seen_journey_onboarding === false`, **silently flip the flag to `true`** via `save-author-profile` (`action: 'save'`, payload `{ has_seen_journey_onboarding: true }`) so it stops re-evaluating on every mount.

3. Keep the original "first analyzed book" path intact for genuine new users (books > 0, analyzedCount === 0, AND zero nodes).

## Verification

- Re-open `/dashboard?section=crm` as `support@paulineteo.com` → modal must not appear.
- DB: `author_profiles.has_seen_journey_onboarding` flips to `true` for her on next dashboard mount.
- A brand-new test account with 1 book and no nodes still sees the modal once.

## Files touched

- `src/pages/AuthorDashboard.tsx` (gate + silent flag write)

No backend, schema, or other component changes.
