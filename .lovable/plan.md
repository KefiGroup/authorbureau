## Root Cause

Two compounding regressions are stripping ✅ Live badges in the Book Hub category tabs.

**Cause 1 — Over-aggressive bookId scoping (Bugs 4, 5, 6).**
`useBookNodeProgress` now filters `author_nodes` by the *currently viewed* `book_id`. Pauline owns:
- "Be SUCKcessful" → `BA-14` live
- "Invest Like Buffett for Parents" → `BP-01` live, `BP-09` live

When viewing the "Be SUCKcessful" hub, `BP-01` (Email Marketing) is hidden because it lives under the other book's row, so the tile falls back to "Recommended". Same for `BA-14` when viewing the other book. But many nodes are inherently **author-level**, not book-level — there is one email list, one podcast show, one set of social channels per author. Scoping these by book is the wrong model.

**Cause 2 — BA-14 readiness gate too strict (Bug 6).**
Even after fixing scoping, `BA-14` would still show "Recommended" because `hasRequiredAssets("BA-14", ...)` requires `rss_url`/`transistor.show_id`. Pauline's row has 10 episodes and `activated: true`, but no RSS field is persisted by the current builder. Per memory `audits/manus-2026-04-23-corrections` the strict check is intentional, but it doesn't match what the BA-14 builder actually writes when an author marks the show live.

## Plan

### 1. Classify nodes as author-scoped vs book-scoped in `useBookNodeProgress`

Introduce a small classifier inside `src/hooks/useBookNodeProgress.ts`:

```ts
// Author-level nodes belong to the author, not a single book.
// Their Live status must show on every book's hub.
const AUTHOR_LEVEL_NODES = new Set([
  "BP-01", // Email Marketing
  "BP-03", // Social Media
  "BA-14", // Podcast (one show, multi-book episodes)
  "BA-15", // Press
  "BA-16", // Affiliates
  "BA-18", // JV Partners
  "YR-19","YR-20","YR-21","YR-22","YR-23",
  "YR-24","YR-25","YR-26","YR-27","YR-28",
]);
```

Change the query strategy: **always fetch all of the author's nodes**, then when building the status map, accept a row if either:
- the node is in `AUTHOR_LEVEL_NODES` (book_id ignored), OR
- `bookId` is unset, OR
- `row.book_id === bookId`.

This keeps book-specific products (BP-04 microsite, BP-06 workbook, BP-07 home study, BP-08 special edition, BP-09 book sales, BA-10 course, BA-11 audiobook, BA-12 membership, BA-17 bundles, BP-02 lead magnet, BP-05 webinar) correctly scoped to the active book — so BP-09 for "Invest Like Buffett for Parents" still won't show Live on the "Be SUCKcessful" hub (which is correct, since it's a different book's product).

### 2. Loosen BA-14 readiness gate to recognize the activated podcast state

In `src/lib/node-readiness.ts`, update the `BA-14` case to also pass when the author has explicitly activated the show with episodes:

```ts
case "BA-14": {
  const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
  const episodes = Array.isArray(content.episodes) ? content.episodes : [];
  const activatedWithContent =
    !!content.activated &&
    episodes.length > 0 &&
    !!(content.show_title || content.podcast_title);
  return (rssReady && episodes.length > 0) || activatedWithContent;
}
```

This keeps the strict path (RSS + episode) intact for distributed shows, but also accepts the "activated locally with show + episodes" state that the current BA-14 builder actually persists. Update memory `audits/manus-2026-04-23-corrections` after the fix to record the broadened criteria.

### 3. Verification

After the change, against current production data for `92326a2f-3ed0-4873-a8cf-7a0b1350995a`:

| Hub viewed | BP-01 | BP-09 | BA-14 |
|---|---|---|---|
| Be SUCKcessful | ✅ Live (author-level) | Recommended (different book — correct) | ✅ Live (author-level + activated gate) |
| Invest Like Buffett for Parents | ✅ Live (author-level) | ✅ Live (matches book_id) | ✅ Live (author-level + activated gate) |

This restores the three regressed badges (Bugs 4, 5, 6) without re-introducing the cross-book leakage that the original scoping fix was meant to prevent.

### Files touched

- `src/hooks/useBookNodeProgress.ts` — add classifier, switch to author-wide fetch + per-row scope check.
- `src/lib/node-readiness.ts` — broaden BA-14 gate.
- `mem://audits/manus-2026-04-23-corrections` — note the BA-14 broadening.

### Out of scope

- No DB changes; no edge function changes.
- Marketing Hub / Library scoping is unaffected (`AuthorLibrary.tsx` uses its own readiness check, not this hook).
