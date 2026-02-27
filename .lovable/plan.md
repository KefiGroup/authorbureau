

# Revised `save-book` Fix Plan

Based on PublishNow's feedback, the plan is updated with two changes:

## 1. PublishNow Side (separate project, not this workspace)
PublishNow will fix `pull-shared-profile` to use paginated user lookup instead of `listUsers()` without pagination. This is the root cause — the auth user exists but gets missed when not on page 1.

## 2. AB Side: Defense-in-depth null guard (this project)

**File:** `supabase/functions/save-book/index.ts`

The fallback logic changes from keying on `author_name` to keying on `email` (stable, unique):

1. If `resolved?.userId` exists → use it (happy path, no change)
2. If null → look up existing books with a new `owner_email` match → reuse that `author_id`
3. If still null → create a local identity keyed by email

**Concrete changes:**

- Add `owner_email` column to the `books` table (populated on insert from the push email). This gives us a stable, unique key for deduplication.
- In the platform-push path (~line 78-90), replace the current resolution block:
  - Check `resolved?.userId` first
  - Fallback: query `books` WHERE `owner_email = body.email` to reuse existing `author_id`
  - Final fallback: `crypto.randomUUID()` + create `author_profiles` entry, but also store the email in a way that allows re-linking later
- Store `owner_email` on every book insert so future pushes for the same author can be matched
- Add explicit `if (!userId)` guard before the insert returning 400

**Migration:**
```sql
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS owner_email text;
CREATE INDEX IF NOT EXISTS idx_books_owner_email ON public.books(owner_email);
```

## Implementation Order
1. DB migration: add `owner_email` to books
2. Update `save-book`: new fallback logic keyed on email + populate `owner_email` on insert
3. Add debug logging for cross-platform push path

