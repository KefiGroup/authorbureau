## Goal
On first visit to a product builder (Workbook BP-06, Home Study BP-07, Course BP-08, Special Edition BP-09), the 3 cover variations auto-generate and appear in the picker without the author needing to click "Generate cover".

## Change
Edit `src/components/dashboard/builders/shared/ProductCoverPreview.tsx` only. Backend, edge function, and other builders stay unchanged.

### 1. Auto-generate on first load
After `loadCover()` finishes the initial fetch:
- If `history.length === 0` AND the required props are present (`authorId`, `nodeId`, `productTitle`), kick off auto-generation sequentially until 3 designs exist.
- Use a `useRef` guard (`autoStartedRef`) so it runs only once per `(authorId, nodeId, bookId)` mount — never re-fires after the user clicks Redo or switches.

### 2. Sequential generation (3 calls)
- Reuse `generateProductCover(...)` exactly as today; the edge function already advances `slotIndex` based on existing history length.
- Loop `while (currentHistory.length < 3)` calling it once per missing slot, refreshing `history` between calls so the UI shows tiles as they finish.
- On any failure, stop the loop, surface a toast, and leave whatever was generated so the author can retry via Redo or refresh.

### 3. UI states
- While auto-generating: show `Loader2` spinners on the empty slots (existing dashed placeholders get a centered spinner + "Generating design 2 of 3…" caption).
- Hide the initial "Generate cover" button when auto-generation is in progress or has produced ≥1 design (the empty-state CTA is no longer needed in the auto-gen flow but kept as a manual fallback if auto-gen failed and history is still 0).
- Keep the per-tile **Redo** button exactly as it is — that remains the only manual control once 3 exist.

### 4. Safety
- Don't auto-generate if `loading` is still true, if `busy`/`regeneratingIdx` is already active, or if `history.length > 0` on load (returning users skip auto-gen entirely).
- Skip auto-gen if `productTitle` is empty (avoids generating a "Untitled" cover before the author has named the product).

## Out of scope
- No edge-function changes — `generate-product-cover` already returns one design per call and rotates art directions.
- No DB schema changes.
- No changes to BP06/07/08/09 builder files; the shared component handles it for all four.
