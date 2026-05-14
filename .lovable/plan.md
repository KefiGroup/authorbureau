# Fix: Ghost-author false positives for shared-backend users

## Problem

`admin_list_ghost_authors()` flags an author profile as "ghost" whenever its `user_id` is missing from the **Cloud** `auth.users` table. But authors who signed up via PublishNow.io live in the **shared backend** — their `user_id` is the shared id, never present in Cloud's `auth.users`. So every shared-backend author currently appears as a ghost (e.g. Veronica Tan, who has a real PublishNow login + 1 book).

This mirrors the same root cause we already patched in `admin-books`, `admin-data`, and `daily-audit`: identity must be reconciled by **email**, not by raw `user_id` matching.

## Fix

Replace the SQL-only check with an edge function that uses the canonical reconciliation pattern (same approach as `_shared/resolve-user.ts`).

### 1. New edge function: `admin-list-ghost-authors`

- `verify_jwt = false`; admin-gated via `resolveUser` + `user_roles` lookup (same pattern as `admin-books`).
- Pulls every `author_profiles` row whose `user_id` is **not** in Cloud `auth.users`.
- For each candidate, looks up the best `owner_email` from their books (existing logic).
- Calls the **shared-backend admin API** (or queries the shared `auth.users` view if exposed) to check whether that email has a real shared account.
- Returns only profiles where **neither** Cloud nor shared backend has a matching account → these are the true ghosts.
- Response shape unchanged so `GhostAuthorsCard.tsx` keeps working: `{ author_profile_id, pen_name, author_slug, ghost_user_id, best_email, book_count, created_at }`.

### 2. Client change

`src/components/admin/GhostAuthorsCard.tsx`:
- Replace `supabase.rpc("admin_list_ghost_authors")` with `supabase.functions.invoke("admin-list-ghost-authors")`.
- Use `getActiveToken()` + `fetchWithTimeout()` per shared-backend token standard.

### 3. Keep the SQL RPC as a deprecated fallback

Leave `admin_list_ghost_authors()` in the DB for now (other tooling may reference it) but add a comment noting it's superseded. No migration needed beyond the new function.

## Verification

1. Reload `/admin?tab=authors` — Veronica Tan should **disappear** from the Ghost card (she has a real PublishNow account at `veronicagogetter320@gmail.com`).
2. Spot-check 1-2 other previously-listed "ghosts" — confirm they really are unclaimed (no PublishNow account at that email).
3. Confirm the count badge updates and `Send claim invite` still works for genuine ghosts.

## Out of scope

- No schema changes.
- No change to `admin-invite-ghost-author` (the invite flow itself is correct — it just needs accurate input).
- Backfill Stripe → CRM unchanged.
