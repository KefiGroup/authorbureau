## Plan

1. Re-scope the BP-06 fix to the UI shown in your screenshot
- Treat the screenshot as the source of truth: the affected surface is the **Book Hub product tile** for BP-06, not just the builder page.
- Confirm the visible symptoms on that tile:
  - the BP-06 card shows a false `Live` badge
  - the tile CTA/state is wrong for the current book
  - clicking from that tile can still open the builder without the correct book context

2. Fix the real root cause: Book Hub tile state is currently author-wide, not book-specific
- Update `useBookNodeProgress` so it filters `author_nodes` by the **current `book_id`**, not all rows for the author.
- Update its API so Book Hub passes the active book id into the hook.
- Keep the existing `content_json` non-empty check for BP-05/BP-06 style readiness, but apply it only to the current book’s node row.

3. Fix the second state source used by the same tile
- Update `useNodeLiveStats` to support **book-scoped** stats instead of picking the “most progressed row per node” across all books.
- Right now it collapses all books into one record per node code, which can make BP-06 show `Live` because some other book has a live workbook.
- Pass the active book id from `PortfolioStepView` so the Workbook tile reads the live/progress data for the current book only.

4. Correct the BP-06 Book Hub tile label/badge/CTA behavior
- Verify the BP-06 card in `PortfolioStepView` + `SmartProductCard` resolves to the right state for the current book:
  - empty or missing content -> `Ready to Build`
  - draft/content ready -> `Building` or equivalent in-progress state
  - actually live for this book -> `Live`
- Ensure the tile no longer shows `Open & Manage` / `Live` just because another workbook exists elsewhere for the same author.

5. Keep builder navigation aligned with the corrected tile
- From the BP-06 tile, ensure the launch path includes the current book context:
  - `/node-builder/BP-06?bookId=...&bookTitle=...`
- Re-check the already-added redirect fixes so the builder page back label remains:
  - `Back to Book Hub · Brand`
  - target `/book-hub/{bookId}?tab=revenue-streams`

6. Remove any remaining stale workbook wording on legacy fallback screens
- Search for any old workbook-specific copy such as `Go back to Brand Products` that can still appear from the old manager/fallback path.
- Update or remove it so BP-06 uses the Book Hub language consistently.

7. Verify the exact screenshot flow end-to-end
- Open the current book’s Brand tab
- Inspect the BP-06 Workbook tile
- Confirm the tile badge/state is correct for that book only
- Click the tile and confirm the builder URL carries `bookId`
- Confirm the builder top back link returns to the Brand tab of that same book
- Publish the frontend update so production matches the fix

## What I found
The screenshot exposed a different issue than the builder-only back button. The BP-06 **tile** is driven by:
- `src/components/dashboard/PortfolioStepView.tsx`
- `src/hooks/useBookNodeProgress.ts`
- `src/hooks/useNodeLiveStats.ts`
- `src/components/dashboard/SmartProductCard.tsx`

Those hooks currently derive state too broadly at the author level. That means the Workbook name tile can show the wrong badge/label for the current book even if the builder redirect code was fixed.

## Technical details
```text
Current problem
Book Hub tile
  -> PortfolioStepView
     -> useBookNodeProgress()   // currently not scoped to current book
     -> useNodeLiveStats()      // currently collapses rows across books
  -> SmartProductCard renders badge/CTA from that mixed state

Required fix
Book Hub tile
  -> PortfolioStepView(bookId)
     -> useBookNodeProgress(bookId)
     -> useNodeLiveStats(bookId)
  -> SmartProductCard now shows the correct BP-06 badge for this book only
```

## Files likely to change
- `src/hooks/useBookNodeProgress.ts`
- `src/hooks/useNodeLiveStats.ts`
- `src/components/dashboard/PortfolioStepView.tsx`
- `src/components/dashboard/book-hub/BookHubOverview.tsx` if hook props need threading
- `src/components/dashboard/SmartProductCard.tsx` only if the badge mapping itself needs a small wording adjustment
- plus any remaining stale fallback component if old workbook copy still surfaces

## Deliverable
A BP-06 Workbook tile that matches the screenshot context: the badge/label on the Book Hub card is correct for the current book, and clicking it opens the correct builder with the correct back path.