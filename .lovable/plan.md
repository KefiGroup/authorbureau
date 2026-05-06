## Goal

Make the "% complete" progress bar appear on **Live** product cards (showing 100%) in addition to the current "in-progress" cards. "Ready to Build" cards stay clean (no bar).

## Current behavior

In `src/components/dashboard/SmartProductCard.tsx`, the progress bar block is gated to:

```ts
{state === "in-progress" && progressPercent !== undefined && ( ... )}
```

So only Home Study Course shows it. Website, Workbook, Special Editions (all Live) hide it.

## Change

In `SmartProductCard.tsx`:

1. **Subtitle line (~L304)** — also render a "100% complete — Live" line when `state === "published"`.
2. **Progress bar block (~L310)** — render the bar when state is either `"in-progress"` or `"published"`. For `"published"`, force `value = 100` and use the green Live accent (matching the existing "Live" badge color) instead of the amber pending color.
3. Keep `"available"`, `"recommended"`, `"locked"`, `"coming-soon"` unchanged (no bar).

No other files need changes — `progressPercent` is already passed in `PortfolioStepView.tsx` for every card and `useNodeLiveStats` already maps `live → 100%`.

## Files touched

- `src/components/dashboard/SmartProductCard.tsx` (one component, ~10 lines edited)

## Out of scope

- No DB changes
- No changes to status mapping or `useNodeLiveStats`
- "Ready to Build" cards intentionally stay bar-free (they'd just be empty rails)
