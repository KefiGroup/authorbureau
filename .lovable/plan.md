## Goal

Make every builder (BP / BA / YR — 28 nodes) read the active book correctly on the Introduction step, so "Complete Book Profile" never shows when an `activeBookId` exists. This is a parity sweep of the BP-06 / BP-07 fix.

## Root cause (recap)

Every builder uses the `useAuthorBook` hook + an `useEffect` that calls `setResolvedBookTitle`. The bug pattern is the same in 12 builders: the effect queries `author_context` / `books` by **author only** (latest book), ignoring `activeBookId`. When the author has multiple books, this returns the wrong book — or nothing — and the gating check (`hasResolvedBook`) flips to `false`, showing the "Complete Book Profile" CTA.

## Fix — single shared helper, then call it everywhere

### 1. Create `src/lib/resolve-book-title.ts`

A single helper that mirrors the BP-06 logic exactly:
- If `activeBookId` is provided → query `author_context` filtered by both `author_id` AND `book_id`; on miss, fall back to `books.title` for that exact id.
- If no `activeBookId` → fall back to "latest book by author" (current behavior).
- Returns `""` on miss; never throws.

Signature: `resolveBookTitle(authorId, activeBookId, ownerUserId?) => Promise<string>`

### 2. Refactor each builder's intro effect to use the helper

Replace the inline `author_context`/`books` block with:
```ts
const title = await resolveBookTitle(authorId, activeBookId, profile?.user_id);
if (title) setResolvedBookTitle(title);
```

Where needed, ensure the component has `activeBookId = bookId ?? hookBookId ?? null` (most already do).

Also fix the gating CTA so the returnTo preserves the bookId, matching BP-06:
```ts
navigate(`/my-books?returnTo=${encodeURIComponent(`/node-builder/<NODE-ID>${activeBookId ? `?bookId=${activeBookId}` : ""}`)}`)
```

### 3. Files to edit (14 builders)

Builders that already use `setResolvedBookTitle` and need the helper swap + bookId-aware navigate:

- `bp01/BP01Builder.tsx`
- `bp02/BP02Builder.tsx`
- `bp03/BP03Builder.tsx`
- `bp04/BP04Builder.tsx`
- `bp05/BP05Builder.tsx`
- `bp08/BP08Builder.tsx`
- `bp09/BP09Builder.tsx`
- `ba10/BA10Builder.tsx`
- `ba11/BA11Builder.tsx`
- `ba12/BA12Builder.tsx`
- `ba13/BA13Builder.tsx`
- `ba14/BA14Builder.tsx`
- `ba15/BA15Builder.tsx`
- `ba16/BA16Builder.tsx`
- `ba17/BA17Builder.tsx`
- `ba18/BA18Builder.tsx`

Plus YR builders (yr19–yr28) — I'll inspect each and apply the same pattern wherever the lookup is author-only. Most YR builders have similar structure based on the gating-message scan.

### 4. What is intentionally NOT changed

- `useAuthorBook` hook itself (already returns the correct id).
- Server-side generation calls (already pass `book_id: activeBookId`).
- Publishing flow (`publishNodeToSite`) — Sprint 55g already aligned this.
- BP-06 and BP-07 — already fixed.

## Verification

After edits, on `/dashboard/book/<id>` open each node's Introduction step:
- Should show "...based on '<correct book title>'..."
- Should NOT show the "Complete Book Profile" gate when the book exists.
- "Complete Book Profile" CTA (when correctly shown for a brand-new author) should round-trip back to the right node + bookId.

## Memory note

After implementation, append a one-line note to `mem://architecture/library-asset-adoption`:
> "All builders use `resolveBookTitle(authorId, activeBookId)` from `src/lib/resolve-book-title.ts` for intro-step book detection — never inline author-only queries."
