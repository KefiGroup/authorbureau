

# Fix: 3 Headers Still Showing in Lead Magnet Edit Step

## Problem

The screenshot shows three separate section cards at Step 3 ("Edit Content"):
- "SUCKCESS Starter Quiz: What Stage Are You In Right Now?"
- "The SUCKCESS Stage Finder: Where Are You Right Now?"
- "The SUCKCESS Compass Quiz: Identify Your Current Stage"

These are **quiz title variants** — the same concept as headline options. But the merge logic in `ContentSectionCards.tsx` (line 214) only merges sections matching `/headline/i`. These titles don't contain "headline", so they remain as 3 separate cards.

The prompt was updated to say "HEADLINE OPTIONS" but the **already-generated content** was produced by the old prompt, so it doesn't follow the new format.

## Root Cause

Two issues:
1. **Detection too narrow**: The headline merge regex `/headline/i` doesn't catch variant patterns like quiz title options that share similar structure but different naming
2. **Old content**: The existing `stepData.leadMagnetContent` was generated before the prompt change, so it uses the old format with separate ALL-CAPS title sections

## Fix

### Change 1 — Broaden headline/title variant detection

**File:** `src/components/dashboard/builders/shared/ContentSectionCards.tsx` (lines 213-220)

Expand the merge condition to also catch consecutive sections that look like title/quiz variants. The heuristic: if 2-3 consecutive sections all have short titles (under ~80 chars) that share significant word overlap (e.g. all contain "SUCKCESS" or "Quiz"), merge them into a "HEADLINE OPTIONS" card.

```typescript
// Current (line 214):
if (/headline/i.test(sec.title) && !/options/i.test(sec.title)) {

// Updated:
const isHeadlineVariant = (title: string) => {
  if (/headline/i.test(title) && !/options/i.test(title)) return true;
  // Titles under 80 chars that look like quiz/title variants
  if (title.length < 80 && /^(the\s+)?[A-Z].*?(quiz|finder|compass|assessment|checker|test|starter)/i.test(title)) return true;
  return false;
};

if (isHeadlineVariant(sec.title)) {
```

Additionally, add a **word-overlap check**: only merge if 2+ consecutive candidate sections share at least one significant word (3+ chars). This prevents false merges on unrelated sections.

### Change 2 — Handle already-generated content gracefully

Since the old content is already stored in `stepData`, we can't change it retroactively. The broadened detection in Change 1 will handle this. But as a safety net, also check for 3+ consecutive sections with no body content or very short bodies (under 200 chars) that could be title variants.

## Files Changed

| File | Change |
|------|--------|
| `ContentSectionCards.tsx` | Broaden headline merge detection to catch quiz/title variants by pattern + word overlap |

## What This Fixes

- The 3 quiz title variants merge into a single "HEADLINE OPTIONS" selection card
- Future generations also benefit from broader detection
- No other builders are affected (word-overlap check prevents false merges)

