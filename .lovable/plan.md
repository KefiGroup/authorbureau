## Why ghost authors keep coming back

A "ghost author" = an `author_profiles` row whose `user_id` doesn't exist in `auth.users`. There are 2 right now:

- **Veronica Tan** (`veronicagogetter320@gmail.com`) — has 1 book; just needs to claim/repair to her real auth account
- **fasahath** — 0 books, no email; clearly junk

They keep resurfacing because three things are working against you:

1. **The trigger only warns; it never blocks.** `warn_ghost_author_uid` writes a row into `auth_uid_warnings` and returns success — bad data gets in anyway. The daily-audit re-reads that table every 24h, so the warning re-surfaces forever until the underlying profile is fixed.
2. **`save-book` deliberately invents fake user IDs.** When a book is submitted for an email with no matching auth account, the function does `userId = crypto.randomUUID()` and upserts a new `author_profiles` row with that random ID. That ID will never exist in `auth.users` → instant ghost. This is the primary source of new ghosts.
3. **There's no "claim" path for the author.** The admin invite function exists (`admin-invite-ghost-author`) but nothing surfaces it in the UI, so ghosts pile up instead of being repaired.

## The fix (three layers, smallest blast radius first)

### 1. Stop creating new ghosts in `save-book`
In `supabase/functions/save-book/index.ts` (lines ~114–141), replace the "Fallback 3: Generated new local author_id" branch:
- Do **not** mint `crypto.randomUUID()` for `user_id`.
- Insert the `author_profiles` row with `user_id = NULL` and a new `claim_email` column instead.
- Books still attach via `books.author_id = author_profiles.id` (unchanged), so nothing downstream breaks.

### 2. Schema: make unclaimed profiles a first-class state
One migration:
- `ALTER TABLE author_profiles ADD COLUMN claim_email citext` (nullable).
- Partial unique index on `lower(claim_email)` where `user_id IS NULL` so duplicate unclaimed profiles can't pile up for the same email.
- Update `warn_ghost_author_uid()` so it skips rows where `user_id IS NULL` (those are legitimately unclaimed, not ghosts).
- Extend `handle_claim_author_profile()` so that on signup it ALSO attaches any unclaimed `author_profiles` row whose `claim_email` matches the new user's email (not just the explicit `claim_author_profile_id` path).

### 3. Repair the 2 ghosts that already exist (manual, per your choice)
Add a small admin UI section under the Daily Audit tab → "Ghost Authors" that lists each ghost with two buttons:
- **Invite / Send claim link** → calls existing `admin-invite-ghost-author` (Veronica's case).
- **Mark as junk → archive** → only enabled when book_count = 0; soft-deletes the profile (fasahath's case).

No auto-cleanup runs — per your answer, you keep them visible until you click.

### 4. Keep the daily audit honest
Update the `ghost_uids` check in `supabase/functions/daily-audit/index.ts` to use the same definition the trigger now uses (`user_id IS NOT NULL AND auth.users row missing`). Result: once Veronica claims her account and you archive fasahath, the warning goes to zero and **stays** zero, because the only path that used to manufacture ghosts (`save-book` random UUID) is gone.

## Technical summary

Files touched:
- `supabase/functions/save-book/index.ts` — remove `crypto.randomUUID()` fallback; insert with `user_id: null, claim_email: body.email`
- New migration:
  - `ALTER TABLE author_profiles ADD COLUMN claim_email citext`
  - `CREATE UNIQUE INDEX … ON author_profiles (lower(claim_email)) WHERE user_id IS NULL`
  - replace `warn_ghost_author_uid()` body to early-return on `NEW.user_id IS NULL`
  - replace `handle_claim_author_profile()` to also match by `claim_email = NEW.email` when no `claim_author_profile_id` is provided
- `supabase/functions/daily-audit/index.ts` — switch ghost check to `user_id IS NOT NULL AND missing in auth.users` (mirrors trigger)
- New admin UI section: `src/components/admin/GhostAuthorsCard.tsx` (loaded inside `DailyAuditTab.tsx`)
- New edge function: `admin-archive-ghost-author` (admin-gated soft-delete for ghosts with 0 books)

No changes to: 28-node registry, payout flow, commerce engine, RLS on books, or `resolveAuthorId` semantics.

## What you'll see after this ships

- Daily audit "Ghost author UIDs (24h)" drops to 0 within one day of you clicking Invite for Veronica and Archive for fasahath.
- New book submissions for unknown emails no longer create ghost rows — they create *unclaimed* profiles that auto-attach when the person eventually signs up.
- The amber warning stops coming back tomorrow.