## Goal
Make the 3 generated product covers (BP-06/07/08/09) genuinely usable and meaningfully different from each other — and stop the AI from baking misspelled paragraph text into the artwork.

## Problems observed
1. AI rendered a long descriptive paragraph onto the cover with multiple typos ("retenchment", "betryal", "liived", "SUCKCESS").
2. Subtitle inconsistency: "SPECIAL EDITION" vs "Special Editions".
3. Designs 1 and 2 are near-duplicates — no real choice for the author.

## Changes

### 1. Tighten the prompt in `supabase/functions/generate-product-cover/index.ts`
Rewrite `buildPrompt()` to strictly limit on-cover text to 4 elements:
- Ribbon (e.g. "SPECIAL EDITION")
- Title (exact string)
- Optional subtitle (≤6 words)
- Author byline

Add explicit negative instructions:
- "Do NOT render any paragraph, description, blurb, tagline, or body copy on the cover."
- "Do NOT invent words. Render ONLY the four text strings provided, spelled exactly as given."
- "No more than 4 text elements total on the cover."

Also strip/ignore any `productSubtitle` longer than ~60 chars before sending (defensive — prevents callers passing a description by mistake).

### 2. Force variant diversity for designs 2 and 3
The function already knows the existing `history` length. Use it to pick an art-direction seed so each generation looks different:

```text
slot 1 → "Art direction A: same hero illustration and palette as the reference book cover."
slot 2 → "Art direction B: VARY from the reference. Keep brand colors but use a different hero motif (e.g. mountain summit at dawn, open road, lighthouse) and a different composition. Must be visually distinct from a phoenix-on-fire scene."
slot 3 → "Art direction C: Minimal / typographic. Bold geometric or abstract background, large title typography as the focal point, no figurative illustration."
```

Pass the corresponding directive into the prompt based on `history.length` (0 → A, 1 → B, 2 → C). When user clicks "Generate new design" with 3 already saved (replacing oldest), reuse the slot index of the one being dropped so the trio stays diverse.

### 3. Lock subtitle wording
In the BP-08 (special-edition) builder, normalize the subtitle to a single canonical form: **"Special Edition"** (singular, title case). Update the default productSubtitle and the prompt's ribbon constant accordingly.

### 4. Update helper banner copy on `ProductCoverPreview.tsx`
Reflect the new behavior: "Each new design uses a different art direction so your 3 saved options stay visually distinct."

## Out of scope (not doing now)
- OCR spell-check post-validation (can add later if typos still slip through).
- Re-generating any covers automatically — author re-runs "Generate new design" when ready.

## Files touched
- `supabase/functions/generate-product-cover/index.ts` — prompt rewrite + slot-based art direction
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — subtitle normalization
- `src/components/dashboard/builders/shared/ProductCoverPreview.tsx` — helper banner copy
