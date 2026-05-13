# Add "Regenerate graphic" to social post cards

## Problem
On the Marketing Hub → Social Calendar, once a post has a graphic the card only shows **Download graphic**. To redo the image the author has to open the Post Editor sheet and click **Regenerate Graphic**, which is hidden and not discoverable. The top-bar **Generate graphics** button only fills in *missing* graphics — it won't replace an existing one.

There is also a backend gate that prevents regeneration even if the UI did call it: in `bp03-generate-all-graphics/index.ts` the per-post loop does `if (next[size]) continue;`, so a second call for the same post returns "Graphic already exists" without producing anything new.

## Fix

### 1. Frontend — `SocialCalendarTab.tsx`
Where the card currently renders the **Download graphic** button (both list views, around lines 1044–1064 and 1167–1190), add a sibling **Regenerate** button:
- Icon: `RefreshCw` (already imported elsewhere in the project).
- Variant: `outline`, same size as Download.
- Disabled while `generatingGraphicForId === post.id`, shows spinner + "Designing…".
- Confirms with a small inline `AlertDialog` ("Replace this graphic? The current image will be deleted.") to prevent accidental re-spend.
- On confirm: clears `graphics` and `graphic_url` for that row (reuse the same Supabase update pattern already in `BP03Builder.tsx` lines 638–646), then calls existing `generateOneGraphic(post)`.

### 2. Backend — `supabase/functions/bp03-generate-all-graphics/index.ts`
Accept an optional `force: boolean` flag. When `post_id` is provided AND `force === true`:
- Skip the `if (next[size]) continue;` short-circuit so every requested size is regenerated.
- Optionally start from `next = {}` instead of merging with existing, so stale URLs don't linger if one size fails.

The frontend's regenerate flow sends `{ post_id, force: true }`. The existing batch and "fill missing only" flows are unchanged.

### 3. Out of scope
- The PostEditorSheet's Regenerate Graphic button keeps working as-is.
- No change to `generateAllGraphics` (top bar) — it stays "fill missing only" so authors don't accidentally rebuild the whole queue.
- No change to graphics rendering, brand kit, or the verbatim-quote prompt logic shipped previously.

## Verification
- Card with existing graphic: Regenerate → confirm dialog → spinner → new image appears, old storage URL replaced.
- Card without graphic: Regenerate button is hidden (only Generate graphic shows).
- Top-bar **Generate graphics** still skips posts that already have all 3 sizes.
- Edit caption in PostEditorSheet → save → card flips back to **Generate graphic** (existing behavior preserved).

## Files touched
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
- `supabase/functions/bp03-generate-all-graphics/index.ts`
