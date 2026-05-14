# Remove Ghost Author Detection

## Why this needs to change

Authors Bureau and PublishNow share auth via the **shared backend** (`wuftdpnekscrsghqtssd`). Authors sign in on PublishNow → SSO handoff (`/sso?token=...`) → `establishSharedSession()` mints a session against the shared backend. The session JWT's `sub` is a **shared-backend `auth.users.id`**, and that's what gets written to `author_profiles.user_id`.

The local Lovable Cloud project's `auth.users` table is essentially empty for SSO authors — they never sign up locally.

That breaks every assumption the "ghost authors" feature was built on:

- The SQL function `admin_list_ghost_authors()` joins `author_profiles` against the **local** `auth.users` and flags everything that doesn't match. Confirmed: it returns **all 5 author profiles** (Fasa, Felicia, Bob, Pauline, Veronica) — none of them are actually ghosts.
- The edge function `admin-list-ghost-authors` tries to "rescue" them by calling `admin.listUsers()` against the shared backend with `SHARED_BACKEND_SERVICE_ROLE_KEY` and removing matches. That key is currently invalid for the shared project, so the rescue silently fails and every real author looks like a ghost.
- Even if the key were valid, this is just an awkward workaround for a non-problem — the user_ids aren't supposed to live in local `auth.users`.

In short: with shared OAuth, there is **no such thing** as a "ghost author" in the way this card defines it. Veronica was misclassified, and so are the other four.

## Plan

### 1. Remove the ghost-authors UI
- Delete `src/components/admin/GhostAuthorsCard.tsx`.
- Remove its import + render in the admin dashboard (find and clean up the parent that mounts it).

### 2. Remove the broken edge function + RPC
- Delete `supabase/functions/admin-list-ghost-authors/`.
- Migration: `DROP FUNCTION public.admin_list_ghost_authors();` and `DROP FUNCTION public.list_author_profile_orphans();` (same flawed local-join logic, also unused).

### 3. Remove the unused secret
- Confirm `SHARED_BACKEND_SERVICE_ROLE_KEY` has no other consumers (`rg "SHARED_BACKEND_SERVICE_ROLE_KEY"`).
- `_shared/resolve-user.ts` uses the **shared anon key** (hardcoded) and the **local** service role to call `admin.listUsers()` against the local project — it does NOT need the shared service role. So the secret really is orphaned.
- Delete `SHARED_BACKEND_SERVICE_ROLE_KEY` via `secrets--delete_secret`.

### 4. Trust the daily audit
The daily audit (`daily-audit-cron`) and the `warn_ghost_author_uid` trigger (which writes to `auth_uid_warnings` only when local `auth.users` is somehow expected) already cover any real reconciliation needs. No replacement card is needed.

### 5. Verify Veronica end-to-end
After cleanup, run a quick sanity check on Veronica's account:
- `author_profiles` row exists (confirmed: `dd5e638d…`, slug `veronica-tan`).
- Her `books` rows, `owner_email`, and any `author_nodes` look healthy.
- Microsite URL resolves and her dashboard `X/28` count is sane.
Report findings — no code changes expected unless data anomalies surface.

## Out of scope
- Auth flow itself (SSO handoff is working as designed).
- Any change to `_shared/resolve-user.ts` (it correctly uses the shared **anon** key, not service role).
