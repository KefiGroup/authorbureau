# Make the newly-generated funnel impossible to miss

Right now ABBY says "Funnel generated!" but the new card is silently appended to the bottom of the list. If a filter is active or the list is long, the author can't tell what happened or where it went.

The `generate-funnel` edge function already returns `{ success, funnel: { id, slug, title, ... }, archetype }`, so all the data we need is already there — the frontend just isn't using it.

## Fix in `src/components/dashboard/FunnelsHub.tsx`

1. **Capture the response** from `supabase.functions.invoke("generate-funnel", ...)` instead of discarding it.

2. **Richer toast** with the actual funnel title and an "Open" action button:
   - Title: `Funnel created: <title>`
   - Description: "Scroll down to preview, copy the link, or edit the copy."
   - Action: an "Open" button that launches the live URL in a new tab.

3. **Auto-reset the filter** to `"all"` after generation so the new card is never hidden by an active filter.

4. **Highlight + scroll the new card into view:**
   - Add `highlightId` state and a `cardRefs` ref map.
   - Set `highlightId` to the new funnel's id.
   - Smooth-scroll its card into view after the next render.
   - Apply a temporary ring (`ring-2 ring-primary ring-offset-2`) plus a soft shadow on the highlighted card; clear it after ~4 seconds.

5. **Same treatment for regeneration** (`regenerate()`) — flash the same card so the author sees the refreshed copy land.

## Files

- `src/components/dashboard/FunnelsHub.tsx` — wire response data, toast action, scroll-and-highlight, attach refs to each funnel card, conditional ring class.

No edge function changes needed — the response already includes everything.
