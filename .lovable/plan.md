

# Fix: Make Magnets Selectable & Adapt Tabs to Selection

## Problem
The Magnets tab shows 3 lead magnet options (Quiz, Checklist, Cheat Sheet) but they're not clickable. The user expects to **pick one** as their active lead magnet, and the subsequent tabs (Quiz, Opt-In, Thanks) should reflect that choice. Currently the Quiz tab always shows quiz content regardless — if the author picks "Checklist", the Quiz tab is irrelevant.

## Design

### Magnets tab: Select 1 of 3
- Each magnet card becomes a **clickable selection card** (like the headline variant picker)
- ABBY's Top Pick is pre-selected by default
- Clicking a card sets it as the `selected_lead_magnet` in content state
- Selected card gets a prominent border + "✓ Selected" badge
- Unselected cards are dimmed slightly with "Click to select" affordance

### Tab 2 adapts to selection
- Rename the "Quiz" tab to **"Content Preview"**
- If selected magnet is a **Quiz/Assessment**: show quiz questions, options, scoring tiers (current behavior)
- If selected magnet is a **Checklist**: show a checklist preview with the 8 signal items, score key
- If selected magnet is a **Cheat Sheet**: show the pattern-to-stage map, diagnosis sections
- Since the edge function only generates full `quiz_structure` for the quiz type, for Checklist/Cheat Sheet the tab shows a structured preview built from the magnet's `description`, `pages_or_length`, and `why_it_works` — with a note that the detailed content will be generated on publish

### Opt-In, Thanks, Flow tabs
- These already work generically — they stay the same but the headline/CTA should reference the selected magnet's title

## Technical Changes

### `src/components/dashboard/builders/bp02/BP02Builder.tsx`

1. **Add `selectedMagnetIdx` state** — defaults to `(recommended - 1)` or `0`
2. **Magnets tab**: Wrap each card in a `<button>` with `onClick={() => setSelectedMagnetIdx(lmIdx)}`. Add selected/unselected styling (border-primary + checkmark vs dimmed border)
3. **Rename "Quiz" tab** → "Content" — change TabsTrigger value and label
4. **Content tab logic**: 
   - If selected magnet type contains "quiz" or "assessment" (case-insensitive): show current quiz questions/tiers UI
   - Otherwise: show a styled content preview card with the magnet's title, description, format details, and a note "Full content will be built when you publish"
5. **Opt-In tab**: Auto-update the headline placeholder to include the selected magnet's title if no headline is explicitly set
6. **Publish handler**: Include `selected_lead_magnet` index in the saved `content_json` so the microsite knows which one to deploy

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Add magnet selection state, make cards clickable, adapt Content tab, persist selection |

No database or edge function changes needed — the selection is stored within the existing `content_json`.

