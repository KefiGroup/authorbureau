
## The real diagnosis

Before fixing anything, the picture changes once we look at the data:

```
Pauline Teo (author profile 92326a2f…)
  Books:
    - Be SUCKcessful                    (e5b857ac…) — created 2026-04-11
    - Invest Like Buffett for Parents   (3c65a5f1…) — created 2026-04-24

  author_nodes for this author: 22 rows total, ALL author-scoped (no book_id column)
    BP-02 live   → /pauline-teo/free-gift            (built for Be SUCKcessful)
    BP-06 live   → workbook (PDF)                    (built for Be SUCKcessful)
    BP-07 live   → /pauline-teo/home-study           (built for Be SUCKcessful)
    BP-04 content_ready → microsite                  (Be SUCKcessful copy)
    BA-11 live   → /pauline-teo/audiobook            (Be SUCKcessful audiobook — NOT empty)
    BA-10 content_ready → "The SUCKCESS Blueprint"   (built with Be SUCKcessful content,
                                                       even though invoked from the new book)
    + 16 other Be SUCKcessful nodes
    YR-19 (1-on-1 coaching): not present
    BP-03 status = content_ready (built, not yet activated)

  author_context rows: 1 row total, for "Be SUCKcessful" only.
```

Two structural facts drive every bug in your list:

1. **`author_nodes` has no `book_id` column.** Every node is author-scoped, so the same row is shown for every book under that author. That's why BA-11 still appears "live" on the Invest book (it's the Be SUCKcessful audiobook), and why every "node count per book" we ever showed is approximate.
2. **`author_context` is also author + title scoped, with one row per author so far.** When the BA-10 generator runs for the new book, `buildAuthorContext()` correctly searches by `book.title = "Invest Like Buffett for Parents"`, finds nothing, and falls back to "the latest context for this author" — which is Be SUCKcessful. The AI then writes a Be SUCKcessful course. This is the source of Bug #5 (BA-10 wrong content), and it will hit every BA/YR generator the moment a second book is built without first generating its own context.

So the per-book bugs aren't really 9 separate bugs — they're two architectural gaps. The status table you sent is mostly correct as a description of *what's stored* once you accept that everything stored is currently labelled "Be SUCKcessful". The cleanup below makes per-book truth possible.

## What this plan does

### Fix 1 — Make `author_nodes` per-book (schema + plumbing)

**Migration:**
- Add `book_id uuid` column to `public.author_nodes` (nullable, FK to `books(id)` on delete cascade).
- Add unique index on `(author_id, node_id, book_id)` to replace the current `(author_id, node_id)` constraint, so the same node can exist independently for two books.
- One-time backfill: set `book_id` on every existing row to the author's **oldest** book (`min(created_at) per author_id`). This pins all 22 of Pauline's existing rows to "Be SUCKcessful", which matches reality.

**Edge function changes (write side):**
- `supabase/functions/save-author-node/index.ts` — accept `bookId` in the request, include it in the lookup key (`author_id + node_id + book_id`) and in insert/update payloads. Also pass it through in the `publish` action.
- `supabase/functions/_shared/builder-helpers.ts` — `upsertAuthorNode()` and `snapshotAuthorNode()` accept a `bookId` and key on it.
- All 28 generator edge functions already destructure `book_id` from the request; pass it down to `upsertAuthorNode()` so the new row is written with the right `book_id`.

