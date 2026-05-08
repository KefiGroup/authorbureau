## Goal
Make all 3 generated product-cover designs faithfully follow the parent book cover's hero illustration, palette, and typography style — like the first two tiles in the screenshot. Drop the "typographic minimal" treatment that produced the inconsistent third tile.

## Change
Edit `supabase/functions/generate-product-cover/index.ts` only. No frontend or DB changes.

### 1. Rewrite ART DIRECTION C (slot 2)
Replace the current "typographic minimal" direction with a third book-cover-faithful variant that keeps the same hero illustration, palette, and typographic style as the reference book, and only varies a small customization detail. Proposed copy:

> **ART DIRECTION C (match — alt customization):** Closely emulate the reference book cover — same hero illustration concept, same palette, same lighting, same typography style, same overall composition — so it reads as part of the same set as slots A and B. Vary ONLY one small customization detail (e.g. slightly different camera angle on the same hero, a small accent flourish, a subtle alternate sub-headline placement, or a minor lighting shift). Must look like it belongs to the same family as the book cover and the other two tiles.

### 2. Always use the book cover as a reference for slot 2
- Remove the `slotIndex === 2` branch in `refUsage` (line 53–55) — use the standard "palette/mood/style reference" copy for all slots.
- Remove the `slotIndex === 2` branch in the `messages.content` block (line 221–226) — always send `[ {text}, {image_url: bookCoverUrl} ]`.
- Simplify the refusal-retry guard (line 247) to retry text-only on any slot when the model refuses with a reference image.

### 3. Keep all existing rules
- Keep the anti-mockup, edge-to-edge, safe-margin, and strict-text rules in `ASPECT & FRAMING` and `STRICT TEXT RULES` exactly as they are.
- Keep the "no inset panel / inner card / inner frame" rule (now applies uniformly to all 3 slots).

### 4. Deploy
Deploy the `generate-product-cover` edge function after the edit.

## Out of scope
- No changes to `ProductCoverPreview.tsx`, the Redo/Generate buttons, or any other file.
- No prompt changes for slots A and B beyond what's already there.
