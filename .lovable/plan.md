

## Fix per-book progress + clean up the multi-book sidebar

Two real bugs surfaced by your second book:

**Bug 1 — sidebar counts ("9 built", "9 built", "10 built") are author-wide totals.**
They sum every node across every book, so the moment you have a second book the numbers stop meaning anything to either book. There's no per-book breakdown anywhere in the sidebar.

**Bug 2 — "8% built" / "1 Products Built" on the Be SUCKcessful card is wrong.**
The per-book counter (`stats.products.perBook[bookId]`) only counts rows from 8 product tables (`courses`, `workbooks`, `audiobooks`, `home_study_courses`, `podcasts`, `coaching_packages`, `email_flows`, `social_media_content`). It does **not** count the `author_nodes` table — which is where BP-01, BP-02, BP-03, BP-04, BP-05, BP-08, every BA-* node, and most YR-* nodes are stored. So if you've built 28 nodes but only 1 of them happens to be a workbook, the card says "1 Products Built · 8%". Plus the denominator is hardcoded to 12 instead of 28.

### What you'll see after

**Sidebar (multi-book aware)**

Drop the global `9 built / 9 built / 10 built` badges from the three category items. Replace with subtle, book-agnostic labels:

```text
$ Brand Products      Create Your Products
🎙 Build Authority     Scale Your Audience
🏆 Yield Revenue       Premium Services
```

When the user **opens a book** (i.e. is on `/dashboard/book/:bookId` or any builder route that has a `bookId` in context), a small "Current book" pill appears at the top of the sidebar:

```text
┌─────────────────────────────┐
│ 📖 Be SUCKcessful   28/28 ●│
│ Brand 9 · Build 9 · Yield 10│
└─────────────────────────────┘
```

…and the three category items show **per-book** counts inline (`9/9 built`, `9/9 built`, `10/10 built`) instead of the global totals. Click the pill to switch books.

**Book cards on My Books Hub**

Fix the math so it actually reflects the 28-node framework:

- Denominator: **28** (not 12).
- Numerator: count of **distinct nodes** built for this book = rows in `author_nodes` for the book's owning author with `status IN ('content_ready','live','published_pending_ghl','draft','ready_for_review')` PLUS rows in the 8 product tables that have `book_id = this.book.id`. De-duplicate by `node_id` so a node represented in both places is only counted once.
- Per-category breakdown shown as: `Brand 9/9 · Build 9/9 · Yield 10/10`.
- Progress bar reflects the new denominator.

For Be SUCKcessful with all 28 nodes built this will read **"28 of 28 built · 100%"**.

### What changes in code

**`supabase/functions/author-stats/index.ts`**
Extend `perBook` from `Record<string, number>` to `Record<string, { brand: number; build: number; yield: number; total: number; nodeIds: string[] }>`:
- For each `author_nodes` row already fetched, look up its `book_id` (it exists on the table). Bucket it into brand/build/yield by the `BP-` / `BA-` / `YR-` prefix and append the `node_id` to `nodeIds`.
- For each row in the 8 product tables, map the table → its node_id (e.g. `workbooks` → `BP-06`, `home_study_courses` → `BP-07`, `audiobooks` → `BP-09`, `coaching_packages` → `YR-19`, `podcasts` → `BA-12`, `email_flows` → `BP-01`, `social_media_content` → `BP-03`, `courses` → `YR-21`) and add to `nodeIds` only if not already present.
- Final per-book counts derived from the de-duplicated `nodeIds` set.
- Also include `BP-04` if the book's author has `author_slug` set (matches existing global logic).

**`src/hooks/useAuthorStats.ts`**
Update `AuthorStats.products.perBook` type to the new structured shape. No fetch logic changes.

**`src/components/dashboard/my-books/RevenueProjectionCard.tsx`**
- Accept new prop shape: `{ brand, build, yield, total }` (out of 9 / 9 / 10 / 28).
- Render: progress bar driven by `total / 28`, plus a one-line breakdown `Brand 9/9 · Build 9/9 · Yield 10/10`.
- Keep the revenue range copy as-is.

**`src/components/dashboard/MyBooks.tsx`** (line ~540)
Pass the new structured per-book object to `RevenueProjectionCard`. Update the small "{builtCount} Products Built" status pill to use the new `total` instead of the truncated table-only count.

**`src/components/dashboard/my-books/AbbyNudge.tsx`**
Use `totalProducts={28}` for tier "yield" message (currently passes 12).

**`src/components/dashboard/DashboardSidebar.tsx`**
- Remove the `badge: \`${buildUnlocked} built\`` etc. from the three category items by default.
- Add a new optional prop `currentBook?: { id: string; title: string; brand: number; build: number; yield: number; total: number }`.
- When `currentBook` is provided: render the small "Current book" pill at the top of the BUILD YOUR BUSINESS section AND inject per-book badges on the three category items (`9/9 built` style).
- When not provided: no badges at all on the three category items (clean look for the multi-book overview).

**`src/components/dashboard/DashboardLayout.tsx`**
- Detect the active book via the URL: `useParams<{ bookId?: string }>()` (works for `/dashboard/book/:bookId`) and `useSearchParams().get("bookId")` (works for builder routes).
- Look up that book's per-book stats from `stats.products.perBook[activeBookId]` and pass as `currentBook` to `<DashboardSidebar>`.
- Stop passing the global `buildUnlocked` / `buildAuthorityUnlocked` / `yieldUnlocked` props (or pass them only when no `currentBook` is set, to keep them as a fallback).

**`src/components/dashboard/book-hub/BookHubOverview.tsx`** (line 324)
Update the "All 28 builders are unlocked" copy — already correct, no change needed beyond verifying the data feeding this banner is per-book consistent.

### Out of scope

- Switching the sidebar's other counters (pending review, unread nudges) to per-book — they remain author-wide on purpose.
- Changing the 28-node framework definition.
- Adding a book switcher inside the sidebar pill (clicking it just navigates back to `/dashboard?section=my-books`).
- Backfilling historical `author_nodes.book_id` values; we trust whatever `book_id` is already stored on each row.

### Validation

1. Sign in as the user with Be SUCKcessful + Invest Like Buffett.
2. On `/dashboard?section=my-books`:
   - Be SUCKcessful card shows **"28 of 28 built · 100%"** with `Brand 9/9 · Build 9/9 · Yield 10/10`.
   - Invest Like Buffett card shows **"0 of 28 built · 0%"** with `Brand 0/9 · Build 0/9 · Yield 0/10`.
   - Sidebar shows category items with **no built badges** (clean, multi-book mode).
3. Click into Be SUCKcessful's Book Hub:
   - Sidebar shows the "Current book" pill with `Be SUCKcessful · 28/28`.
   - Category items show `9/9 built`, `9/9 built`, `10/10 built`.
4. Click into Invest Like Buffett:
   - Pill shows `Invest Like Buffett · 0/28`.
   - Category items show `0/9`, `0/9`, `0/10`.
5. Build one new node for Invest Like Buffett → its card progress moves to 1/28, sidebar pill updates within 30s (cache TTL).

