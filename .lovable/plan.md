

# Plan — Make the Portal Honour Its Own Brand

A focused 3-phase reconciliation pass. No redesign, no new screens — we wire the existing brand tokens through the screens that currently bypass them, and standardise the patterns that have drifted.

---

## Phase 1 — Reconcile the category colour system (the biggest visual win)

**The problem:** Builders use Teal/Indigo/Amber for Brand/Build/Yield. Hubs use grey, purple, and amber. The colour identity changes between hub → builder.

**Fix:**
- **`src/index.css`** — repoint the category tokens so they match the builder reality:
  - `--builder-brand` → teal `172 55% 40%` (was emerald)
  - `--builder-bridge` → indigo `240 55% 50%` (was purple)
  - `--builder-yield` → amber `38 55% 50%` (was sky-blue)
  - Update the matching `--gradient-*-intro` tokens to the new hues.
- **`src/pages/BrandProductsHub.tsx`** — introduce teal accents on category headers, the "Start Here" indicator, node card icons, and progress chips. Currently neutral + gold; will become teal-led with gold as secondary.
- **`src/pages/BuildAuthorityHub.tsx`** — convert violet/purple classes to indigo (`text-indigo-*`, `bg-indigo-*`, `border-indigo-*`).
- **`src/pages/YieldRevenueHub.tsx`** — light polish only; already amber-aligned.

**Result:** Walking from hub → builder → microsite shows one consistent category colour the entire journey.

---

## Phase 2 — Eliminate hex literals and fix dark-mode gaps

**The problem:** Hardcoded `#3B82F6`, `bg-blue-600`, and light-only blocks (`bg-purple-50` with no `dark:` variant) flash incorrect colours and ignore the design system.

**Fix:**
- **`src/components/dashboard/AuthorCRMPage.tsx`** — replace raw hex (`#3B82F6`, `#14B8A6`, `#D4AF37`, `#10B981`) with `text-builder-brand`, `text-secondary`, `text-success`, `text-accent` tokens.
- **`src/components/dashboard/SmartProductCard.tsx`** — replace `bg-blue-600` primary CTA with `bg-secondary` (gold) — the documented primary CTA colour.
- **`src/components/dashboard/FrameworkInterviewModal.tsx`** — replace `from-amber-500 to-amber-600` gradient with `bg-secondary` token.
- **`src/components/dashboard/WebinarsManager.tsx`**, **`DashboardOverview.tsx`** (lines 422-435), **`ManuscriptUpload.tsx`** — add `dark:` variants for every light-only background (`bg-purple-50` → add `dark:bg-purple-950/30`, etc.).
- **`src/pages/FunnelsHub.tsx`** — remove inline hex palette, route through `text-builder-*` tokens.

**Result:** No "flash of wrong colour" on dark-mode toggle. Every colour responds to the design system.

---

## Phase 3 — Standardise the patterns that drift

**The problem:** Status badges use 6 different colour combos. Sidebar reads as generic shadcn slate. Cards use mixed radii.

**Fix:**
- **New** `src/components/ui/status-badge.tsx` — single component with 4 variants: `live` (success green), `building` (amber pulse), `locked` (muted grey + lock icon), `not_started` (subtle navy outline). Replace inline badge JSX in `BrandProductsHub`, `BuildAuthorityHub`, `YieldRevenueHub`, `SmartProductCard`, `DashboardOverview`.
- **`src/index.css`** sidebar tokens — repoint to brand:
  - `--sidebar-background`: navy-tinted (`219 30% 10%` dark / `219 20% 98%` light)
  - `--sidebar-primary`: gold (matches `--secondary`)
  - `--sidebar-accent`: navy-soft hover state
  - `--sidebar-foreground`: warm off-white
- **Card radius** — lock dashboard cards to `rounded-xl` (the documented standard). Audit the 3 hub pages + `SmartProductCard` + `DashboardOverview` and convert any `rounded-lg` / `rounded-2xl` outliers.
- **Gold CTA pattern** — confirm one canonical primary CTA: `bg-secondary text-secondary-foreground hover:bg-secondary/90`. Apply to the top CTA on each hub page so the brand's signature colour anchors every screen.

**Result:** One badge language, one card shape, one CTA pattern, sidebar that visually belongs to the brand.

---

## Out of scope
- No public-site / homepage / readers-bureau / microsite changes (audit covered the authenticated portal only)
- No copy or content changes
- No database, edge function, or routing work
- No new screens or features

## Files touched (estimated)
- `src/index.css` — category tokens + sidebar tokens (~20 lines)
- `src/pages/BrandProductsHub.tsx` — teal accents (~15 lines)
- `src/pages/BuildAuthorityHub.tsx` — violet → indigo (~25 lines)
- `src/pages/YieldRevenueHub.tsx` — polish (~5 lines)
- `src/pages/FunnelsHub.tsx` — hex → tokens (~10 lines)
- `src/components/dashboard/AuthorCRMPage.tsx` — hex → tokens (~10 lines)
- `src/components/dashboard/SmartProductCard.tsx` — CTA + badge (~5 lines)
- `src/components/dashboard/FrameworkInterviewModal.tsx` — gradient → token (~3 lines)
- `src/components/dashboard/WebinarsManager.tsx`, `DashboardOverview.tsx`, `ManuscriptUpload.tsx` — dark variants + badge swaps (~20 lines)
- **New** `src/components/ui/status-badge.tsx` (~50 lines)

**Total:** ~165 lines across ~12 files + 1 new shared component. Roughly 2.5 hours of careful, surgical work.

## Verification
1. Brand hub → BP-04 builder → both teal end-to-end.
2. Build Authority hub → BA-13 builder → both indigo end-to-end.
3. Yield hub → YR-19 builder → both amber end-to-end.
4. Toggle dark mode on every dashboard section — zero light-mode flashes.
5. Every status badge across the portal uses the same 4 variants.
6. Codebase search confirms zero `#XXXXXX` hex literals and zero raw `bg-blue-/purple-/violet-` classes outside `dark:` variants in dashboard files.
7. Sidebar visually reads as navy + gold, anchored to the brand.

**Expected aesthetic lift:** 6.5/10 → 9/10. Same screens, same content, brand finally honoured.

