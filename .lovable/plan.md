

# Fix: Lead Magnet Builder — Content Consistency + 3 Headers Issue

```
ARCHITECTURE CHECKLIST:
✅ SharedPublishStep.tsx touched? → NO
✅ UniversalBuilderStudio.tsx touched? → NO
✅ New sidebar item added? → NO
✅ New GHL edge function created? → NO
✅ author_nodes touched? → NO
✅ Author-facing text contains banned words? → Zero
✅ Subscription tier values used? → N/A
```

## Problems Identified

**Problem 1 — Step 2 and Step 3 show different content.** Step 2 ("Let Abby Build") displays the raw quiz body (scoring instructions, S-U-C-K-C-E-S-S stages). Step 3 ("Edit Content") seeds from Step 2 but renders differently because `ContentSectionCards` parses the same markdown into collapsible cards, reorganizing the visual layout. This confuses the author — it looks like two different documents.

**Problem 2 — 3 headline variants show as 3 separate section headers.** The AI generation prompt asks for "HEADLINE & SUBHEADLINE (benefit-driven)" and the output includes multiple headline options (Identity, Outcome, Curiosity angles). `ContentSectionCards` parses each ALL-CAPS line as a separate card header, so the author sees 3 headline cards instead of a selection picker.

## Root Causes

1. The `GENERATE_PROMPT` in `LeadMagnetStepRenderer.tsx` (line 33) asks the AI to generate markdown with "1) HEADLINE & SUBHEADLINE, 2) INTRODUCTION, 3) MAIN CONTENT, 4) CALL-TO-ACTION, 5) AUTHOR BIO BLURB" — but the AI outputs multiple headline variants as separate ALL-CAPS sections. `ContentSectionCards` treats each as a major section.

2. Step 3 ("Edit Content") uses `seedFromKey="leadMagnetContent"` and `hideSections={["call-to-action", "author bio", ...]}` so it filters some sections but still shows all headline variants as separate cards.

3. There is a separate dedicated edge function `generate-bp02-lead-magnets` that produces structured JSON with proper `headline_variants` array — but Step 2 does NOT use it. It uses `SharedContentStep` → `business-consultant` with a generic markdown prompt.

## Proposed Fix

### Change 1 — Consolidate headline variants into a single selectable section

**File:** `src/components/dashboard/builders/shared/ContentSectionCards.tsx`

- Add logic to detect consecutive sections whose titles contain "headline" (case-insensitive) — e.g. "IDENTITY HEADLINE", "OUTCOME HEADLINE", "CURIOSITY HEADLINE"
- Merge them into a single "Headline Options" card that displays all 3 as radio-button choices
- When the author picks one, only the selected headline persists in the content
- This keeps the existing parsing logic intact for all other builders

### Change 2 — Align Step 2 and Step 3 display

**File:** `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`

- On the Step 2 ("generate") case, add `autoExpand={true}` to show content as expanded cards (matching Step 3's layout) so both steps look visually consistent
- Add a `stepInstructions` entry: "Pick your headline" so the author knows to select one

### Change 3 — Update the generate prompt to structure headlines clearly

**File:** `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`

- Update `GENERATE_PROMPT` (line 33) to instruct the AI to output headlines under a single section header:
  ```
  1) HEADLINE OPTIONS
  Option A (Identity): "..."
  Option B (Outcome): "..."  
  Option C (Curiosity): "..."
  ```
- This ensures `ContentSectionCards` parses them as one card with 3 sub-items, not 3 separate cards

### Change 4 — Add headline selection UI in ContentSectionCards

**File:** `src/components/dashboard/builders/shared/ContentSectionCards.tsx`

- When a section title matches "HEADLINE OPTIONS" (or similar), render the body items as clickable cards with radio selection instead of a plain text block
- Selected headline gets a visual checkmark and is promoted to the top
- On save, only the selected headline flows into the content

## Summary of Changes

| File | Change |
|------|--------|
| `LeadMagnetStepRenderer.tsx` | Update GENERATE_PROMPT to group headlines under one section; add autoExpand to Step 2 |
| `ContentSectionCards.tsx` | Add headline-selection UI when section title contains "HEADLINE OPTIONS" |

## What This Fixes

- Step 2 and Step 3 display content in the same card-based layout (no more "two different documents" feel)
- 3 headline variants appear as a single selection card instead of 3 separate headers
- Author can tap to choose their preferred headline before moving to Step 3

