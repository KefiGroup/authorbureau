

## Root Cause

The book **is being saved successfully** — confirmed in the database:
- `The Trust API: The HealthTech Bridge` exists with `author_id: ddbc1df6-c52f-45cb-ba2d-2ebd0ff2e748`, `published_at` set, `owner_email: fasahath@gmail.com`
- An `author_profiles` entry exists for that generated UUID

**The problem is an identity mismatch.** When the user logs into Authors Bureau via SSO, their session resolves to their shared backend user ID (e.g. `ffbc179a-...`). But the book was saved under a locally generated UUID (`ddbc1df6-...`) because the shared profile lookup failed. The `list-my-books` function queries `WHERE author_id = <SSO user ID>` and finds nothing.

There is **no auth.users entry** for `fasahath@gmail.com` in this project's Cloud database, so the email-based local match in `list-my-books` also fails.

## Fix: Two-pronged approach

### 1. `list-my-books` — Add `owner_email` fallback (primary fix)

After resolving `userId`, also resolve the user's email. Then query books using **both** `author_id = userId` **OR** `owner_email = userEmail`. This ensures platform-pushed books are visible regardless of which UUID was used as `author_id`.

Apply the same dual-ownership check to `get`, `update`, and `unpublish` actions so Edit and Unpublish work on synced books too.

**File:** `supabase/functions/list-my-books/index.ts`

Changes:
- Extract `userEmail` from the resolved user object
- Replace all `.eq("author_id", userId)` queries with an `.or()` filter: `author_id.eq.${userId},owner_email.eq.${userEmail}`
- For the default list query, deduplicate results (a book could match both conditions)

### 2. `save-book` — Prefer shared backend user ID when available (prevention)

When `resolveUserViaSharedProfile` returns a profile but `user_id` is null, the function currently generates a random UUID. Instead, it should also try to use the email to look up the user directly in the shared backend auth (the user IS there — `ffbc179a-...`). This won't fix existing data but prevents future mismatches.

**File:** `supabase/functions/save-book/index.ts`

Add after the `resolveUserViaSharedProfile` call fails to return a userId:
- Call the shared backend's `auth.admin` to find the user by email (requires service role key which is already available as `SHARED_BACKEND_SERVICE_ROLE_KEY`)
- If found, use that auth user ID as `userId`

### 3. Migrate existing orphaned book (data fix)

Run a one-time update to fix the existing book's `author_id` so it matches the real shared backend user ID. This is a data operation, not a schema change.

## Implementation order

1. Update `list-my-books` with `owner_email` fallback (immediate visibility fix)
2. Update `save-book` to try shared backend auth lookup before generating random UUID
3. Data migration: update existing orphaned book's author_id

## Technical details

```text
Current flow (broken):
  PublishNow push → save-book → shared profile lookup FAILS → generates random UUID ddbc1df6
  User login → SSO → resolves to ffbc179a
  My Books → list-my-books → WHERE author_id = ffbc179a → 0 results

Fixed flow:
  My Books → list-my-books → WHERE author_id = ffbc179a OR owner_email = fasahath@gmail.com → finds book
```

