## Audit 10 — Cross-Node Consistency

Goal: every one of the 28 nodes must behave identically — same back-link wording, same badge rules, same URL shape, same canonical name everywhere. A single inconsistency fails the audit.

### Findings

**Already passing (verified during exploration):**

- Canonical `/node-builder/:nodeId` route in `src/pages/NodeBuilder.tsx` already routes back via `getHubLabel` → `Book Hub · Brand|Build|Yield`, and `getHubPath` preserves the right tab + bookId.
- `buildNodeBuilderHref()` in `src/lib/node-builder-nav.ts` enforces `?bookId=…` on every sibling-node hop.
- Live-badge logic in `src/hooks/useBookNodeProgress.ts` is bookId-scoped, requires both `status === "live"` AND `hasRequiredAssets()` — empty content can never show Live.
- Products Built counter uses bookId-scoped `centralStats.products.perBook[bookId]`.
- Public-page slugs match `/[author-slug]/[product-slug]` per the `compute_node_microsite_url` DB function.

**Failures needing a fix:**

1. **BA-11 mislabeled.** `builderNodeConfig.ts` says "Home Study Course" — collides with BP-07. Builder code, audiobook memory rule, and DB slug all say **"Audiobook"**. → Update config to `Audiobook`, emoji `🎧`, icon `Headphones`.

2. **BA-17 label drift.** Config: "Upsells". Builder header: "Upsells / Downsells". DB slug: `bundles`. User decision: canonical name = **"Bundles"**. → Update config label to `Bundles` and the BA17 builder header to match.

3. **`BookBuilderContextBar.tsx` shows bare "Back to Book Hub".** Audit explicitly requires the category suffix. → Append `· Brand` / `· Build` / `· Yield` based on the resolved tab (`revenue-streams` → Brand, `marketing-channels` → Build, `authority-builders` → Yield, `overview` → no suffix).

4. **`NodeBuilder.tsx` "Coming Soon" fallback.** When a node id has no registered builder, the fallback button says "Back to Dashboard" and routes to `/dashboard`. → Reuse the same `getHubPath` / `getHubLabel` so the fallback also returns to the correct Book Hub tab. Also: every registered node already has a builder, so the fallback is mostly defensive.

### What we will change

#### Block 1 — Fix canonical node names

- `src/components/dashboard/builders/builderNodeConfig.ts`
  - BA-11: `label: "Audiobook"`, `icon: "Headphones"`, `emoji: "🎧"`
  - BA-17: `label: "Bundles"`, keep `icon: "BarChart3"`, `emoji: "📈"`

- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
  - Replace the header `"Upsells / Downsells"` with `"Bundles"` (line 102) and the toast `"Your Bundles page is live on your site."` is already correct. Update `nodeName: "Upsells & Downsells"` in the `autosaveBuilderDraft` call (line 76) to `"Bundles"`.

- Sweep for any other UI string `Upsells & Downsells` or `Upsells / Downsells` and replace with `Bundles`. Same for any string `Home Study Course` paired with `BA-11` (BP-07's identical label stays).

#### Block 2 — Add category suffix to legacy `BookBuilderContextBar`

- `src/components/dashboard/BookBuilderContextBar.tsx`
  - Add a small `getSuffix(tab)` mapping: `revenue-streams` → "Brand", `marketing-channels` → "Build", `authority-builders` → "Yield", anything else → null.
  - Render `Back to Book Hub{suffix && ` · ${suffix}`}`.
  - No prop changes; the existing `backTab` prop already gets aliased through `BACK_TAB_ALIASES`.

#### Block 3 — Harden `NodeBuilder.tsx` Coming Soon fallback

- Replace the bare `<button>` with a `<Link to={getHubPath(nodeId, bookId, from)}>` rendering `Back to {getHubLabel(nodeId, bookId, from)}`.
- Same back-link styling as the active path so users can't tell which path they're on.

#### Block 4 — 8-Level QA verification

- L1 Console/Network: load Book Hub for a real book, open one node from each tab (BP-03, BA-11, YR-22), expect zero red errors / failed requests.
- L2 Buttons: click each back button → returns to correct tab.
- L3 Empty states: a node with no `author_nodes` row shows ⭐ Recommended, never ✅ Live (already enforced by `useBookNodeProgress`).
- L4 Data flow: rename strings only, no DB writes — verify by reading existing rows that nothing renders the old labels.
- L5 Mobile (375px): back-link wraps cleanly on the Book Hub card.
- L6 Auth: incognito visit to `/node-builder/BA-11?bookId=…` → redirected by existing auth guard.
- L7 Errors: invalid `nodeId` (e.g. `/node-builder/BP-99`) → new fallback now offers correct Book Hub link, not "Back to Dashboard".
- L8 Navigation: back link + sibling-node nav both work; no dead ends.

### Files we will touch

```text
EDIT  src/components/dashboard/builders/builderNodeConfig.ts   (BA-11, BA-17 labels)
EDIT  src/components/dashboard/builders/ba17/BA17Builder.tsx   (header + nodeName)
EDIT  src/components/dashboard/BookBuilderContextBar.tsx       (category suffix)
EDIT  src/pages/NodeBuilder.tsx                                (fallback back-link)
```

No DB migrations. No edge function changes. No public-URL slug changes (BA-17 stays `/bundles`, BA-11 keeps the audiobook flow it already uses).

### Memory update at the end

Append to `mem://core` (or refresh the Canonical Node Names rule): explicitly list **BA-11 = Audiobook** and **BA-17 = Bundles** so future generators don't re-introduce the drift.

### Expected report

```text
LEVEL 1: PASS
LEVEL 2: PASS
LEVEL 3: PASS  (badge gate already correct)
LEVEL 4: PASS  (renames only)
LEVEL 5: PASS
LEVEL 6: PASS  (existing auth guard unchanged)
LEVEL 7: PASS  (fallback no longer dead-ends)
LEVEL 8: PASS
OVERALL: PASS
```
