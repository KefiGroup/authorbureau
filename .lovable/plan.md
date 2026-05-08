## What you're seeing

**Tile 3 inconsistency:** Tiles 1 and 2 are full-bleed, edge-to-edge cover art (correct). Tile 3 rendered a *photo of a small book sitting on a white background* — the model interpreted the "typographic minimal" art direction as "show me a product mockup" instead of "make the cover itself typographic." That's a prompt issue in art direction C.

**Redo vs the bottom button:** There is no "Regenerate" button. There are two different actions:

- **Redo (on each tile)** → regenerates *that specific design in place*, keeping the same art direction (match / vary / typographic). Use it when one tile is broken (e.g. typo, truncation, or a mockup like tile 3) but you like the other two. It does NOT take a slot away.
- **Replace oldest with new design (bottom CTA, only shown when 3/3 saved)** → generates a *brand-new* design and drops the oldest non-active one to make room. Use it when you want a fresh option but you're at the 3-design cap.

Before the cap, the same bottom button reads "Generate new design" and just adds a 4th… actually a 3rd slot.

## Plan

### 1. Fix tile-3 ("typographic minimal" rendering as a book mockup)

In `supabase/functions/generate-product-cover/index.ts`, tighten ART DIRECTION C and add a global anti-mockup rule:

- Replace direction C copy with: *"Bold typographic cover treatment. The full 3:4 canvas IS the cover — large title typography is the focal point, set directly on a clean geometric or abstract gradient background in the brand palette. NO figurative illustration, NO characters, NO animals."*
- Add to the global `ASPECT & FRAMING` block:
  - *"The artwork must FILL the entire 3:4 canvas edge-to-edge. Do NOT render a small book, a 3D book mockup, a book on a desk/shelf/table, a book floating on a white or neutral background, or any product-photo-style framing. The output IS the cover, not a photo of the cover."*
  - *"No drop shadow around a book shape, no page edges, no spine, no perspective tilt suggesting a physical book."*

This applies to all three art directions and to the per-slot Redo, so clicking Redo on tile 3 will produce a proper full-bleed typographic cover.

### 2. Clarify the button copy in the UI (small text-only change)

In `src/components/dashboard/builders/shared/ProductCoverPreview.tsx`:

- Per-tile button: keep label **Redo** but update the `title` tooltip to: *"Redo this design — same art direction, regenerates in place"*.
- Bottom CTA when at cap: change label from "Replace oldest with new design" to **"Generate new design (replaces oldest)"** and helper line to: *"You're at the 3-design limit. Generating a new one creates a fresh design in a new style and drops the oldest non-active one."*
- Update the "How to choose" helper to add one sentence: *"**Redo** fixes a single design in place. **Generate new design** creates an additional style and (at 3/3) drops the oldest non-active one."*

### 3. Verify

- Click **Redo** on tile 3 → expect a full-bleed typographic cover (no white-background book mockup).
- Click **Redo** on tiles 1 and 2 → expect same art direction, no slot loss.
- At 3/3, click the bottom CTA → expect a new design and the oldest non-active design replaced.

### Files touched

- `supabase/functions/generate-product-cover/index.ts` — prompt hardening only
- `src/components/dashboard/builders/shared/ProductCoverPreview.tsx` — button labels, tooltips, helper copy
