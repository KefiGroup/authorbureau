## Bug — Dashboard book card undercounts when nodes are author-level

### Root cause (verified)
Two different counters use two different scoping rules for the same `author_nodes` table:

| Source | Scoping |
|---|---|
| **Book Hub tabs** (`useNodeLiveStats` + `useBookNodeProgress`) | Author-level nodes (BP-01, BP-03, BA-14, BA-15, BA-16, BA-18, YR-19…YR-28) count toward **every** book in the library. Book-specific nodes use `book_id`. Source of truth: `AUTHOR_LEVEL_NODES` in `src/lib/node-readiness.ts`. |
| **Dashboard book card** (`useAuthorStats` → `author-stats` edge function `perBook`) | Strict `book_id` match, with fallback only to the **primary (oldest) book** when `book_id` is null (`supabase/functions/author-stats/index.ts:352-355`). |

So for the non-primary book "Be SUCKcessful":
- All YR-* nodes (10) are author-level → Book Hub counts them; dashboard card attributes them only to "Invest Like Buffett for Parents" (the primary/oldest book) → undercount of ~2 in Brand and ~2 in Build is consistent with author-level BP-01/BP-03 + BA-14/BA-15 being attributed to the primary book.
- The Yield 10/10 happens to match in your screenshot because Pauline's primary book has all 10 YR's attributed to it; the secondary book is missing them in the dashboard breakdown but happens to coincidentally match because... wait, screenshot actually shows Yield 10/10 on both books, meaning the edge function may already be partially fanning yield out. Actual Brand 6/9 vs 8/9 and Build 6/9 vs 8/9 deltas point exactly at author-level Brand+Build nodes (BP-01, BP-03, BA-14, BA-15, BA-16, BA-18) being missed for the secondary book.

### Fix
Update `supabase/functions/author-stats/index.ts` to mirror `AUTHOR_LEVEL_NODES` semantics: when a built `author_nodes` row's `node_id` is in the author-level set, attribute it to **every book** in the author's library, not just to its `book_id` / `primaryBookId`.

Concretely, rewrite the attribution block (around lines 350-358):

```typescript
// Author-level node ids that count toward every book — must mirror
// src/lib/node-readiness.ts AUTHOR_LEVEL_NODES exactly.
const AUTHOR_LEVEL_NODES = new Set<string>([
  "BP-01", "BP-03", "BA-14", "BA-15", "BA-16", "BA-18",
  "YR-19","YR-20","YR-21","YR-22","YR-23","YR-24","YR-25","YR-26","YR-27","YR-28",
]);

for (const n of builtRows) {
  if (AUTHOR_LEVEL_NODES.has(n.node_id)) {
    // Author-level: applies to every book in the author's library.
    for (const b of allBooks) ensureBookSet(b.id).add(n.node_id);
  } else {
    // Book-specific: scope strictly to its own book, fallback to primary
    // for legacy rows that pre-date book_id stamping.
    const bid = n.book_id || primaryBookId;
    if (bid) ensureBookSet(bid).add(n.node_id);
  }
}
```

Also do the same fan-out for the product-table loop where `nodeIdForTable` is in `AUTHOR_LEVEL_NODES` (e.g., `coaching_packages` → `YR-19`, `email_flows` → `BP-01`, `social_media_content` → `BP-03`):

```typescript
if (nodeIdForTable) {
  if (AUTHOR_LEVEL_NODES.has(nodeIdForTable)) {
    for (const b of allBooks) ensureBookSet(b.id).add(nodeIdForTable);
  } else {
    const bookId = isAuthorScoped ? primaryBookId : (row as any).book_id;
    if (bookId) ensureBookSet(bookId).add(nodeIdForTable);
  }
}
```

### Side effects
- Aggregated `totalBuilt` (sum across `perBookNodeSets`) will now double-count author-level nodes across books. Fix by computing the dedupe-aware aggregate from `builtNodeIds.size + product-table-only nodes` instead of summing perBook sets. Quick patch: leave `totalBuilt` derived from product tables (current behaviour) and stop using `aggregatedFromNodeSets` if it relied on summing across books.

### Files touched
- `supabase/functions/author-stats/index.ts` — single file, ~25 lines changed.

No DB migration, no client changes (the hook already consumes `perBook[bookId]`).