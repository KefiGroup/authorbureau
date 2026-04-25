## Goal

Make `SmartProductCard` honor the B-B-Y category color scheme (Brand=Teal, Build=Indigo, Yield=Amber) and make the "available" outline Build button much more visually obvious.

## Current State

- `SmartProductCard.tsx` uses a single `secondary` (gold) accent for icons, strips, badges, and the "Recommended" CTA — regardless of whether the node is BP-, BA-, or YR-.
- `available` cards render a faint outline button (`<Button variant="outline">`) which the user finds too subtle next to the bold gold "Recommended" CTA.
- The category color tokens already exist in `src/components/dashboard/builders/shared/BuilderTheme.ts` (teal / indigo / amber), but `SmartProductCard` does not consume them.
- The screenshot is the BA section ("SCALE YOUR CONTENT") — those cards should read indigo, not gold.

## Changes

### 1. Wire category into `SmartProductCard.tsx`

- Import `getBuilderCategory` + `categoryStyles` from `BuilderTheme.ts`.
- Derive `category = getBuilderCategory(code ?? "")` (the `code` prop already carries `BA-10`, `BP-09`, `YR-22` etc.).
- Replace hard-coded `secondary` usages in `stateConfig` with category-driven equivalents:
  - `recommended` / `in-progress`: border, glow, gradient bg, left strip, badge bg, icon background and icon color all sourced from `categoryStyles[category]`.
  - `available`: hover border + left strip use category color (lighter opacity).
  - `published`: keep success green (status, not category).
  - `locked` / `coming-soon`: keep neutral muted.
- Icon tile (lines 158–163) and Icon color use `categoryStyles[category].iconBg` / `iconText`.

### 2. Category-colored CTAs

Replace the single `bg-secondary text-secondary-foreground` button styling with category-specific buttons:

- `recommended` CTA → `categoryStyles[category].buttonAccent` (solid teal / indigo / amber).
- `in-progress` "Continue Building" CTA → same solid category color.
- `available` CTA — the user's main complaint. Upgrade from a flat outline to a **prominent solid filled button** in the category color at slightly reduced intensity to still differentiate from "Recommended":
  - Use `bg-{category}-500/90 hover:bg-{category}-600 text-white border border-{category}-500` (full solid, not outline).
  - Keep "Recommended" visually dominant via the badge, glow shadow, gradient card background, and a subtle ring (`ring-2 ring-{category}-400/40`) — not via being the only colored button.

This way every Build button is obviously clickable and color-coded, while "Recommended" still pops through the card-level treatment.

### 3. Differentiation hierarchy (so Recommended still stands out)

| State | Card | Button |
|-------|------|--------|
| Recommended | Glow + gradient + ring + ⭐ badge | Solid category color, Sparkles icon |
| Available | Plain card, category left strip | Solid category color (slightly muted), arrow icon |
| In progress | Gradient + 🔨 badge + progress bar | Solid category color, wrench icon |
| Published | Green border + ✅ Live | Outline (View on Website) |
| Locked | Muted, dimmed | Outline upgrade |

### 4. Files touched

- `src/components/dashboard/SmartProductCard.tsx` — only file changed.

No DB / edge function / route changes. Existing `code` prop already supplies the BA-/BP-/YR- prefix needed for category detection.

## Out of scope

- Recoloring the builder pages themselves (already category-themed via `BuilderTheme`).
- Changing the Hub headers or `PortfolioStepView` layout.
- Modifying the "Your Next Step" hero card at the top (it sits above the grid and uses its own styling).