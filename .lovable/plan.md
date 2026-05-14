# Investigate and fix missing book "Be SUCKcessful" on Pauline's dashboard

## What the DB actually shows

I queried the database directly and **"Be SUCKcessful" still exists**:

- `books.id` = `e5b857ac-48ce-4ffc-a761-3c09e95a318e`
- `books.author_id` = `92326a2f-…` (this is `author_profiles.id` — Pauline)
- `books.owner_email` = `support@paulineteo.com`
- `books.published_at` is set (approved)

Pauline's `auth.users.id` = `ef23c521-…`. `list-my-books` resolves both her `userId` and `userEmail` correctly (confirmed in edge function logs from 22:14–22:17 UTC). The query `author_id = userId OR owner_email = userEmail` matches Be SUCKcessful via `owner_email`. So the book should be returned to the UI.

This means the book is **not actually deleted** — only "Invest Like Buffett for Parents" was deleted in admin. The dashboard is failing to display it for a different reason.

## Most likely root cause

`useMyBooks` keeps a **module-level cache** (`cached`, TTL 60s) and is intentionally defensive: on any non-OK response or thrown error it **preserves the cached list and silently returns** (`useMyBooks.ts` lines 49–66). Combined with the `ABBYFrameworkDashboard` flow:

1. Admin deletes "Invest Like Buffett for Parents" → cache still holds both books.
2. Pauline opens her dashboard → `list-my-books` is called, and if the response is even momentarily slow, transiently empty, or fails one tab while another tab succeeded with stale data, the UI ends up using `bookCount = booksData.books.length` from a partial response and never falls back to the actual DB state.
3. Result: dashboard shows zero/wrong books even though the DB has Be SUCKcessful.

This is consistent with the screenshot where the "Analyze Your Book with Abby" CTA appears (the empty-state CTA) instead of the multi/single-book picker.

## Plan

### 1. Confirm the failure mode (no code changes)

- Have Pauline hard-refresh `/` while DevTools Network is open and capture the `list-my-books` response body.
- If `books: []` is returned, the bug is in the edge function (PostgREST `.or()` parsing or filter shape).
- If `books: [{ id: e5b857ac… }]` is returned, the bug is purely client-side state (cache / `bookCount` computation in `ABBYFrameworkDashboard`).

### 2. Fix client-side cache poisoning

In `src/hooks/useMyBooks.ts`:

- When the user id changes, clear the module cache (currently it persists across users — a known footgun).
- Drop the "preserve cached list on error" branch when the cache is **older than 5s after a forced refetch**, so a stale post-delete cache can never linger.
- Always update `cached` on a successful response, even when length is 0, but never overwrite a non-empty cache with `null`/`undefined` from a thrown fetch.

### 3. Force a refetch after admin delete

In `supabase/functions/admin-books/index.ts` `delete` action and in `MyBooks.tsx` `handleDeleteBook`:

- After a successful delete, call `useMyBooks().refetch(true)` (force=true) and also bust the cache for the affected user so the next dashboard mount fetches fresh.
- The admin path can't reach into the author's React state, but we can invalidate by writing a `cache_bust` timestamp to `localStorage` keyed on `user.id`; `useMyBooks` reads it on mount and forces a refetch when newer than `cachedAt`.

### 4. Make the dashboard self-heal

In `src/components/dashboard/ABBYFrameworkDashboard.tsx` (lines 142–149):

- Today: `setBookCount(booksLen > 0 ? booksLen : (state?.bookCount || myBooks.length || 0))`.
- Add: if `booksData` came back null **and** `myBooks.length > 0`, use `myBooks` as the source of truth instead of zeroing covers/`bookApproved`.
- Re-trigger `loadDashboard()` once if `booksLen === 0` but `state?.bookCount > 0` (mismatch detector).

### 5. Verify

- Reload Pauline's dashboard — Be SUCKcessful must appear with its cover and `bookApproved = true`.
- Run `node scripts/daily-audit.mjs` (or the existing `check-readiness.ts`) for `pauline-teo` to confirm node counts didn't regress.
- Delete a different test book in admin while signed in as the affected author in another tab → confirm the remaining book stays visible after the next dashboard load.

## Out of scope

- Re-creating "Invest Like Buffett for Parents" (the user deleted it intentionally to test).
- Changes to `generate-bp00-analysis` (already fixed in the previous turn).
- Any change to admin-books delete semantics beyond cache invalidation.
