## Audit #1 — Brand Tab (BP-01 → BP-09)

### Ground-Truth Snapshot (from `author_nodes`, current book = "Be SUCKcessful")

| BP # | Node | DB Status | Has Content | Issue |
|------|------|-----------|-------------|-------|
| BP-01 | Email Marketing | live | ✅ 7 keys | OK |
| BP-02 | Lead Magnets | live | ✅ 18 keys | OK |
| BP-03 | Social Media | content_ready | ✅ 5 keys | OK (not Live) |
| BP-04 | Website | content_ready (this book) | ✅ 8 keys | OK on this book; **3 OTHER books have stale `live` rows with key_count=1** (data quality, not UI) |
| BP-05 | Webinars | live | ✅ 8 keys | OK after last fix |
| BP-06 | Workbook | live | ✅ 19 keys | OK |
| BP-07 | Home Study | live | ✅ 18 keys | OK |
| BP-08 | Special Editions | live | ✅ 14 keys | OK |
| BP-09 | Book Sales | live | ✅ 10 keys | OK |

### Findings

**Finding 1 — Stale BP-04 "live" rows on 3 other books (key_count=1)**
Three books own a BP-04 row with `status='live'` but `content_json` of only 1 key — almost certainly only `microsite_url` set by the autofill trigger. Today `useBookNodeProgress` already requires `content_json` keys > 0, so a 1-key row counts as "completed". This is the cross-cutting "isLive without real content" bug class flagged in Audit #5.

→ Tighten the **isLive gate for BP-04** specifically: require at least one substantive content field (e.g. `hero_headline`, `hero_subheadline`, `about_long`, `lead_magnet_id`, `sections`) — not just the autofilled `microsite_url`. Apply the same gate in both `useBookNodeProgress` and `useNodeLiveStats`.

**Finding 2 — Workbook (BP-06) launch path uses `location.search` (not `buildNodeBuilderSearch`)**
Line 465 in `AuthorDashboard.tsx`:
```
case "workbooks":
  return <Navigate to={`/node-builder/BP-06${buildNodeBuilderSearch(location)}`} replace />;
```
This *is* now using the helper (good — last sprint's fix is in). But sibling nodes still use raw `location.search` (BP-08, BP-09, BP-02, BA-12, BA-13, YR-20, BP-01). When a user lands on these via `?section=...` without `bookId` in the query, the back link falls back to "Back to Dashboard". Standardize all 8 redirects on `buildNodeBuilderSearch(location)` to guarantee `bookId` is mirrored from path/context.

**Finding 3 — All Brand-tab Live badges currently match content (no false positives) for the active book.** No changes needed in `hasRequiredAssets` for BP-01..BP-09 today, **but** add a strict-content gate for BP-04 to future-proof.

### Fixes (Audit #1 only)

1. **`src/hooks/useBookNodeProgress.ts`** — Add a per-node strict-content predicate so BP-04 with only an autofilled `microsite_url` does not count as completed/in-progress mistakenly. Use it instead of the generic `Object.keys(...).length > 0` gate for nodes in the gate registry.

2. **`src/hooks/useNodeLiveStats.ts`** — Extend `hasRequiredAssets` to include a BP-04 case checking for at least one of: `hero_headline`, `hero_subheadline`, `about_long`, `sections`, `lead_magnet_id`, `cta_label`. Other Brand nodes default-pass (their builders write rich content_json on save).

3. **`src/pages/AuthorDashboard.tsx`** — Standardize all node-section redirects (BP-01, BP-02, BP-08, BP-09, BA-12, BA-13, YR-20) to use `buildNodeBuilderSearch(location)` instead of raw `location.search`. This guarantees `bookId` is mirrored from `?bookId=`/path params even when the user lands via legacy `?section=...` URLs.

4. **Data hygiene SQL migration** — Mark the three orphan BP-04 rows (`book_id` ∈ the 3 IDs above, `status='live'`, `key_count=1`) as `status='content_ready'` so the dashboard reflects truth. Confirmed before edit.

### Re-Test Plan (after fixes)

For each BP-01 → BP-09:
1. Open Book Hub Brand tab for "Be SUCKcessful".
2. Confirm badge matches the ground-truth table above.
3. Click tile → URL must contain `?bookId=...&bookTitle=...`.
4. Top header reads exactly "← Back to Book Hub · Brand".
5. Click back → lands on `/book-hub/<id>?tab=revenue-streams`.
6. Switch to a book where BP-04 was a stale `live` row → badge must now be "Recommended" / "In progress", not "Live".

Pass/fail report posted before moving to Audit #2.

### Then proceed in sequence

Per your direction: only after Audit #1 is fully green do we move to **Audit #2 (Build tab)**, and so on through the menu.
