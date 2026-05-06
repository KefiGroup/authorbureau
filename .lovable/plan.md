## Goal
Make the node cards consistent across the dashboard:
- Live nodes show 100%
- Built but unpublished nodes show an in-progress percentage
- Truly untouched nodes stay as Ready to Build

This will fix the issue where Webinars and Book Sales can have real work behind them but still present differently from other nodes.

## What I will build

### 1. Replace the current card-state inconsistency with one unified progress rule
I will make the dashboard use a single rule for all nodes:
- If a node has a live/published record, show it as Live with 100%
- If a node has saved draft/generated content, show it as Building with a percentage
- If a node has no saved work, show it as Ready to Build

That means the cards will stop depending on ad hoc combinations of config status, author_nodes-only checks, or manager-specific behavior.

### 2. Unify the progress source used by the cards
Right now the dashboard splits this across two hooks:
- `useBookNodeProgress` decides card state
- `useNodeLiveStats` decides the percent

I will align them so they both read from the same effective progress model. This avoids cases where a node is considered built in one place but not far enough along in another place to show a percent.

### 3. Treat saved builder work as real progress for all nodes
If a user has already generated or saved node content, the card should not still look untouched.

I will make the progress resolver recognize saved builder state from the existing draft infrastructure and/or the node row so that:
- Webinars shows in-progress when it has generated webinar content but is not live
- Book Sales shows in-progress when the builder has generated or saved content but is not live
- other builders follow the same rule instead of depending on one-off behavior

### 4. Normalize BP-05 and BP-09 persistence so their dashboard state cannot drift
I found that these flows use multiple storage patterns across builder, node row, and manager screens. I will tighten that so Webinars and Book Sales always stamp the same progress signals the dashboard expects.

That includes ensuring the relevant unpublished state consistently carries step/progress metadata rather than leaving the card to infer from incomplete signals.

### 5. Keep the visual presentation consistent on the cards
I will keep the card UX simple and predictable:
- Live: green 100% bar
- In progress: partial bar with percent label
- Ready to Build: no bar

No more special-case behavior where one unpublished node shows a percent and another unpublished node with saved work does not.

## Technical details

### Files to update
- `src/hooks/useBookNodeProgress.ts`
  - broaden the logic that decides whether a node is `completed`, `in-progress`, or `available`
  - include draft/build evidence consistently instead of relying only on the current narrow mapping

- `src/hooks/useNodeLiveStats.ts`
  - make percent calculation match the same state model
  - use saved step metadata when present, with sensible fallbacks when only status exists

- `src/components/dashboard/PortfolioStepView.tsx`
  - keep card state and percent wiring aligned with the new unified resolver

- `src/components/dashboard/SmartProductCard.tsx`
  - keep the rendering logic consistent with the unified states
  - ensure unpublished built nodes always render their progress line and bar

- `src/components/dashboard/builders/bp05/BP05Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`
- `src/components/dashboard/WebinarsManager.tsx`
- `supabase/functions/generate-bp05-webinars/index.ts`
  - normalize saved unpublished progress metadata where needed so the dashboard always has reliable input

### Rules after the fix
```text
No saved work        -> Ready to Build
Saved draft/content  -> Building + percent
Live/published       -> Live + 100%
```

### Scope
- No redesign of the dashboard layout
- No database schema changes expected
- No change to the published/live business rules
- This is a consistency fix for status detection and presentation

## Result
After this fix, Webinars and Book Sales will no longer be treated differently from other nodes. If they have been built but not published, they will display as in-progress with a percentage, just like any other node with saved work.