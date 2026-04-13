

# Simplify Step 3 — Change "Edit Content" to "Choose Your Headline"

## What Changes

Step 3 currently duplicates Step 2 as a full content editor. Since Step 2 ("Let Abby Build") already supports editing, Step 3 will become a focused headline picker: show 3 headline options as clickable cards, author picks one, done.

## How

### 1. Create `HeadlinePickerStep.tsx`

New component at `src/components/dashboard/builders/lead-magnet/HeadlinePickerStep.tsx`:

- Parse `stepData.leadMagnetContent` (the generated markdown from Step 2) to extract the 3 headline variants from the "HEADLINE OPTIONS" section
- Also handle legacy content where headlines appear as separate ALL-CAPS sections (reuse the `isHeadlineVariant` / `sharesWord` logic)
- Display 3 clickable cards (similar style to `GenericOptionSelector`) — each showing the headline text with a label like "Identity", "Outcome", "Curiosity"
- On selection, save the chosen headline to `stepData.leadMagnetSelectedHeadline`
- Include Abby tip: "Pick the headline that best speaks to your reader's identity or desired outcome."
- Show a "Save & Continue" button that calls `onMarkEdited`

### 2. Update `LeadMagnetStepRenderer.tsx`

- Replace the `case "edit"` block: instead of `SharedContentStep`, render `HeadlinePickerStep`
- Pass `stepData`, `setStepData`, `onMarkEdited`, `stepId`

### 3. Update step label (if configured elsewhere)

- Search for where the step labels ("Edit & Polish", "Edit Content") are defined and rename to "Choose Headline"

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/builders/lead-magnet/HeadlinePickerStep.tsx` | New — 3-option headline selector |
| `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx` | Replace `case "edit"` with `HeadlinePickerStep` |
| Step config file (if any) | Rename step label to "Choose Headline" |

