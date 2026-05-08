## Goal

When an author picks an occasion in **BP-08 Special Editions** (Mother's Day, Father's Day, Christmas, etc.), the cover subtitle should read **"Mother's Day Special Edition"** instead of the redundant "Special Editions" we show today. If no occasion is selected, we show no subtitle at all (the gold ribbon already says SPECIAL EDITION, so nothing is lost).

## Where the data already lives

BP-08 already captures the picked occasion and persists it on the draft:

- `selectedOccasion.label` (e.g. `"Mother's Day"`, `"Father's Day"`) — derived from `?occasion=…` in the URL via `findCalendarOccasion()`.
- It is saved into `content.occasion_label` on the draft (BP08Builder.tsx ~L147), so it survives reload and is available to the success-screen preview tile.

So no new DB fields and no new generator are needed — we just stop hard-coding the subtitle and read what's already there.

## Changes (frontend only, 1 file)

**`src/components/dashboard/builders/bp08/BP08Builder.tsx`**

1. Add a small helper near the top of the component:
   ```ts
   const occasionLabel =
     selectedOccasion?.label ||
     (typeof content?.occasion_label === "string" ? content.occasion_label : "");
   const editionSubtitle = occasionLabel ? `${occasionLabel} Special Edition` : undefined;
   ```
2. Replace the two hard-coded `productSubtitle: "Special Edition"` / `productSubtitle="Special Edition"` (the `generateProductCover(...)` call ~L274 and the `<ProductCoverPreview …/>` ~L500) with `editionSubtitle`.
3. Leave the gold ribbon and `productKind: "special-edition"` exactly as they are.

## Why this works with the existing edge function

`sanitizeSubtitle()` in `generate-product-cover` strips leading redundant prefixes ("special edition", "special editions", etc.) and rejects subtitles that are equal to / contained in the ribbon label.

- `"Mother's Day Special Edition"` does **not** start with a redundant prefix and is **not** equal to or contained in `"SPECIAL EDITION"`, so it passes through cleanly.
- When `editionSubtitle` is `undefined` (no occasion picked), the existing prompt rule already instructs the model to render only the ribbon + title + byline — no "Special Edition" line is invented.

So no edge-function change is required. Existing covers won't auto-fix; authors hit **Redo** on a tile to regenerate cleanly.

## Out of scope

- BP-09 (Book Sales) — different node, unrelated to the occasion picker.
- BP-06 / BP-07 (workbook / home-study) cover subtitles — separate cleanup if desired later.
- Any change to how occasions are stored, the calendar card, or the edge function.