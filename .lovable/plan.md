## Goal

Make every node card on the dashboard reflect its true state — including the **"🔨 Building 60%"** state for any node sitting at `status='content_ready'` or `'draft'`. Today: BP-05 Webinars, BP-09 Book Sales, BA-10 Online Course, BA-12 Memberships (and any future content_ready node) all incorrectly render as **"Ready to Build"**.

## Root cause

Two read-side hooks feed the cards. Both have gaps that silently drop `content_ready` rows for some accounts/timing:

1. `useNodeLiveStats` **never auto-refreshes**. After you generate content in a builder and come back, the cached map from page-load (which had no rows for those nodes) wins until the user manually triggers a restart.
2. `useBookNodeProgress` in-progress overlay queries `author_profiles` by `auth.uid()` from the local Supabase client. For PublishNow / SSO sessions whose JWT briefly desyncs, this lookup returns null, so the overlay query is skipped entirely — the completed set still works (it goes through `author-stats` with proper canonical resolution) but the in-progress overlay does not.
3. The fallback default in `legacyHasRequiredAssets` returns `true` for any non-empty `content_json`, so once a builder eventually flips to `live` it skips through "Building" straight to ✅ Live — undermining the very state we're trying to surface.

## Fix (platform-wide, not per-node)

### 1. `src/hooks/useNodeLiveStats.ts`
- Add `visibilitychange` + `focus` listeners → call `setTick(t+1)` so returning from a builder always re-pulls fresh `author_nodes`.
- Add a 30s polling fallback while the tab is visible.
- Resolve author_id through **all sibling profiles** matching `pen_name` (mirror what `author-stats` does) so SSO accounts always find their rows.

### 2. `src/hooks/useBookNodeProgress.ts`
- Same sibling-profiles widening on the in-progress overlay query (`.in("author_id", allProfileIds)` instead of `.eq("author_id", profile.id)`).
- Same focus / visibility refresh hook.

### 3. `src/components/dashboard/PortfolioStepView.tsx`
- On window focus, call `progress.refresh()` and `refreshLiveStats()` together so user-perceived refresh actually refreshes the data.

### 4. `supabase/functions/_shared/node-readiness.ts`
- Tighten the `default` branch: nodes without an explicit case AND no `library_asset` return **false**. This keeps `content_ready` rendering as 🔨 Building 60% until the builder writes the canonical `library_asset` on publish — same uniform contract as every other node.
- Affects BP-05, BP-08, BA-16, BA-18 (the four nodes that fall through the legacy switch).

### 5. Dev-only diagnostic
- One-line `console.debug` in `useNodeLiveStats` listing `(authorId, bookId, content_ready node ids)` when `import.meta.env.DEV` — so we can verify visually in the browser that the overlay sees BP-05/BP-09/BA-10/BA-12 next time.

## Result

Every node currently sitting at `content_ready` will render uniformly:

- Badge: **🔨 Building**
- Subtext: "60% complete — continue where you left off"
- Teal progress bar at 60%
- CTA: "Continue Building →" with a "Restart build" link

…and updates within seconds of returning to the dashboard, no hard-refresh needed.

## Out of scope
- Builder-side publish flow (already writes the rows correctly).
- `author-stats` edge function (its completed set is correct).
- Visual styling (frozen by Visual Design Freeze).
