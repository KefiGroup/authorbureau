
# Brand Tab — Final 2 Bug Fixes

## Diagnosis

I traced both bugs and found the **actual root causes** are different from what was suspected.

### Bug 1 — BP-05 Webinars false "Live" badge (data-store mismatch, NOT a stale row)

I queried the production database. For book "Be SUCKcessful" (`e5b857ac-...`):

| Table | Rows | Status | Content |
|---|---|---|---|
| `author_nodes` (node_id=BP-05) | 1 | `live` | 9.6 KB JSON with `webinar_topics`, `registration_page`, `follow_up_emails`, `promotion_strategy`, `recommended_webinar`, `abby_summary` |
| `webinars` table | **0** | — | — |

The Brand-tab card reads `author_nodes` via `useNodeLiveStats` and correctly shows **Live** (the row IS live with content, so the bookId-scoping fix did its job).

But `WebinarsManager.tsx` (the component the user lands on) queries the **`webinars` table**, not `author_nodes`. That table is empty for this book, so the UI shows the "Generate from AI Engine → Build My Business" empty state. The two components read from completely different data stores.

The previous AI-generated webinar content is sitting unused inside `author_nodes.content_json` and never gets surfaced in the Manager.

### Bug 2 — BP-06 Workbook back navigation (build is 9 days stale)

The console reports `Build: 2026-04-20T10:18:00Z`. Today is 2026-04-29. The previously deployed code (`buildNodeBuilderSearch`, synchronous param mirroring in `BookBuilderRoute`, `bookId`-aware back link in `NodeBuilder`) is correct in source — it just hasn't been built/deployed to production. Re-running the build will resolve it.

---

## Fixes

### Fix 1 — Surface AI-generated webinar content in WebinarsManager

When the `webinars` table is empty for the active book BUT an `author_nodes` row exists for BP-05 with `status in ('live','content_ready')` and a populated `content_json`, render a **read-only summary** of that AI content with three actions:
- **Edit content** → opens the BP-05 builder step 2 (review/edit step)
- **Promote to live webinar** → seeds a `webinars` row from `content_json.recommended_webinar` (title, description, suggested duration) so the Manager has a real record to schedule and publish
- **Regenerate** → re-runs the AI generator

Implementation:
- In `src/components/dashboard/WebinarsManager.tsx`, after `fetchWebinars()` returns 0 rows, also fetch the `author_nodes` BP-05 row scoped by `bookFilterId` (mirror BP-05Builder's edge-function-first approach via `save-author-node` action `load`, with a direct `author_nodes` fallback that ALSO filters by `book_id` — current fallback at lines 124–131 of `BP05Builder.tsx` does not, which is a parallel bug).
- If `content_json` has webinar data, render a new `<AIWebinarPreviewCard>` (new file: `src/components/dashboard/webinars/AIWebinarPreviewCard.tsx`) showing topic, abstract, target outcome, and the three action buttons above.
- "Promote to live webinar" inserts into `webinars` with `status='draft'`, `book_id=bookFilterId`, then triggers `fetchWebinars()`.

### Fix 2 — Patch the BP-05 builder direct-read fallback to filter by book_id

`src/components/dashboard/builders/bp05/BP05Builder.tsx` lines 124–131: the fallback `.from("author_nodes").select(...).eq("author_id", authorId).eq("node_id", "BP-05").maybeSingle()` will return ANY BP-05 row regardless of book. Add `.eq("book_id", bookId)` when `bookId` is present so a multi-book author never sees the wrong book's content.

### Fix 3 — Trigger a fresh build to deploy BP-06 fixes

The BP-06 routing/back-link logic is already correct in source. Force a redeploy by touching a file (no functional change) so the production bundle picks up:
- `buildNodeBuilderSearch` in `AuthorDashboard.tsx`
- Synchronous param mirroring in `BookBuilderRoute.tsx`
- `bookId`-preserving "Complete Book Profile" return URL and `/book-hub/{bookId}?tab=revenue-streams` back link in `BP06Builder.tsx`
- `bookId`-aware back link in `NodeBuilder.tsx`

After deploy, expected behavior for BP-06 launched from Brand tab:
1. URL: `/node-builder/BP-06?bookId={id}&bookTitle=...&builder=workbook`
2. Top back link: `← Back to Book Hub · Brand` → `/book-hub/{bookId}?tab=revenue-streams`
3. "Complete Book Profile" return URL preserves `bookId`.

---

## Files Changed

```text
src/components/dashboard/WebinarsManager.tsx          (load + render AI webinar fallback)
src/components/dashboard/webinars/AIWebinarPreviewCard.tsx  (new)
src/components/dashboard/builders/bp05/BP05Builder.tsx (book_id filter on fallback read)
.lovable/plan.md                                      (touch to force redeploy)
```

No DB migrations. No edge function changes (existing `save-author-node` `load` action already accepts `bookId`).

## Acceptance Test (after deploy)

| Scenario | Expected |
|---|---|
| Brand tab → Webinars tile (Be SUCKcessful) | Card shows ✅ Live; clicking opens Manager with AI-generated webinar preview + "Promote to live webinar" CTA |
| Click "Promote to live webinar" | New row in `webinars`, Manager reloads showing the editable webinar |
| Brand tab → Workbook tile | URL = `/node-builder/BP-06?bookId=…&bookTitle=…`; top link = `← Back to Book Hub · Brand`; clicking it returns to Brand tab |
| BP-06 "Complete Book Profile" button (no profile) | Return URL retains `?bookId=…` |
