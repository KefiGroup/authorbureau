# Fix BP-06 book lookup and false gating

## What I found
The screenshots and code point to a specific bug in the Workbook builder, not missing book data.

Pauline's author account is valid and the data exists:
- `author_profiles`: Pauline Teo = `92326a2f-3ed0-4873-a8cf-7a0b1350995a`
- books owned by Pauline:
  - `e5b857ac-48ce-4ffc-a761-3c09e95a318e` = `Be SUCKcessful`
  - `3c65a5f1-96da-4538-80c3-7bb23fb622fb` = `Invest Like Buffett for Parents`
- `author_context` exists for both books.

So the backend data is present.

The actual problem is in the BP-06 flow:
- `BP06Builder` uses `useAuthorBook()` for its intro gate, which calls `get-author-book` with no explicit `bookId`.
- `get-author-book` falls back to the latest matching book when no `bookId` is supplied.
- BP-06 `handleGenerate()` sends only `{ author_id }` to `generate-bp06-workbook`, but the generator expects `book_id` when an author has multiple books.
- After the recent stricter per-book context rules, this can cause the builder to resolve the wrong book or no valid context for the active book, which matches your screenshots: the book header is present, but clicking Build leads to the false “Complete Book Profile” state.

In short: the UI knows which book page you came from, but BP-06 does not thread that active `bookId` all the way through generation and gating.

## Plan
1. Update `src/components/dashboard/builders/bp06/BP06Builder.tsx`
   - Derive an `activeBookId` the same way BP-01/BP-02 already do: prefer the route/query `bookId`, then fall back to the hook only if needed.
   - Use the active book for generation, draft restore, and publish flows.
   - Stop using the generic/latest-book fallback for the intro gate when an explicit `bookId` is already in scope.

2. Fix the BP-06 generate request
   - Send `book_id: activeBookId` to `generate-bp06-workbook`.
   - Preserve the existing auth-token pattern (`getActiveToken()` + `fetchWithTimeout()`), but make the request match the per-book contract used by the other builders.

3. Align BP-06 local resolution with per-book behavior
   - When hydrating local title/context in the intro screen, prefer the explicit `bookId` first instead of “latest book for this author”.
   - Ensure the intro copy, builder state, and publish calls stay tied to the selected book rather than whichever book sorts newest.

4. Verify the backend contract remains correct
   - Confirm `generate-bp06-workbook` already supports `book_id` and relies on per-book `author_context`.
   - No database migration needed; this is a client-side threading bug.

5. Test the author flow end-to-end
   - From Pauline’s Book Hub, open BP-06 for `Be SUCKcessful` and confirm:
     - the intro screen shows the builder CTA
     - clicking Build no longer drops to “Complete Book Profile”
     - the builder stays attached to the selected book
   - Repeat with the second Pauline book to confirm multi-book authors work correctly.

## Technical notes
Relevant files:
- `src/components/dashboard/builders/bp06/BP06Builder.tsx`
- `src/hooks/useAuthorBook.ts`
- `supabase/functions/generate-bp06-workbook/index.ts`
- `supabase/functions/_shared/builder-helpers.ts`

Comparison pattern already working:
- `BP01Builder` and `BP02Builder` both compute an active book and pass `book_id` into their generator functions.
- BP-06 is currently the outlier.

## Expected outcome
Pauline can enter BP-06 from an already loaded book in Book Hub and build normally, without the false “Complete Book Profile” gate and without cross-book leakage between her two books.