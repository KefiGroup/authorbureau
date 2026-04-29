# Fix node routing, back-buttons, and false "Live" badges

## Root-cause findings

While auditing the three reported bugs, I confirmed the actual builder identities by reading each builder file's own `nodeId` constant and DB writes:

- **BP-06 = Workbook** (uses `workbook-pdf`/`workbook-docx`, writes `node_id="BP-06"`)
- **BP-07 = Home Study Course** (writes `node_id="BP-07"`)
- **BP-08 = Special Editions** (writes `node_id="BP-08"`)
- **BP-09 = Book Sales** (writes `node_id="BP-09"`)

Two places in the codebase contradict that ground truth:

1. `src/pages/AuthorDashboard.tsx` — the `workbooks` case mounts the legacy `WorkbooksManager` instead of routing to the BP-06 builder. (`home-study`, `book-sales`, `special-editions` cases are already correctly routed to BP-07/09/08.)
2. `src/hooks/useBookNodeProgress.ts` — `NODE_CODE_MAP` has these four nodes inverted:
   - `workbooks` → `BP-07`  (should be `BP-06`)
   - `home-study` → `BP-08`  (should be `BP-07`)
   - `special-editions` → `BP-09`  (should be `BP-08`)
   - `book-sales-events` → `BP-06`  (should be `BP-09`)

This second issue is **the real cause of Bug 3**. Whenever any of these builders writes a `live`/`content_ready` row to `author_nodes`, the dashboard reads that row through the inverted map and lights up the wrong card. The "BP-05 Webinars is Live but empty" report is a symptom of this mis-attribution: a different node's status is being painted onto a neighbouring card. Fixing the map removes the false badge without changing BP-05's logic.

## Bug 1 — Workbook card opens the wrong builder

**File:** `src/pages/AuthorDashboard.tsx` (line ~445)

Replace the `workbooks` case so it redirects to the BP-06 builder, matching the pattern already used for `home-study`, `book-sales`, and `special-editions`:

```tsx
case "workbooks":
  return <Navigate to="/node-builder/BP-06" replace />;
```

The legacy `WorkbooksManager` import can stay for now (other surfaces may still link to it); we're only changing the section route the Brand tab uses.

## Bug 2 — "Back to Brand Products" lands on My Books

**Files:** `BP06Builder.tsx`, `BP07Builder.tsx`, `BP08Builder.tsx`, `BP09Builder.tsx`

Each builder currently calls `navigate("/brand-products")` in its `BuilderHeader onBack`. `/brand-products` is handled by `HubRedirect`, which falls back to `/dashboard?section=my-books` when `useBookContext` hasn't resolved a book yet (cold-session race).

Apply the BP-05 pattern to all four builders (each already receives `bookId` as a prop and has access to `useNavigate`):

```tsx
onBack={() => navigate(
  bookId
    ? `/book-hub/${bookId}?tab=revenue-streams`
    : "/dashboard?section=my-books"
)}
```

For BP-09 the same change applies to its second `onBack` reference at line ~207.

## Bug 3 — BP-05 Webinars shows "Live" with no content

The card-level status comes from `useBookNodeProgress`, which buckets `author_nodes` rows by `NODE_CODE_MAP[node.id]`. Because the map is inverted for BP-06/07/08/09, a row written by (for example) BP-09 Book Sales when the author touches it lands in the bucket the UI reads as the *Workbook* or *Home Study* card, while another row can shift onto BP-05's neighbouring tile. The user-visible result is a "Live" badge on a builder that has never been opened.

**Fix:** correct `NODE_CODE_MAP` in `src/hooks/useBookNodeProgress.ts` so it matches what the builders actually write:

```ts
"book-sales-events": "BP-09",
workbooks:           "BP-06",
"home-study":        "BP-07",
"special-editions":  "BP-08",
```

No other changes are needed in `useBookNodeProgress` — the `completed`/`in-progress` derivation logic is correct; it was just being fed the wrong key for these four nodes.

After this change, BP-05's badge will only flip to "Live" when an actual `BP-05` row exists with `status` of `live` or `published_pending_ghl`, which matches the requested behaviour ("Ready to Build" until content is generated and published).

## Verification checklist

After the edits:

1. Brand tab → click **Workbook** card → opens `/node-builder/BP-06` (Workbook builder, not the Home Study generator).
2. Inside BP-06/07/08/09 → click "Back to Brand Products" → returns to `/book-hub/<bookId>?tab=revenue-streams` (not My Books).
3. For an author with no BP-05 content, the **Webinars** card shows "Ready to Build" instead of "Live".
4. Spot-check that an existing live workbook/home-study/special-edition/book-sales row now lights up the *correct* card (the previously-inverted map was masking this).

## Files changed

- `src/pages/AuthorDashboard.tsx` — workbooks case redirects to BP-06
- `src/hooks/useBookNodeProgress.ts` — fix four inverted entries in `NODE_CODE_MAP`
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — book-aware back button
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — book-aware back button
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — book-aware back button
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — book-aware back button (two call sites)
