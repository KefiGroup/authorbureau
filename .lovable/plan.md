## Problem

The per-slot "Redo" button was added to `ProductCoverPreview.tsx`, but you can't see it because:

1. It's `opacity-0 group-hover:opacity-100` — invisible until you hover the tile.
2. It's anchored `top-1 left-1`, which sits directly under the "SPECIAL EDITION" banner baked into the cover art, so even on hover it's easy to miss.

## Fix (frontend only, `src/components/dashboard/builders/shared/ProductCoverPreview.tsx`)

1. **Always show the button.** Remove `opacity-0 group-hover:opacity-100 focus:opacity-100` so the Redo pill is permanently visible on every saved design tile.
2. **Move it to the bottom-right** (`bottom-2 right-2`) so it sits over the dark lower portion of the cover, away from the "SPECIAL EDITION" tag and the "Active" badge (which stays top-right).
3. **Stronger contrast.** Switch the pill to a solid dark background (`bg-foreground/90 text-background` or `bg-black/80 text-white`) with a subtle ring, so it reads clearly over both bright and dark covers.
4. **Keep label compact:** icon + "Redo" normally, icon + "Regenerating…" while in flight. Disabled state and stopPropagation behavior unchanged.
5. The "Use this design" hover hint at the bottom moves up slightly (or is left as-is — the Redo pill sits above it in the corner and they don't overlap visually).

No changes to the edge function, no new props, no business logic touched.

## Verification

Open BP-08 cover designs → each of the 3 saved tiles shows a visible "↻ Redo" pill in the bottom-right corner, even without hovering. Click it → tile shows spinner + "Regenerating…", other tiles untouched, new image appears in the same slot with the same art direction.
