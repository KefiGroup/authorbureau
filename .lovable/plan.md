## Two issues to address

### Issue 1 — Pricing tiles showing on Analysis tab for paid users

On the Book Hub → Analysis tab, the **"Ready to start building?" pricing block** (Brand $49 / Build $99 / Yield $249) renders for users who are already on a paid plan.

**Root cause** (`src/components/dashboard/book-hub/BookHubOverview.tsx`): the upgrade block is gated by `tier === "free"`, but in the screenshot the user is clearly on a paid plan and still sees the tiles. We will tighten the gate to use `effectiveTier !== "free"` (which already accounts for admin / superadmin) and replace the block for paid users with a compact one-line plan-status strip.

### Issue 2 — Brand / Build / Yield tabs should use the previous "namecard" design

The current category pages (`PortfolioStepView.tsx`) render each node as a thin one-line row inside a vertical stepper (icon + name + status pill + tiny CTA). The user wants the **previous rich product card** look back — the `SmartProductCard` design (still in the codebase at `src/components/dashboard/SmartProductCard.tsx`) which shows for each node:

- Larger card with icon and product name
- Status badge (Recommended / Available / In Progress / Published / Locked / Coming Soon)
- Description (and personalized description when available)
- Revenue estimate (e.g. "$3,940/yr potential")
- Time to build + difficulty stars
- Tier requirement badge for locked items
- A primary CTA (Build / Continue / View / Unlock)

The smart-sequencing benefits from the recent redesign are kept — the page still computes the single "next step" and shows it prominently — but the body of the page returns to a card grid instead of the stepper rail.

## Fix

### Part A — `BookHubOverview.tsx`

1. Compute `const isPaidOrAdmin = effectiveTier !== "free";`
2. Replace the existing `{tier === "free" && ...pricing...}` block with:
   - **Free users** → existing pricing tiles (unchanged).
   - **Paid users / admin** → small one-line "plan status" strip:
     ```
     ✓ Yield Plan active — all 28 builders unlocked. · Manage plan →
     ```
     Variants: Brand → "9 builders unlocked", Build → "18 builders unlocked", Yield/admin → "all 28 builders unlocked". "Manage plan" links to `/account-settings?tab=billing`.
3. Move that strip **above** "Your Next N Steps" so users see plan confirmation first, then their next actions.

### Part B — `PortfolioStepView.tsx` (Brand / Build / Yield)

Restructure each category tab to:

```text
┌─────────────────────────────────────────────────────┐
│  Compact category header  (kept, slightly smaller)  │
│  Title · X of Y built · revenue range · progress    │
│  "Why this order?" disclosure (kept)                │
├─────────────────────────────────────────────────────┤
│  YOUR NEXT STEP  (kept — single hero card)          │
├─────────────────────────────────────────────────────┤
│  THE FULL JOURNEY                                   │
│  Sub-category section (e.g. Branding & Marketing)   │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│    │ BP-04    │ │ BP-02    │ │ BP-01    │           │
│    │ Website  │ │ Lead Mag │ │ Email    │           │
│    │ [card]   │ │ [card]   │ │ [card]   │           │
│    └──────────┘ └──────────┘ └──────────┘           │
│  Sub-category section (Digital Products)            │
│    grid of SmartProductCards                        │
└─────────────────────────────────────────────────────┘
```

Implementation:

1. **Drop the `JourneyStepper` rendering** in the "Full Journey" section.
2. **Re-introduce `SmartProductCard`** in a responsive grid (2 columns on `sm`, 3 columns on `lg`).
3. Group cards by **sub-category** (`subCategory` field on each node — e.g. "Branding & Marketing", "Digital Products" for Brand). Sub-category header = small uppercase divider, no long intro paragraph.
4. **Map our computed `state` (NodeStatus) → SmartProductCard's `ProductCardState`**:
   - `completed` → `published`
   - `in-progress` → `in-progress`
   - the single category `nextStep.id` → `recommended` (only one card per category gets this)
   - `available` (others) → `available`
   - `locked` → `locked`
   - `coming-soon` → `coming-soon`
5. Show the **BP-XX / BA-XX / YR-XX code** as a small badge in the top-left corner of each card (use `NODE_CODE_MAP` already exported by `useBookNodeProgress`). Add a `code?: string` prop to `SmartProductCard` for this.
6. Wire each card's CTAs:
   - `onBuild` / `onContinue` / `onView` → `onNavigate(node.id)` (same routing already in `JourneyStepper`).
   - `onUpgrade` → `onNavigate("build-business")`.
7. Keep the **Next Step hero card** (`NextStepCard`) unchanged — it's still the primary call-to-action above the grid.
8. Remove `JourneyStepper` import from `PortfolioStepView.tsx`. The component file stays in the codebase (still used by `BookHubOverview.tsx` for the top-3 next-steps list on the Analysis tab).

### Part C — Tier-upsell tightening on category tabs

In `PortfolioStepView.tsx`, no global "Upgrade to unlock" CTA exists at the header level today, so nothing to remove there. Per-card tier badges (`Locked` + `Unlock <Tier>`) on individual `SmartProductCard`s remain — they only render when a specific node's `tierRequired` exceeds the user's tier (won't fire for a Yield user).

## Files to modify

- `src/components/dashboard/book-hub/BookHubOverview.tsx` — gate pricing block; add plan-status strip; reorder.
- `src/components/dashboard/PortfolioStepView.tsx` — replace `JourneyStepper` with `SmartProductCard` grid grouped by `subCategory`; keep header + NextStepCard.
- `src/components/dashboard/SmartProductCard.tsx` — add optional `code?: string` prop and render small code badge (BP-XX / BA-XX / YR-XX) at top-left.

No new hooks, no schema changes, no routing changes.

## Acceptance

- Brand / Build / Yield plan users **never** see the "Ready to start building?" pricing tiles on the Analysis tab. They see a single "Plan active — N builders unlocked · Manage plan" line instead.
- Free users still see the existing pricing tiles.
- Brand / Build / Yield tabs now display the previous rich namecard layout: each node as a `SmartProductCard` in a grid grouped by sub-category, with revenue, difficulty, time-to-build, tier badges, and BP/BA/YR code badge.
- The single "Your Next Step" hero card remains above the grid; the `nextStep` node in the grid is also marked `recommended`.
- Status (completed / in-progress / locked / coming-soon) is reflected on each card automatically from `useBookNodeProgress`.