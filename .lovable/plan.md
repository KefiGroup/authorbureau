# Make Book Hub architecture truly dynamic per stage

The Brand / Build / Yield pages already pull node status from `author_nodes` via `useBookNodeProgress`, but several visible elements are still static placeholders that don't change based on a node's real stage. This plan replaces every remaining placeholder with data driven by the node's actual state, the user's tier, and aggregate progress.

## What's static today (and shouldn't be)

1. **Card economics** — `SmartProductCard` shows revenue, time-to-build, and difficulty from a hardcoded `BASELINE_REVENUE` map. Same numbers regardless of whether the node is locked, in progress, or live.
2. **In-progress %** — `progressPercent` prop exists but is never passed, so the progress bar never appears for nodes in `draft` / `content_ready`.
3. **Published stats** — `stats.views` / `stats.sales` props exist but are never wired, so live nodes never show real performance.
4. **Category headline revenue** — strings like "$5,520 – $15,480 /yr potential" in `PortfolioStepView` are hardcoded per category, not summed from the actual nodes the user has unlocked / built.
5. **Plan Status Strip unlock counts** — "9 / 18 / all 28" hardcoded by tier in `BookHubOverview`, not derived from real gating × tier.
6. **Recommended-step copy** — `personalizedDescription` never set, so the "recommended" card just shows generic node description.
7. **NextStepCard empty state** — hardcoded emerald colours regardless of which stage you're in.
8. **Hero "Continue" CTA** — uses generic secondary color, doesn't carry the stage accent of the next node.

## Changes

### A. Drive economics from node stage + DB (`SmartProductCard.tsx`)

- Keep `BASELINE_REVENUE` only as a fallback.
- Accept new optional props: `liveRevenue?: number`, `viewsCount?: number`, `salesCount?: number`, `lastActivityAt?: string`.
- Render rules per state:
  - `published` → show real `liveRevenue || 0`, real `viewsCount`/`salesCount`, "Last updated …".
  - `in-progress` → hide $/yr; show `progressPercent` bar + "Continue from step N" if available.
  - `available` / `recommended` → show baseline estimate (today's behaviour) but label clearly as "Potential".
  - `locked` → grey out economics, show "Unlocks at X tier".
  - `coming-soon` → hide economics row entirely.

### B. New hook `useNodeLiveStats(authorId)` 

Single batched query:

```ts
// pseudocode
select node_id, status, progress_percent, view_count, sale_count, revenue_total, updated_at
from author_nodes where author_id = $1
```

Returns `Record<nodeCode, LiveStats>`. Consumed by `PortfolioStepView` and `BookHubOverview` so we don't N+1.

If `view_count` / `sale_count` / `revenue_total` columns don't yet exist on `author_nodes`, fall back to 0 (no migration in this pass — additive only).

### C. Wire live stats into `PortfolioStepView`

In the SmartProductCard mapping, pass:
```ts
liveRevenue={live[n.code]?.revenue_total}
viewsCount={live[n.code]?.view_count}
salesCount={live[n.code]?.sale_count}
progressPercent={live[n.code]?.progress_percent}
personalizedDescription={isNext ? buildRecommendationCopy(n, catProgress) : undefined}
```

`buildRecommendationCopy` is a small util that returns stage-aware copy:
- "Start here — fastest path to your first $X in {category}"
- "Continue: {N}% done, ~{minutes} left"
- "Builds on your published {previousNode.label}"

### D. Dynamic category headline revenue (`PortfolioStepView`)

Replace hardcoded `headline.revenue` with a sum across the category's actually-available nodes:

```ts
const potential = catProgress.nodes
  .filter(n => n.state !== "locked" && n.state !== "coming-soon")
  .reduce((sum, n) => sum + (BASELINE_REVENUE[n.id]?.annual || 0), 0);
const earned = sum of liveRevenue for published nodes in this category;
// header now reads: "$X earned · $Y potential remaining"
```

### E. Dynamic Plan Status Strip (`BookHubOverview`)

Replace the hardcoded `"9" / "18" / "all 28"` with real counts from `progress`:

```ts
const unlocked = Object.values(progress.byCategory)
  .flatMap(c => c.nodes).filter(n => n.state !== "locked" && n.state !== "coming-soon").length;
const total = progress.overallTotal;
// "Yield Plan active — {unlocked} of {total} builders unlocked · {overallCompleted} built"
```

### F. NextStepCard accent + stage awareness

- Empty state uses `accent.gradientCard` / `accent.text` instead of hardcoded emerald, so the "all caught up" panel matches the stage.
- Add a small `next-up hint` line: "Up next in this stage: {nextNextNode.label}" when there's a node after the recommended one.
- For locked nodes, show which tier unlocks them and link to `/account-settings?tab=billing`.

### G. Hero strip stage colour on "Continue" card

In `BookHubHeroStrip`, replace the fixed `bg-secondary` button with the accent of `next.category` so the CTA visually matches where the user is heading.

### H. Smarter `nextStep` selection (`useBookNodeProgress`)

Currently picks first in-progress, else first available. Add tie-breakers:
1. Prefer nodes whose prerequisites are completed (e.g. BP-04 microsite before BP-02 lead magnet).
2. Within Brand subcategory, prefer "Branding & Marketing" group before "Digital Products" group.
3. Across categories, only surface Build/Yield as global `topNextSteps` once Brand has ≥ 3 completions (otherwise keep focus on Brand).

This makes the Hero strip's "Continue" and the per-stage "Next Step" reflect actual UX intent, not just sequence number.

## Files touched

- `src/hooks/useBookNodeProgress.ts` — smarter next-step + prerequisite logic
- `src/hooks/useNodeLiveStats.ts` — **new**, batched live-stats fetch (with graceful fallback if columns are absent)
- `src/components/dashboard/SmartProductCard.tsx` — accept live stats; render rules per state
- `src/components/dashboard/PortfolioStepView.tsx` — wire live stats, dynamic headline revenue, recommendation copy util
- `src/components/dashboard/book-hub/BookHubOverview.tsx` — dynamic Plan Status Strip counts
- `src/components/dashboard/book-hub/NextStepCard.tsx` — accent-aware empty state, "up next" hint
- `src/components/dashboard/book-hub/BookHubHeroStrip.tsx` — stage-coloured Continue CTA
- `src/lib/recommendation-copy.ts` — **new**, small pure helper for stage-aware copy

## Out of scope

- No DB migrations. We read whatever columns exist on `author_nodes` today and fall back to 0/undefined when missing. A follow-up sprint can add `view_count` / `sale_count` / `revenue_total` rollups if they aren't already populated.
- No changes to the tabs structure or routing.
- No visual redesign — same namecard layout, just real numbers in it.

## Acceptance

- A node with status `live` shows real views/sales (or "—" if 0), no more "$3,940/yr" placeholder unless that's its baseline estimate.
- A node with status `draft` shows a progress bar and "Continue" CTA; no $/yr line.
- A `locked` node shows greyed economics + correct tier name pulled from gating.
- Plan Status Strip count matches the number of cards that actually render as non-locked.
- Category header revenue updates as the user publishes nodes.
- "Your Next Step" picks the truly logical next node (microsite → lead magnet → email, etc.), not just the lowest sequence number.
