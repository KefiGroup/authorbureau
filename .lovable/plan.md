# Fix truncated workbook cover (display + generation)

The first saved design is being cropped at the top of the tile (the "SPECIAL EDITION" ribbon and the top of the title are cut off). Two independent causes:

1. **Display:** the tile uses `object-cover` on a strict 3:4 frame. If the AI returns an image that is even slightly off-ratio (or pushes content right to the edge), `object-cover` zooms in and crops the top.
2. **Generation:** the prompt asks for a "3:4 portrait cover" but doesn't reserve safe top/bottom margins, so Nano Banana sometimes places the ribbon and title flush against the canvas edge — guaranteeing it gets clipped by any frame.

## Changes

### 1. Display — show the full cover, never crop (`ProductCoverPreview.tsx`)
- Switch the tile `<img>` from `object-cover` to `object-contain` on a neutral dark background, keeping the 3:4 tile frame.
  - Result: the entire generated image is always visible inside the tile; if its ratio is slightly off, you get thin letterbox bars instead of a cropped ribbon.
- Keep the existing ring/active/hover affordances and the bottom-right "Redo" pill exactly as they are.
- Apply the same `object-contain` treatment to the public product page hero image (`AuthorProductPage.tsx`, line 509) so the public page also shows the full cover.

### 2. Generation — bake in safe margins (`supabase/functions/generate-product-cover/index.ts`)
Add explicit safe-area + composition rules to `buildPrompt(...)` so future regenerations don't render text against the edge:

- **Safe area:** "Leave a clear ~8% safe margin on all four sides — no text, ribbon, byline, or critical illustration detail may touch any edge of the canvas."
- **Ribbon placement:** "The top ribbon must sit fully inside the top safe margin, with at least 6% of canvas height of clearance above it."
- **Title placement:** "Title must sit below the ribbon with visible breathing room; do not let any glyph cross the top safe margin."
- **Byline placement:** "Author byline must sit fully inside the bottom safe margin."
- **Aspect:** restate "Output must be exactly 3:4 portrait (e.g. 1024x1365). Do not crop, do not letterbox."

This applies to all three art directions (match / vary / typographic) and to per-slot Redo (which reuses the same prompt builder), so old truncated designs can be fixed by clicking Redo on that slot.

## Files
- `src/components/dashboard/builders/shared/ProductCoverPreview.tsx` — img class swap + bg color
- `src/pages/AuthorProductPage.tsx` — img class swap (hero cover)
- `supabase/functions/generate-product-cover/index.ts` — extend `buildPrompt` with safe-margin rules

## Verification
1. Reload BP-08 → the first tile shows the full "SPECIAL EDITION" ribbon and full "Be SUCKcessful" title with no top crop (any off-ratio shows as thin bars, not clipping).
2. Click "Redo" on the first tile → new image regenerates with the ribbon/title/byline visibly inside safe margins.
3. Open the public product page → the hero cover is fully visible (no top crop).
