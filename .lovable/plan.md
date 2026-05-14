## Counter Consistency Audit

I traced every "X / 28" (and equivalent "built / live" counters) through the codebase and compared them against the canonical contract documented in `docs/02-business-rules/01-count-business-rules-v2.md`:

- **Canonical source**: `author-stats` edge function → `products.perBook[bookId].total` / `nodeIds`
- **Canonical gate**: `hasRequiredAssets()` from `supabase/functions/_shared/node-readiness.ts` (re-exported in `src/lib/node-readiness.ts`)
- **Canonical author/book split**: `AUTHOR_LEVEL_NODES` set in the same shared module

### Already consistent (no change)

- `useAuthorStats` — calls `author-stats` directly
- `useBookNodeProgress` — uses `author-stats.perBook[bookId].nodeIds` as the authoritative "completed" set, then overlays in-progress
- `useNodeLiveStats` — applies `hasRequiredAssets` to downgrade Live → content_ready
- `MultiBookPicker` (`{total}/28 streams built`) — uses `perBook.total`
- `BookSelectionView` (`{builtThisBook}/28`) — uses `perBook.total`
- `BookHubOverview` plan-status strip (`{progress.overallCompleted} built · {overallTotal}`) — uses `useBookNodeProgress`
- `MyBooks.tsx:302` (`analyzedCount * 28`) — denominator math, not a live count

### 4 Inconsistencies to fix

#### 1. `src/components/dashboard/review/LiveMicrositesGrid.tsx:112`
Says **"{liveNodes.length} of 28 nodes published"** but `liveNodes` is filtered to rows with a branded **microsite URL** (`pickPublicUrl` rejects audiobooks, lead magnets, courses, podcasts, etc.). On most authors this badly under-counts vs the dashboard.
- **Fix**: change the copy to **"{liveNodes.length} of {nodes.length} live nodes have a public link"** (i.e. denominate against actual live rows, not 28). This stops it from masquerading as the canonical X/28 counter.

#### 2. `src/pages/AuthorSite.tsx:344` — public hero "Products & Services" stat
`liveProductsCount` is computed from raw `status='live'` rows, with no `hasRequiredAssets` gate. It can disagree with the author's dashboard X/28.
- **Fix**: import `hasRequiredAssets` from `@/lib/node-readiness` and filter `liveNodes` through it before counting (still excluding `BP-01`/`BP-02` from the public storefront stat as today). Same readiness contract as the dashboard.

#### 3. `src/components/dashboard/BusinessFramework.tsx:119-128`
Passes `completedAssets={[]}` to `<ABBYFrameworkVisual>`, so the embedded "Your Monetization Map" panel always shows **"0 built"** regardless of the author's real progress. Visually contradicts the same dashboard's other counters.
- **Fix**: feed `ABBYFrameworkVisual` the canonical built set. Use `useAuthorStats(user.id)` and pass `Object.values(stats.products.perBook).flatMap(b => b.nodeIds)` as `completedAssets` (mapped through `NODE_CODE_MAP` reverse lookup so the visual's id keys match — same trick `useBookNodeProgress` already uses).

#### 4. `src/components/dashboard/ABBYFrameworkDashboard.tsx:175`
`planSummary.productsBuilt = planData.completedAssets?.length` uses abby-plan **asset_type strings** (e.g. `business_plan`, `lead_magnet`) — not the node-readiness gate. The inline comment on line 178 already flags the mismatch but the wrong number is still rendered as "Products Built".
- **Fix**: replace with the canonical value from `useAuthorStats` — `stats.products.totalPublished` for the all-books summary, or `stats.products.perBook[firstBook.id]?.total` for the per-book summary card. Drop the `completedAssets.length` path entirely.

### Out of scope

- No DB migrations, no edge-function changes, no readiness-gate edits.
- The label "of 28" stays only on counters whose denominator is genuinely the 28-node universe.
- Documentation: append a one-line note to `docs/02-business-rules/01-count-business-rules-v2.md` §4 reminding contributors that `LiveMicrositesGrid` denominates against live rows (not 28), so it's intentionally not an X/28 counter.

### Files touched

1. `src/components/dashboard/review/LiveMicrositesGrid.tsx` — relabel
2. `src/pages/AuthorSite.tsx` — apply `hasRequiredAssets` to `liveProductsCount`
3. `src/components/dashboard/BusinessFramework.tsx` — wire real `completedAssets`
4. `src/components/dashboard/ABBYFrameworkDashboard.tsx` — swap `productsBuilt` source
5. `docs/02-business-rules/01-count-business-rules-v2.md` — clarifying note

### Verification

- Run `bunx vitest run src/lib/__tests__/node-readiness.test.ts` (must stay green).
- Manually compare on `/dashboard` for a real author: the value in the plan-status strip, the BBY map ("X built"), `MultiBookPicker`'s `{total}/28`, and `LiveMicrositesGrid`'s number must all reconcile to one source — `author-stats.perBook`.