**Frontend (read side):**
- All places that read `author_nodes` for sidebar counts, builder hydration, microsite "Go Deeper" cards, dashboard tiles, lead-magnet activation, BP-03 setProgress, etc., must filter by `book_id = currentBookId` (or `book_id is null` for legacy rows during the migration window).
- `src/lib/builder-autosave.ts` and the load wrapper in `save-author-node` already accept a `bookId` from the props chain we wired in earlier — extend the existing call sites to actually pass it (today many still don't).

**UI consequence (this is the user-facing change):**
- After backfill, opening **Invest Like Buffett for Parents** shows every node as "Step 1 — Not Started" — including BA-11 Audiobook. That matches the user's expectation in the table.
- Opening **Be SUCKcessful** shows the existing 22 rows unchanged.
- Sidebar "X built" counts are now true per-book.

### Fix 2 — Force per-book `author_context` so generators stop borrowing the wrong book

The BA-10 wrong-content bug isn't fixed by `book_id` alone — even with the right node row, `buildAuthorContext()` will still fall back to the only context row that exists.

- **Strict mode in `buildAuthorContext()`:** when `bookId` is provided AND no `author_context` row matches that book's title, **do not silently fall back** to the latest context. Instead, return `{ ctx: null, book, ... }` and have the generator either:
  - (a) Run with `ctx = null` (uses only `books` row metadata — safe, no cross-book bleed), or
  - (b) Return `failResponse("Run the book Analysis (BP-00) for this book first — Abby needs the framework before she can generate this node.")` for nodes that genuinely require framework intelligence (BA-10, BA-12, BA-13, YR-19, YR-22, YR-23, YR-25 — anything content-rich).
- Pick **(b)** for the framework-heavy nodes (those listed) and **(a)** for the rest. List goes inside `_shared/builder-helpers.ts` so it's one source of truth.
- Add a one-line **diagnostic field** in the generator response (`context_source: "book-specific" | "book-only-fallback" | "blocked"`) so we can see in logs which nodes ran on which context.

### Fix 3 — BP-03 "Unauthorized" already partially fixed; verify and unblock

The previous sprint moved `ContentGenerationStep.tsx` to `getActiveToken()` + `fetchWithTimeout(120s)` and surfaces real error text. That should already let Pauline generate BP-03 for the Invest book. Action here:
- Re-run BP-03 generation for the new book once Fix 1 is deployed (so the new row writes with `book_id = invest-id`), confirm a `content_ready` row appears scoped to that book, and confirm the toast no longer says "Unauthorized".
- No code change unless the test still fails.

### Fix 4 — Microsite "Go Deeper" reads the new column

`src/pages/AuthorBookPage.tsx` already queries `author_nodes` for live nodes. Change the filter from `eq("author_id", profile.id)` to:

```
.eq("author_id", profile.id)
.or(`book_id.eq.${bookData.id},book_id.is.null`)
```

This means:
- Per-book nodes (post-migration) appear only on their own book page.
- Legacy nodes (book_id null — shouldn't exist after backfill, kept as belt-and-braces for any edge created during the migration window) still appear so we never blank out a microsite mid-deploy.

### Fix 5 — Minor: status labelling

BP-01 and BP-03 are at `status = 'live'` and `'content_ready'` respectively but the user sees "Not Built" / "Step 4 — Publish". This is just the dashboard tile reading `current_step` instead of `status`. Add a small mapping in the Book Hub tile renderer:

```
status === 'live'                         → "Live"
status === 'content_ready'                → "Ready to publish (Step N)"
status null && current_step >= 1          → "In progress (Step N)"
otherwise                                 → "Not started"
```

So Pauline's BP-01 row reads "Live" not "Step 4 — Publish".

## Files that will change

**SQL migration**
- `add_book_id_to_author_nodes` migration: add column, FK, unique index, backfill.

**Edge functions**
- `supabase/functions/_shared/builder-helpers.ts` — strict context, book-keyed upsert/snapshot, framework-required node list.
- `supabase/functions/save-author-node/index.ts` — accept + key on `bookId` for save / load / publish / list-audio.
- All 28 generators in `supabase/functions/generate-*/index.ts` — pass `book_id` to `upsertAuthorNode()` / `snapshotAuthorNode()`. Most already destructure it; just thread it through the existing helper calls.
- `supabase/functions/setup-stripe-product/index.ts`, `deploy-yr25-to-thinkific/index.ts`, `deploy-bp05-to-ghl/index.ts` — same `book_id` filter on the lookup.

**Frontend**
- `src/lib/builder-autosave.ts` (and any direct `save-author-node` invokers) — pass `bookId`.
- `src/pages/AuthorBookPage.tsx` — `book_id` OR-null filter for the Go Deeper section.
- `src/pages/RevenueFullDashboard.tsx`, sidebar counter hook, Book Hub tile renderer — filter by current book + add the status→label mapping.
- `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx` and any other direct `author_nodes` writes — include `book_id`.

## What you'll see after

For Pauline opening **Invest Like Buffett for Parents** → Book Hub:

```
BP-02  Lead Magnet           Step 1 — Not started
BP-01  Email Marketing       Step 1 — Not started
BP-03  Social Media          Step 1 — Not started
BP-04  Author Website        Step 1 — Not started
BP-06  Workbook              Step 1 — Not started
BP-07  Home Study            Step 1 — Not started
BA-10  Online Course         Step 1 — Not started   ← previously wrong-content row stays on Be SUCKcessful
BA-11  Audiobook             Step 1 — Not started   ← previously bleeding from Be SUCKcessful
YR-19  1-on-1 Coaching       Step 1 — Not started
…all 28 nodes start fresh.
```

For **Be SUCKcessful** → Book Hub: every existing live/content_ready row stays exactly where it is. Nothing migrates away.

For any new author with one book: behaviour is unchanged (their single book gets all nodes, just like today).

## Validation checklist

1. Run migration → backfill assigns 22 Pauline rows + every other author's rows to their oldest book.
2. Sidebar counters: Pauline at root sees nothing flicker; on Be SUCKcessful sees `9/9 · 9/9 · 10/10` (or actuals); on Invest sees `0/9 · 0/9 · 0/10`.
3. Generate BA-10 for Invest → response includes `context_source: "blocked"` with a clear "run book analysis first" toast (until that book has its own author_context row).
4. Build BA-11 for Invest → new row written with `book_id = invest-id`, separate from the existing Be SUCKcessful BA-11 row; both books retain independent audiobook microsites.
5. `/pauline-teo/be-suckcessful-` Go Deeper still shows the existing 22 cards. `/pauline-teo/invest-like-buffett-for-parents` Go Deeper is empty until she builds nodes for it.
6. BP-03 generation for Invest succeeds (no "Unauthorized") and writes to the correct row.

## Out of scope for this sprint

- Cloning content from book A to book B (no "duplicate from Be SUCKcessful" button — authors regenerate per book).
- Backfilling `author_context` for a second book (Pauline still needs to run book analysis on Invest before content-rich BA/YR nodes will generate). I'll surface a clear toast so she knows.
- Visual redesign of the Book Hub tiles beyond the status→label mapping.
