## Plan

I’ll make BP-06 follow the same book-scoped launch flow as the other working Brand builders, then remove the legacy bottom CTA so the Workbook flow always uses current Book Hub language.

## What I’ll change

### 1) Lock BP-06 to the book-scoped launch path
Ensure the Workbook tile always carries `bookId` and `bookTitle` all the way into `/node-builder/BP-06`.

Files to update:
- `src/pages/AuthorDashboard.tsx`
- `src/pages/BookBuilderRoute.tsx`

Implementation:
- Keep the BP-06 redirect using the shared `buildNodeBuilderSearch(location)` pattern so `/node-builder/BP-06` receives the same query params as BP-05/BP-07/BP-08/BP-09.
- Verify the nested book route `/dashboard/book/:bookId/build/workbooks` mirrors params before `AuthorDashboard` mounts, so the redirect cannot fire with an empty search string.
- If needed, tighten the BP-06 branch specifically so `bookId` from the path is injected before `<Navigate>` resolves.

Result:
- Workbook opens as:
  `/node-builder/BP-06?bookId={id}&bookTitle=...&builder=workbook`
- `NodeBuilder` will then automatically show:
  `Back to Book Hub · Brand`
  and navigate to:
  `/book-hub/{bookId}?tab=revenue-streams`

### 2) Keep BP-06 return URLs book-aware
Update the Workbook builder so all internal return paths preserve the active book context.

File to update:
- `src/components/dashboard/builders/bp06/BP06Builder.tsx`

Implementation:
- Preserve `bookId` in the `Complete Book Profile` return URL.
- Verify any BP-06 navigation that can bounce the user out of the builder retains the current book scope.

Result:
- If the author must complete book setup first, returning lands back in the same Workbook flow for the same book.

### 3) Remove the legacy bottom “Brand Products” button from BP-06
The old bottom CTA appears when `bookId` is missing and falls back to legacy wording. I’ll remove that legacy behavior for the Workbook success flow.

Primary file to update:
- `src/components/dashboard/builders/shared/PublishSuccessScreen.tsx`

Implementation:
- Replace the BP-06 fallback secondary action so it no longer says `Go back to Brand Products`.
- Prefer either:
  - `Back to Book Hub` when `bookId` is present, or
  - a modern non-legacy fallback such as `Back to My Books` when no book context exists.

Result:
- The Workbook page will no longer show the outdated Brand Products wording at the bottom.

### 4) Trigger a fresh deploy
Because similar BP-06 logic already exists in source, I’ll make a small real code change in the affected files so the updated bundle is definitely rebuilt and published.

## Technical notes

- The top back label is controlled by `NodeBuilder.tsx`, not by the deprecated `onBack` prop passed into `BuilderHeader`.
- `NodeBuilder` already renders the correct label when `bookId` exists:
  - BP node + `bookId` -> `Back to Book Hub · Brand`
  - no `bookId` -> `Back to Dashboard`
- So the real fix is to guarantee BP-06 arrives with `bookId` in the query string every time.
- The bottom legacy button comes from `PublishSuccessScreen.tsx`, where the no-`bookId` fallback still uses older Brand Products terminology.

## Acceptance criteria

1. Clicking Workbook from the Brand tab opens:
   `/node-builder/BP-06?bookId=...&bookTitle=...`
2. The top back link reads:
   `Back to Book Hub · Brand`
3. That back link returns to:
   `/book-hub/{bookId}?tab=revenue-streams`
4. `Complete Book Profile` preserves `bookId` in the return URL.
5. The bottom legacy `Go back to Brand Products` button is gone from the BP-06 flow.
6. BP-05, BP-07, BP-08, and BP-09 behavior remains unchanged.