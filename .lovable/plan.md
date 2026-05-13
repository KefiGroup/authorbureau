# Full-size graphic preview (no download)

## Goal
On the Marketing Hub → Social Calendar, let authors view any post's graphic at full size right in the browser. Today the card shows a small ~128px thumbnail and the only way to see the real image is **Download graphic**.

## What changes (UI only)

1. **Make the thumbnail clickable.** Hovering the small preview shows a subtle "Click to view full size" overlay with a magnifying-glass icon and `cursor-zoom-in`. Clicking opens a lightbox.

2. **Add a "Preview" button** next to **Download graphic** / **Regenerate** on cards that already have a graphic. Same affordance for users who don't realize the thumbnail is clickable. Icon: `Maximize2` (or `Eye`).

3. **Lightbox dialog** (shadcn `Dialog`):
   - Dark backdrop, image centered, `max-h-[90vh] max-w-[90vw]`, `object-contain` so the full graphic is visible at native aspect ratio (Instagram 4:5, LinkedIn/Facebook 1.91:1, X 16:9).
   - Header shows post platform + caption's first line for context.
   - When the post has **multiple variants** (square / portrait / landscape from `graphicVariants(post)`), show a small tab/segmented control above the image to switch between sizes — same labels already used in the Download dropdown.
   - Footer has two buttons: **Download this size** (reuses existing `downloadGraphic`) and **Close**. Esc and backdrop-click also close.
   - No new network calls — purely renders `post.graphic_url` / `post.graphics[size]` URLs already loaded.

4. **Apply to both card layouts** in `SocialCalendarTab.tsx`: the unscheduled block (~line 1022) and the scheduled block (~line 1172). Extract a small `<GraphicLightbox>` component within the same file (or a sibling file under `marketing-hub/`) so both blocks share it.

## Out of scope
- No backend / edge-function changes.
- No changes to graphic generation, regeneration, brand kit, or the verbatim-quote prompt.
- No changes to PostEditorSheet, top-bar Generate Graphics, or Download Pack.
- Carousel slides (`CarouselPreview`) already have their own preview affordance — left as-is.

## Files in scope
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` (thumbnail → trigger, add lightbox component, wire to both card blocks)

## Technical notes
- Reuse shadcn `Dialog` (`@/components/ui/dialog`) — already used elsewhere in the project.
- Use `Maximize2` from `lucide-react` (already imported in many files; add to existing import list).
- Preserve existing `loading="lazy"` on the thumbnail; the dialog `<img>` loads only when opened.
- No new state in parent for lightbox — encapsulate `open` state inside the `<GraphicLightbox>` component, triggered by either the thumbnail or the Preview button via `<DialogTrigger asChild>`.
