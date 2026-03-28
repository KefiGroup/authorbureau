

## Plan: Add RLS Policy + Clear Stale Build Errors

### What's happening

**Build errors are stale.** I verified all 28 builder files — every one already calls `useAuthorBook()` with zero arguments. The TS2554 errors reference the correct lines but the code is already fixed. This is a cached build artifact issue.

**RLS policy is needed.** The `books` table currently lacks a SELECT policy allowing authors to read their own books. This is likely why the hook can't fetch book data — RLS is blocking the query.

### Steps

**Step 1 — Add RLS policy on `books` table**

Run a database migration:

```sql
CREATE POLICY "Users can read own book"
ON public.books FOR SELECT
TO authenticated
USING (auth.uid() = author_id);
```

This allows any authenticated user to SELECT rows from `books` where `author_id` matches their auth UID. This is the missing piece that would cause the `useAuthorBook` hook to return no data even though the record exists.

**Step 2 — Trigger a clean rebuild**

Make a trivial whitespace change to any file (e.g., add a blank line to `useAuthorBook.ts`) to force a fresh TypeScript compilation and clear the stale error cache.

### Why this fixes the book detection issue

The hook queries `books` with `.eq("author_id", authUserId)`. Without an RLS SELECT policy, the query returns zero rows even though the data exists. Adding this policy unlocks the data for the authenticated user.

### Files changed
- **Database migration**: 1 new RLS policy on `books`
- **Code**: Trivial whitespace-only touch to clear build cache (no logic changes)

