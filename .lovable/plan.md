

## Fix: Lead Magnet Edit Step — Show Only Relevant Content

### Problem
Step 3 ("Edit & Polish") displays the full AI output as editable cards, including CTA product recommendations (Workbook, Home Study, Online Course) that don't exist yet and confuse the user. It also still shows a "Generate" button even though content is seeded from Step 2.

### Solution
Two targeted changes to make the Edit step focused and intuitive.

---

### Change 1: Filter out CTA cards in Edit step

**File: `src/components/dashboard/builders/shared/SharedContentStep.tsx`**

Add an optional `hideSections` prop (array of section title keywords like `"call-to-action"`, `"author bio"`). When rendering `ContentSectionCards`, filter out sections whose titles match any keyword in `hideSections`. This keeps the CTA and bio visible in Step 2 (review) but hidden in Step 3 (edit).

Also: when `seedFromKey` has populated content, skip showing the "Generate" button and go straight to displaying the editable cards.

### Change 2: Pass section filters from the Edit step

**File: `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`**

Update the `edit` case to pass:
```
hideSections={["call-to-action", "author bio"]}
```

This ensures the edit step only shows the lead magnet body: headline, introduction, and checklist/quiz content sections.

---

### Files Changed

| File | What |
|------|------|
| `SharedContentStep.tsx` | Add `hideSections` prop; skip Generate button when seeded content exists |
| `LeadMagnetStepRenderer.tsx` | Pass `hideSections` to the edit step |

No database or edge function changes needed.

