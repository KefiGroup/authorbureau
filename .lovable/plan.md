
## Root cause

Two independent bugs in `src/pages/AuthorBookPage.tsx` are hiding every product card on `/pauline-teo/be-suckcessful` (only the Kindle/Hardcover hero formats remain):

1. **`setProducts(prods)` is never called.** `loadBookPage()` builds the merged `prods` array from `home_study_courses`, `courses`, `audiobooks`, `podcasts`, `coaching_packages`, `speaking_topics`, and `author_nodes`, but never writes it to state. So `products.length === 0` always, which kills the "Go Deeper" grid AND the per-book product nav.
2. **PostgREST 400 on the buyable-nodes query.** The query chains `.not("price_usd", "is", null).gt("price_usd", 0)` — two filters on the same column, which PostgREST rejects with `400`. Result: `buyableNodes` stays `[]` and the "Get the Full Experience" / Buy-Now grid never renders.

DB confirms the data is intact: 25 live nodes for this book, 15 of them priced. Fixing the above will restore every product.

## Sprint 64 — Restore book-page product surfaces

### 1. Fix the two render-blocking bugs

In `src/pages/AuthorBookPage.tsx → loadBookPage()`:

- After the `prods.push(...)` block (around the existing author_nodes merge), add the missing `setProducts(prods)` call.
- In the buyable-nodes query, drop the redundant `.not("price_usd", "is", null)` — `.gt("price_usd", 0)` already excludes nulls and avoids the duplicate-filter 400.

### 2. Split the products grid into the two named sections from the brief

Currently products render as one flat "Go Deeper" grid. The brief (and this bug report) asks for two grouped sections placed between **About This Book** and **About the Author**:

- **Available Formats** — anything that extends the book itself
  - Includes: `BA-11` Audiobook, `BP-06` Workbook, `BP-07` Home Study, `BA-17` Bundles ("Product Ladder"), plus the legacy `home_study_courses` / `audiobooks` rows
- **Services & Programmes** — paid services around the book
  - Includes: `BA-10` Online Course, `BA-12` Membership, `BA-13` Group Coaching, `YR-19` 1-on-1 Coaching, `YR-20` Big Ticket, `YR-21` Speaking, `YR-22` Corporate Training, `YR-23` Mastermind, `YR-24` Retreat, `YR-25` Certification, `YR-26` Conference (Events), plus `coaching_packages` / `speaking_topics` rows

Outbound / free funnel nodes (`BP-01`, `BP-02`, `BP-04`, `BA-14`, `BA-15`, `BA-16`, `BA-18`, `YR-27`, `YR-28`) keep flowing into the existing "Get the Full Experience" buyable strip when priced; otherwise they are hidden on this page (they live on the author page).

A small `PRODUCT_GROUPS` map in the same file decides which bucket each `route` / `type` lands in. The existing `ProductLink` card markup is reused — only the wrapper changes from one `<section>` to two.

### 3. Author page is untouched

No edits to `src/pages/AuthorSite.tsx` or any `src/pages/author-site/*` file. Both pages continue to surface the products independently.

### 4. Verification

- Navigate to `/pauline-teo/be-suckcessful` in preview.
- Confirm two new headings appear between "About This Book" and "About the Author": **Available Formats** and **Services & Programmes**, each with their cards.
- Confirm the existing "Get the Full Experience" Buy-Now strip renders again (15 priced cards).
- Confirm the per-book product nav (the sticky tab strip at the top of the page) re-appears.
- Confirm the network tab shows `200` on both `author_nodes` requests (no more `400`).
- Re-check `/pauline-teo` author page: nothing removed.

## Files touched

- `src/pages/AuthorBookPage.tsx` — only file changed. ~15 lines added (group map + second `<section>` wrapper + two-line bug fix).

## Out of scope

- No DB schema changes. No edge-function changes. No edits to the author page or its sections. No restyle of the existing card component.
