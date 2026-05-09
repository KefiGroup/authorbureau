---
name: Per-Book Node Scoping (Sprint 8 + Sprint 56)
description: All 28 nodes are book-scoped. Sprint 56 closed the microsite slug collision follow-up.
type: feature
---

All 28 nodes are book-scoped. `AUTHOR_LEVEL_NODES` is empty. Email/Social content is per-book; channel connections are shared.

**Sprint 56 — Microsite URL collision closed:**

- DB: `author_nodes` UNIQUE is `(author_id, node_id, book_id)`. A partial unique index on `(author_id, node_id) WHERE book_id IS NULL` blocks regression to author-level rows.
- URL emission: `compute_node_microsite_url` ALWAYS returns 3-segment `/{author}/{book}/{node}` or NULL — the legacy 2-segment fallback is removed.
- Routing: `/:authorSlug/:bookSlug/:nodeSlug` → `BookNodeResolver` (renders `MicrositePage` for known node slugs, falls through to `AuthorProductPage` otherwise).
- Edge fn: `get-microsite-page` accepts `?book=<slug>` to filter `author_nodes` by `(author, node, book)` and to load that book's context (cover, title, etc). Legacy 2-segment calls log a console.warn.
- Audit: `daily-audit.multi_book_url_health` warns if any multi-book author has a live node with a 2-segment `delivery_url`.

Excluded from public microsites: BP-01, BP-03, BP-08, BP-09.
