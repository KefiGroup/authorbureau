## Audit findings — why BP-03 "can't read the book profile"

I compared BP-03 to its siblings (BP-02, BP-04, BP-05, BP-06, BP-08, which all read book profile + autosave correctly) and traced every code path BP-03 takes to load book context.

### 1. The real bug — wrong fallback in `bp03-node-state` edge function
`supabase/functions/bp03-node-state/index.ts` line 294 falls back to:
```
.from("books").eq("author_id", authorProfile.user_id)
```
This is forbidden per the canonical rule in `mem://architecture/author-id-resolution.md`: **`books.author_id` is FK to `author_profiles.id`, NOT `auth.users.id`**. For every account where `user_id ≠ author_profiles.id` (i.e. all accounts created after the early matching-UUID era — Veronica, Kat, etc.), this query silently returns zero rows → `book_title = ""` → `has_context = false` → BP-03 shows "Complete Book Profile" even though the book exists. This is exactly the regression the user is hitting again.

### 2. BP-03 doesn't use the canonical client-side resolver
BP-06 and BP-08 import `resolveBookTitle(authorId, activeBookId, profile?.user_id)` from `src/lib/resolve-book-title.ts` as a second safety net. BP-03 relies entirely on the (broken) edge-function path with no client-side fallback.

### 3. BP-03 is the only BP node without `autosaveBuilderDraft`
BP-02, BP-04, BP-05, BP-06, BP-08 all call `autosaveBuilderDraft({ authorId, nodeId, bookId, ... })` after every step transition (generate, edit, review). BP-03 only writes to the server when the user clicks **Save** or **Send to Calendar**. If the user generates, tweaks captions, then refreshes, partial edits are lost because they live only in component state.

### 4. Refresh / same-page resume
The resume flow itself is correct (`bp03-node-state load` rehydrates `status` → `step`), and `NodeBuilder.tsx` already preserves `?bookId=…` in the URL. Once #1–#3 are fixed, refresh will land on the right step with the right book.

---

## Changes

### A. Fix the edge function (root cause)
`supabase/functions/bp03-node-state/index.ts` — line 294: change `eq("author_id", authorProfile.user_id)` → `eq("author_id", authorProfile.id)`.

While here, also use the same `(author_id, book_id)` per-book lookup the rest of the function already uses for the `requestedBookId` branch — keeping behaviour identical to BP-06/07's edge functions. Redeploy the function.

### B. Bring BP-03 client up to BP-06/BP-08 parity
`src/components/dashboard/builders/bp03/BP03Builder.tsx`:

1. After the `useAuthorBook()` call, add a client-side fallback identical to BP-08:
   ```ts
   const { resolveBookTitle } = await import("@/lib/resolve-book-title");
   const _title = await resolveBookTitle(authorId, activeBookId, profile?.user_id);
   ```
   Use it to seed `bookTitle` when the edge function returns an empty title.
2. Compute `hasResolvedBook = hasBook || !!resolvedBookTitle || (detectedBookTitle && detectedBookTitle !== "your book")` and gate the "Complete Book Profile" message on `hasResolvedBook` instead of raw `hasBook` — same pattern BP-06/08 use to stop a flapping gate when only the per-book lookup found the book.

### C. Add autosave parity
Import `autosaveBuilderDraft` from `@/lib/builder-autosave` and call it (with `bookId: activeBookId`) at three points, mirroring BP-02/BP-04:
- After `handleGenerate` succeeds (step 1 → 2), so the freshly generated kit survives a refresh even before the user clicks Save.
- After in-place caption edits inside the Step 2 review (where the user mutates `content`).
- After successful `handleActivate` (step 3) — defensive, since `persistNodeState("live")` already writes, but autosave keeps the unified `author_nodes.book_id` autosave row in sync.

### D. Verification
- Deploy `bp03-node-state`, hard-refresh BP-03 from Book Hub for a multi-book author whose `user_id ≠ author_profiles.id`. Expect: hero copy reads `'…book title…'` (not "your book"), no "Complete Book Profile" gate.
- Generate a kit, refresh mid-edit. Expect: returns to Step 2 with the latest captions intact.
- Open BP-03 directly via `/node-builder/BP-03?bookId=…`, refresh. Expect: same step, same book, same content.

### Out of scope
- Migrating BP-03 from `useAuthorBook` to `useBookContext` wholesale — every BP node uses `useAuthorBook` consistently; switching just BP-03 would create one-off divergence. The fallback in B gives the same correctness without the wider refactor.
- Touching other builders. The audit confirmed only `bp03-node-state` has the wrong-FK fallback in BP-* edge functions.
