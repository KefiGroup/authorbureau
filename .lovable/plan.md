# Audit: Why "Analyse this book" fails

## Root cause

`generate-bp00-analysis/index.ts` rejects every real book with **"This book does not belong to this author"** because its ownership check is wrong for our actual data shape.

Current check (lines 64–73):

```ts
const ownsByUser  = author.user_id && book.author_id === author.user_id;     // auth.users.id
const ownsByEmail = userEmail && book.owner_email === userEmail;             // auth.users.email
if (!ownsByUser && !ownsByEmail) return fail("This book does not belong to this author");
```

Verified against live data — for every real book, `books.author_id` stores the **`author_profiles.id`**, not `auth.users.id`:

| Book | books.author_id | author_profiles.id | author_profiles.user_id | book.owner_email | auth email |
|---|---|---|---|---|---|
| Be SUCKcessful | `92326a2f…` | `92326a2f…` ✓ | `ef23c521…` ✗ | support@paulineteo.com | paulinet77@gmail.com ✗ |
| Hemispheric Intelligence | `495504b7…` | `495504b7…` ✓ | `71ec252e…` ✗ | support@2percent.ai | (different) ✗ |
| A Gift From Heaven | `5f529a2b…` | `5f529a2b…` ✓ | `c82d2b87…` ✗ | felicia@artoflife.sg | (different) ✗ |

→ `ownsByUser` is **always false** (compares profile-id against user-id).
→ `ownsByEmail` is **false** whenever the author's PublishNow signup email differs from the book's `owner_email` (which is the common case).

So the gate fires on every "Analyse this book" click — exactly the red error in Veronica's screenshot.

The canonical lookup (`get-author-book/index.ts`, lines 98–110, 134–145) already does the right thing: it builds an `authorIds = { auth.uid, …author_profiles.id where user_id=auth.uid }` set and matches `books.author_id IN (authorIds) OR books.owner_email = userEmail`. `generate-bp00-analysis` was never updated to follow that pattern.

This violates the **Book Ownership Lookup** core memory rule.

## Fix

Replace the brittle two-line check in `supabase/functions/generate-bp00-analysis/index.ts` with the same union the canonical resolver uses:

1. Resolve `userEmail` from `auth.admin.getUserById(author.user_id)` (already done).
2. Build `authorIds = { author.user_id, author_id }` — i.e. accept either the auth UID or the passed-in `author_profiles.id` as a valid `book.author_id`.
3. Owns if any of:
   - `book.author_id === author.user_id` (legacy path)
   - `book.author_id === author_id` (current production path — author_profiles.id)
   - `book.owner_email === userEmail` (email fallback)
4. Keep the existing "Book not found" / "missing title" errors unchanged.
5. Leave the AI prompt, parsing, and upsert logic untouched.

## Out of scope

- Fixing `AnalyseBookGate.tsx` UI / copy.
- Re-uploading Veronica's deleted book (manual user action via PublishNow).
- BP-02 builder behaviour when there is no book at all (separate "no book uploaded" state — flag it, do not change here).
- Backfilling the 4 `author_context` rows whose `parsed_at` is NULL.

## Verification after the edit

1. Call the function with one of Pauline's real books to confirm it returns `success: true` and writes/updates the `author_context` row (parsed_at refreshed).
2. Confirm the BP-02 "Analyse this book" button no longer shows the red ABBY error for owners whose `owner_email` differs from their auth email.
