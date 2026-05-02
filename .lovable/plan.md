## Issue

BP-07 (Home Study Course) shows "Complete Book Profile" even when the active book exists, while BP-06 works. Root cause: BP-07's book-resolution effect ignores `activeBookId` and only looks up the *latest* book/context for the author. When you're inside `/dashboard/book/<id>`, that query may return nothing (or the wrong book), so `resolvedBookTitle` stays empty and `hasResolvedBook` is false.

Master Architecture **was** aligned for `activeBookId` usage in *publishing* (Sprint 55g Phase 1) — but the **introduction-step book detection** for BP-07 was not ported to the BP-06 pattern. That's the gap.

## Fix (BP-07 only — mirror BP-06 exactly)

1. **Per-book resolution in the load effect** (`src/components/dashboard/builders/bp07/BP07Builder.tsx`, ~lines 53–65):
   - If `activeBookId` is present, query `author_context` filtered by `author_id` AND `book_id = activeBookId`; on miss, fall back to `books.title where id = activeBookId`.
   - Only when there is no `activeBookId` at all, fall back to "latest book" by `author_id`.
   - Use `useAuthorBook` hook's `bookId` as fallback (already in `activeBookId`).

2. **Pass bookId through the gating CTA** (~line 259):
   - Change `navigate("/my-books?returnTo=/node-builder/BP-07")` to include the active book in the returnTo so the user lands back on the right book context, matching BP-06:
     `navigate(\`/my-books?returnTo=${encodeURIComponent(\`/node-builder/BP-07${activeBookId ? \`?bookId=${activeBookId}\` : ""}\`)}\`)`

3. **Use `activeBookId` for draft load** (~line 76):
   - `loadBuilderDraft(authorId, "BP-07", activeBookId)` instead of raw `bookId`, so the hook's resolved book id participates.

4. **No DB / RLS changes** — pure client-side parity fix.

## Why other BP nodes are not in this patch

A quick scan shows the same potential drift exists in other intro screens (BP-02, BP-03, BP-05, BP-08, BP-09). The user reported this specifically for BP-07 and asked us to mirror BP-06. After BP-07 is verified, I'll do the same single-file parity sweep for the remaining BP nodes in a follow-up sprint (Sprint 55h: "Intro-Step Book Detection Parity").

## Files to edit

- `src/components/dashboard/builders/bp07/BP07Builder.tsx` (one effect + one navigate call + one draft-load arg)

## Memory note

After verification, append a short note to `mem://architecture/library-asset-adoption` clarifying that **`activeBookId` must drive both the publish path AND the intro-step book lookup**, not just publishing. Sprint 55g covered publish; intro lookup is the missing half.
