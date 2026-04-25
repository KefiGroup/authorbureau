## Goal

Redesign the Book Hub page (Analysis tab) and the three category tabs (Brand, Build, Yield) into a clean, dynamic, sequence-driven workspace that smartly guides the user through the build journey based on what they have already completed — bringing back the previous "BP-01 → BP-02 → …" guided flow inside each book.

## Current Problems

1. **Analysis tab is overloaded** — Abby's snapshot, recommended sequence, plan tabs, manuscript upload, market snapshot, and pricing CTAs all stacked into one long scroll. Hard to scan.
2. **Brand / Build / Yield tabs are static** — they show all 9–10 product cards with the same priority no matter what the user has built. No "what's next" signal.
3. **No clear next action** — user lands on the page and has to read paragraphs of intro copy to figure out where to click.
4. **Sequence is hidden in copy** — the BP-01 → BP-02 progression exists in the data (`sequence` field) but is not surfaced as a visual journey.
5. **Status not reflected at a glance** — completed / in-progress / locked states exist but are buried inside cards mixed with copy.

## Proposed UX

### 1. Analysis tab — clean three-zone layout

```text
┌─────────────────────────────────────────────────────┐
│  HERO STRIP                                         │
│  Cover · Title · Genre · "X of 28 products built"   │
│  Progress bar across Brand/Build/Yield              │
│  [Continue Where You Left Off →]   (next node CTA)  │
├─────────────────────────────────────────────────────┤
│  ABBY'S SNAPSHOT (collapsed by default if analyzed) │
│  One-liner summary + "View full plan" expander      │
│  Refine with Abby · Download .docx                  │
├─────────────────────────────────────────────────────┤
│  YOUR NEXT 3 STEPS  (dynamic, picks first 3 not-    │
│  completed nodes from full 28 in sequence order)    │
│  • #5  Quick-Start Workbook  · BP-06 · Build Now →  │
│  • #6  Home Study Course     · BP-07 · Build Now →  │
│  • #7  Online Course         · BA-10 · Locked       │
└─────────────────────────────────────────────────────┘
        + Market Snapshot (kept, lower priority)
```

- Manuscript upload moves into a small inline button on the snapshot, not a full row.
- Pricing tiles only appear for tier=`free`. For paid tiers we show "X of Y in your plan unlocked".
- "Continue Where You Left Off" jumps directly to the lowest-sequence node that is `in-progress`, otherwise the next `available` node.

### 2. Brand / Build / Yield tabs — guided journey view

Each tab becomes a single sequenced rail rather than three sub-category blocks of equal weight.

```text
┌─────────────────────────────────────────────────────┐
│  CATEGORY HEADER  (compact)                          │
│  💰 Brand · 9 products · 4 completed · ~$15k/yr     │
│  Stage progress dots: ●●●●○○○○○                     │
├─────────────────────────────────────────────────────┤
│  YOUR NEXT STEP                                     │
│  Big card highlighting the next sequenced node      │
│  (state-aware: Continue / Build Now / Unlock)       │
├─────────────────────────────────────────────────────┤
│  THE FULL JOURNEY                                   │
│  Vertical stepper, BP-01 → BP-09, each row =        │
│  [#] [icon] [name] [BP code] [status pill] [CTA]    │
│  Sub-category dividers (Branding & Marketing /      │
│  Digital Products) shown as section breaks, not     │
│  full intro paragraphs.                             │
│  Long intro copy collapses behind a "Why this       │
│  order?" expander.                                  │
└─────────────────────────────────────────────────────┘
```

State-driven row styling:
- `completed` → green check, "View" CTA
- `in-progress` → amber dot, "Continue" CTA, slight highlight
- `next-available` → secondary highlight ring, "Build Now" CTA (only one row at a time)
- `available` → neutral, "Build" CTA
- `locked` → grey, lock icon + tier badge, "Unlock <Tier>" CTA
- `coming-soon` → muted, "Coming soon" pill

The "next-available" row gets a subtle pulse / left-border accent so the user always knows the single next click.

### 3. Smart sequencing rules

For each category, the next-action algorithm runs once and is reused by both the Analysis tab (top 3) and the category tabs (highlighted row):

1. Sort nodes by `sequence` ascending.
2. Drop `coming-soon` and `planned` from "next" candidates (still rendered, just skipped).
3. First node where `status !== completed` AND `tierRequired` is met → that is the **Next Step**.
4. If none → category shows "🎉 All caught up — keep refining or move to next category".

Across categories, Brand finishes before Build is highlighted, Build before Yield. A node in a higher category can still be unlocked early but is not promoted as "next".

## Technical Plan

**Files to modify:**
- `src/components/dashboard/book-hub/BookHubOverview.tsx` — restructure into HeroStrip + collapsible Snapshot + Next3Steps. Keep manuscript upload, market snapshot, plan tabs but make them collapsible/secondary.
- `src/components/dashboard/PortfolioStepView.tsx` — replace the per-sub-category card grid with: compact header, "Your Next Step" hero card, vertical journey stepper. Move long sub-category intros into collapsible "Why this order?" disclosures. Keep `getNodeState` logic; add helper `getNextStep(nodes)`.

**New small components (under `src/components/dashboard/book-hub/`):**
- `BookHubHeroStrip.tsx` — cover + progress + "Continue where you left off".
- `JourneyStepper.tsx` — reusable vertical stepper used by all 3 category tabs.
- `NextStepCard.tsx` — large highlighted card for the single recommended next node.
- `CategoryProgressDots.tsx` — small N-of-M dot indicator.

**Data sources (no schema changes):**
- Existing `useAbbyPlan(bookId)` for `completedAssets` count.
- Existing `author_nodes` query in `BookHubOverview` extended into a shared hook `useBookNodeProgress(bookId)` returning `{ statuses, nextStepByCategory, totalsByCategory }` so both files share one source of truth.
- `ABBY_CATEGORIES` (already has `sequence`, `subCategory`, `tierRequired`) drives ordering.

**Keep behavior:**
- Tier gating, admin override via `isSuperAdmin`, `useNodeGating` for open nodes.
- Existing routes — clicking a node still uses `getStudioPath(nodeId, bookId, …)`.
- Brand/Build/Yield colour tokens (`builder-brand`, `builder-bridge`, `builder-yield`) and gradient classes are reused for the new components.

**Out of scope:**
- Sidebar (already trimmed to "My Business Plan" + "My Books Hub").
- Routing (`/dashboard/book/:bookId?tab=…` already canonical).
- Review & Publish and Analytics tabs — left as-is for this pass.

## Acceptance

- Analysis tab fits within ~1.5 viewport heights with snapshot collapsed.
- Each of Brand / Build / Yield tabs shows a single clear "next step" highlighted automatically based on `author_nodes.status`.
- Sequence numbers (BP-01…BP-09, BA-10…BA-18, YR-19…YR-28) visible on every row.
- Completing a node (status flips to `live`) automatically advances the highlighted "next step" on next visit.
- Locked rows display the correct tier upgrade CTA without breaking the stepper layout.
