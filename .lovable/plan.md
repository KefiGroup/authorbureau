# Fix: New funnels invisible + cards don't show what ABBY actually designed

## What's actually happening

Database shows **3 funnels exist** for this author, but the UI shows only 1 ("All · 1") and the suggestion list still offers "Email Marketing" and "Podcast" — meaning the freshly-generated funnels are not present in the React state.

Two distinct problems:

### Problem A — New funnel never reaches the UI

After `supabase.functions.invoke("generate-funnel", ...)` returns, we call `await loadFunnels(authorId)` to re-fetch. This is racy / sometimes returns a stale result and the new card silently never appears. The toast says "ready below" but there's nothing to see.

### Problem B — Cards don't show the actual funnel design

The current card displays: title, badges, 4 stat boxes, URL, action buttons. **It never shows the headline, subheadline, or CTA copy that ABBY just wrote.** That's why the author legitimately asks "is there really a funnel?" — visually nothing looks "designed."

## Fix in `src/components/dashboard/FunnelsHub.tsx`

### A. Optimistic insert (don't trust the re-query alone)

In `generateForNode`, when the edge function returns `data.funnel`, immediately prepend it to `funnels` state with `setFunnels((prev) => [data.funnel, ...prev.filter((f) => f.id !== data.funnel.id)])`. Then still call `loadFunnels` in the background to reconcile. The new card appears instantly.

Same for `regenerate`: replace the existing row in state with the returned funnel before the re-query.

### B. Surface the actual generated copy in the card

Restructure each funnel card so the author can immediately see what was designed:

- **Hero strip at top of card** with `f.background_color` + `f.accent_color`:
  - The generated `headline` in large type
  - The `subheadline` in smaller text
  - The `cta_text` rendered as a styled pill (visual preview of the button)
- Below the hero, keep: badges row, stats grid, URL, action buttons.
- This turns the card from an info row into a **visual mini-preview** of the designed funnel — the author sees the copy ABBY wrote without having to click "View."

### C. Prominent post-generation banner

When `highlightId` is set, render a sticky banner at the top of the funnel grid:
"✨ Just created: <Title> — [Open] [Edit copy]" so even if the user doesn't scroll, they see it.

### D. Better empty / loading feedback

If `loadFunnels` returns and the just-generated funnel id is not in the result (race), trust the optimistic insert and log a warning rather than letting the row vanish.

## Files

- `src/components/dashboard/FunnelsHub.tsx` — optimistic state updates in `generateForNode` and `regenerate`, restructured funnel card with hero preview, sticky "just created" banner.

No edge function changes (it already returns the full funnel object).
