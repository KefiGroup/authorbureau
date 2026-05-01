## Problem

On `/dashboard`, the ABBY Journey Framework infographic appears **twice**:

1. Inside `JourneyMapCTA` (the gold gradient card with the "Your book is the HOOK" tagline + dynamic CTA buttons)
2. As a standalone `Your Journey Ahead` section directly below it

Both currently render the **same** v7 staircase image (`abby_journey_staircase_v7.webp` / `/images/journey-staircase.webp` — they are byte-identical, 93,750 B). On top of that, v7 is no longer the canonical framework artwork — the documentation framework calls for `abby_journey_framework_v14_bby.webp` (BRAND/BUILD/YIELD).

## Fix

Two surgical edits to one file plus one image swap in another:

### 1. `src/components/dashboard/ABBYFrameworkDashboard.tsx`
Remove the entire standalone "Your Journey Ahead" section (lines 400–409 — the `<section>` block containing the `<h2>` and the `<img src="/images/journey-staircase.webp" />`). Keep the `JourneyMapCTA` above it and the `Understanding Your 28 Revenue Streams` collapsible below it.

After removal the order becomes:
- MultiBookPicker (if >1 book)
- JourneyMapCTA  ← the only place the framework image appears
- Monetization Universe + 28-streams flow diagram (collapsible)
- (rest unchanged)

### 2. `src/components/dashboard/framework-dashboard/JourneyMapCTA.tsx`
Replace the import on line 4:
- from: `import staircaseImg from "@/assets/abby_journey_staircase_v7.webp";`
- to:   `import frameworkImg from "@/assets/abby_journey_framework_v14_bby.webp";`

Update the `<img>` on lines 57–61 to use `frameworkImg` and refresh the alt text to: `"The ABBY Journey Framework — Brand, Build, Yield"`.

(The v14 asset already exists in `src/assets/`, so no upload is needed.)

### 3. No other call sites need changes
Other usages of the v7 staircase / framework imagery (`HowItWorks.tsx`, `ABBYFrameworkArticle.tsx`, public `Index.tsx`) are out of scope for this dashboard duplication report and use their own contextually-appropriate variants.

## Verification
After the change, visit `/dashboard` — the framework infographic appears exactly once, inside the gold "Your book is the HOOK" card, using the v14 BBY artwork. The "Understanding Your 28 Revenue Streams" collapsible and Monetization Universe remain directly below.
