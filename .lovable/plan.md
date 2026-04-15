

# Aesthetic Overhaul: Builder Pages Visual Design System

## Problem
All builder pages (BP-02, BP-09, YR-*, BA-*) share the same `AbbyCard` component — a plain `border-primary/20 bg-primary/5` card. The Introduction, Generating, and page wrapper are flat grey/beige. Meanwhile, the `SmartProductCard` in the Portfolio view uses rich gradients, colored left-strips, glow shadows, and state-specific color coding that feels polished and engaging.

## Design Approach

Apply the existing **B-B-Y category color system** (Brand = Teal/Emerald, Build = Indigo/Blue, Yield = Amber/Gold) to the builder pages themselves, so each builder "feels" like its category.

### 1. Category-Aware AbbyCard
Replace the generic `AbbyCard` with a `ThemedAbbyCard` that accepts a `category` prop (`brand | build | yield`) and applies category-specific styling:

| Category | Border | Background Gradient | Icon Bg | Accent |
|---|---|---|---|---|
| Brand | `border-teal-400/30` | `from-teal-500/8 via-card to-card` | `bg-teal-500/20` | Teal |
| Build | `border-indigo-400/30` | `from-indigo-500/8 via-card to-card` | `bg-indigo-500/20` | Indigo |
| Yield | `border-amber-400/30` | `from-amber-500/8 via-card to-card` | `bg-amber-500/20` | Amber |

### 2. Stepper with Category Color
The step circles currently use generic `bg-primary`. Update to use category accent color (e.g., teal for BP-02, amber for YR-* nodes).

### 3. Page Header with Subtle Gradient Banner
Add a subtle gradient banner behind the page title matching the node category — similar to how `SmartProductCard` uses `bg-gradient-to-br from-{color}/[0.06]`.

### 4. Introduction Step Enhancement
- Add a decorative illustration area (icon cluster or abstract shape) using the category color
- The "Generate" CTA button uses category accent color instead of generic primary
- Add a subtle left-strip accent on the AbbyCard (matching SmartProductCard pattern)

### 5. Generating Step Enhancement  
- Progress bar uses category color instead of default
- Add a pulsing category-colored ring around the Sparkles icon
- Background uses a very subtle radial gradient in the category color

### 6. Shared Components Updated

**Files to change:**

| File | Change |
|---|---|
| `src/components/dashboard/builders/shared/BuilderTheme.ts` | **NEW** — Export category color maps and a `getBuilderCategory(nodeId)` helper |
| `src/components/dashboard/builders/yr-shared/YRBuilderShared.tsx` | Update `AbbyCard`, `StepHeader`, `LoadingStep` to accept `category` prop and apply themed styles |
| `src/components/dashboard/builders/ba-shared/BABuilderShared.tsx` | Same updates as YR-shared |
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Use themed AbbyCard/StepHeader with `category="brand"` |
| `src/components/dashboard/builders/bp09/BP09Builder.tsx` | Use themed components with `category="brand"` |
| All other builder files using `AbbyCard` | Pass the correct category prop (bulk update across ~30 files) |

### 7. Node-to-Category Mapping
Derive from existing `abbyFrameworkConfig.ts`:
- `BP-*` nodes → brand (teal/emerald)
- `BA-*` nodes → build (indigo/blue)  
- `YR-*` nodes → yield (amber/gold)

### What This Does NOT Change
- Review tab colors (already well-designed with per-tab coloring)
- SmartProductCard (already good)
- Dark theme constraint (no light backgrounds — gradients stay subtle)
- No layout changes — purely color/gradient enhancements

