## Goal

You want to keep the **left design's look** (phoenix art direction A) but regenerate it so the baked-in paragraph text has no typos / no spurious blurb at all.

Today the only button is "Generate new design", which advances to the next art direction (A → B → C → replace oldest). There is no way to say *"redo this specific design"*. That's why every regenerate produces a visually different cover.

## What I'll add

### 1. Per-design "Regenerate this design" action (frontend)
In `src/components/dashboard/builders/shared/ProductCoverPreview.tsx`:
- On hover of any saved design tile, show a small **↻ Regenerate** button (in addition to the existing "Use this design" overlay).
- Clicking it calls `generateProductCover` with a new `regenerateSlotIndex` field equal to that tile's index, plus `force: true`.
- Optimistic toast: "Regenerating this design…".
- After success, reload history; the slot at that index is replaced in place (same art direction), other slots untouched.

### 2. Honour `regenerateSlotIndex` (edge function)
In `supabase/functions/generate-product-cover/index.ts`:
- Accept optional `regenerateSlotIndex: number` in the body.
- When present and valid (0..history.length-1):
  - Use that index for `slotIndex` (so the SAME art direction prompt is reused → same visual style).
  - Replace the entry at that index in place, preserving its `is_active` flag.
  - Delete the old storage file for that slot.
- When absent, keep current behaviour (append / replace-oldest).

### 3. Tighten the prompt to kill the rogue paragraph (edge function)
The screenshot shows AI baked an unwanted body paragraph ("From Pauline Teo, a financial educator…") with typos like *"liived experience"* and *"who who rebuilt"*. The current prompt already forbids paragraphs, but the model leaked one anyway. Strengthen `buildPrompt`:
- Add an explicit `FORBIDDEN TEXT` block listing: no descriptive paragraph, no "From {author}…", no sentence starting with "From", no body text under the title.
- Add a final-line reminder: *"If unsure whether a piece of text belongs, OMIT it."*
- Lower the count: *"Maximum 4 short text elements; the longest is the title."*

This applies to every regeneration, so the redo of design A will come back clean.

## Verification

1. Open BP-08 (Special Editions) cover designs.
2. Hover the left "Active" design → click new ↻ Regenerate button.
3. Toast "Regenerating…" then "New design saved".
4. The active slot updates with the same phoenix-style art direction but no paragraph blurb / no typos.
5. Other two slots are untouched.

## Files touched

- `src/components/dashboard/builders/shared/ProductCoverPreview.tsx` — add per-tile Regenerate button + pass `regenerateSlotIndex`.
- `src/lib/generate-product-cover.ts` — add optional `regenerateSlotIndex` to input type.
- `supabase/functions/generate-product-cover/index.ts` — honour `regenerateSlotIndex`, in-place replace, tightened prompt.

No DB migrations. No new env vars.