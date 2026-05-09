## Sprint 56 — Per-Book Microsite Slug Collision (Sprint 8 follow-up)

### Why this matters

Sprint 8 made all 28 nodes book-scoped, but the public URL layer was never fully upgraded. Today only 2 of 6 authors have multiple books and no collision has fired in production — but four latent defects will fire the moment a multi-book author publishes the same node for two books.

### Defects found

**D1 — DB blocks per-book publishing (critical).**
`author_nodes` has `UNIQUE (author_id, node_id)`. An author with two books can only have **one** row per node, making it physically impossible to publish e.g. "Workbook" separately for Book A and Book B. This contradicts the per-book scoping rule.

**D2 — Routing gap (critical).**
`compute_node_microsite_url` emits `/{author}/{book}/{node}` when the book has a slug. But `App.tsx` route table maps `/:authorSlug/:bookSlug/:productType` → `AuthorProductPage`. So a 3-segment microsite URL is captured by the product page route, not the node microsite resolver. The node never renders.

**D3 — Resolver picks wrong row (high).**
`get-microsite-page` accepts only `?author=X&node=Y` (no book param) and returns the row sorted by `microsite_url DESC, updated_at DESC, LIMIT 1`. For a multi-book author this is arbitrary.

**D4 — Wrong book context displayed (high).**
Same edge function hardcodes `books → first published book by created_at ASC`. So even if the right node row is served, the rendered cover/title/description belongs to whichever book was published first, not the one the node is about.

**D5 — Legacy 2-segment URL is ambiguous by design.**
`compute_node_microsite_url` falls back to `/{author}/{node}` when book has no slug — currently impossible (all 8 books have slugs and `books.slug` is globally unique), but no guard prevents a future row from breaking this.

### Current data sanity (reference)

- 8 books / 6 authors / 2 multi-book authors / 0 duplicate book slugs / 0 live nodes with `book_id IS NULL` / 0 live nodes using legacy 2-segment URL.
- Migration is preventive — no data backfill required.

### Plan

**Step 1 — Migration: per-book uniqueness + book-aware resolver function**
- Drop `author_nodes_author_node_unique`.
- Add `UNIQUE (author_id, node_id, book_id)` (treats `book_id NULL` rows as distinct — acceptable; legacy author-level rows are already empty per Sprint 8 memory).
- Add partial unique index `(author_id, node_id) WHERE book_id IS NULL` to prevent a regression to author-level rows.
- Update `compute_node_microsite_url` to **always require** a `book_id` for nodes with a `microsite_slug` and return `NULL` otherwise (forces the 3-segment URL).
- No data backfill (current rows already conform).

**Step 2 — Routing: book-scoped node route**
- Add explicit React Router route **before** the product-page route:
  - `/:authorSlug/:bookSlug/:nodeSlug` → new `BookNodeResolver` that calls `MicrositePage` with `bookSlug` context.
- Keep `AuthorProductPage` route for known product slugs (workbook, home-study, course, …) — `BookNodeResolver` checks `SLUG_TO_NODE` first; falls through to product page on miss.

**Step 3 — `get-microsite-page`: book-aware lookup**
- Accept new optional query param `book` (book slug).
- When present:
  - Resolve `book.id` from `(author_id, slug)`.
  - Filter `author_nodes` by `(author_id, node_id, book_id)` → exact 1 row.
  - Fetch book context from that specific book, not "first published".
- Backward compatible: if `book` omitted, retain current best-row sort (with a `console.warn` log so we can spot legacy URLs in the wild).

**Step 4 — Client microsite fetcher**
- `MicrositePage` (and the `AuthorSubpageResolver` probe) pass `bookSlug` from the URL to `get-microsite-page` whenever it's available.

**Step 5 — Audit & verification**
- Add a new daily-audit check `multi_book_url_health`: warn if any `author_nodes.delivery_url` is 2-segment (`/{author}/{node}`) for an author with >1 book.
- Re-run `daily-audit` — expect green; `stuck_live` and `node_registry` checks unchanged.

### Out of scope

- BP-01/03/08/09 (excluded from public microsite URLs by `compute_node_microsite_url` whitelist) — unaffected.
- Funnels table (`funnels.slug`) — already author-scoped, no per-book change needed.
- Reader-side checkout / Stripe — unrelated.

### Files to touch

- `supabase/migrations/<new>.sql` — uniqueness swap + `compute_node_microsite_url` rewrite.
- `src/App.tsx` — insert book-scoped node route.
- `src/pages/BookNodeResolver.tsx` — new (small wrapper: known node → MicrositePage; else fall through to product page via `<Navigate>` or render product page directly).
- `supabase/functions/get-microsite-page/index.ts` — accept `book` param; book-scoped row + context lookup.
- `src/pages/MicrositePage.tsx` (and any helper that calls `get-microsite-page`) — forward `bookSlug`.
- `src/pages/AuthorSubpageResolver.tsx` — pass bookSlug if present; keep 2-segment legacy probe as fallback only.
- `supabase/functions/daily-audit/index.ts` — add `multi_book_url_health` check.
- `mem://architecture/per-book-node-scoping` — mark microsite slug follow-up as closed.
- `docs/04-node-frameworks/README.md` and `docs/01-architecture/01-master-architecture-reference.md` — note 3-segment canonical URL.

### Risks & mitigations

- **Route precedence** — the new `:nodeSlug` route must be ordered/guarded so it does not capture product slugs (workbook, home-study-bundle, course, members, webinar). `BookNodeResolver` solves this by gating on `SLUG_TO_NODE`.
- **Migration safety** — no rows currently violate the new tighter unique constraint; verified above. The drop+add is single-transaction.
- **Legacy 2-segment URLs in the wild** — none exist in DB today; the resolver keeps a backward-compatible code path with a log so we can detect any external links pointing to the old shape.
