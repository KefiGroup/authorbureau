

# Audiobook Studio: Remove "Generate All" and Add Re-generation Paywall

## Changes

### 1. Remove "Generate All Chapters" button and related code
- Delete the `handleGenerateAll` function (lines 232-253)
- Remove the full-width "Generate All Chapters" / "Regenerate All Chapters" button at the bottom (lines 473-485)

### 2. Add $9 re-generation gate for already-generated chapters
- When a chapter has `status === "done"`, replace the current Generate button behavior:
  - Show a "Regenerate ($9)" button instead of auto-allowing free retry
  - On click, show a confirmation dialog: "Re-generating this chapter costs $9. Continue?"
  - For now, gate with a confirmation toast/dialog — Stripe payment integration can be wired later
- Chapters with `status === "pending"` (never generated) keep the free "Generate" button
- Chapters with `status === "error"` keep the free "Retry" button (failed attempts shouldn't cost)

### 3. UI summary
- Each chapter row shows:
  - **Pending**: Free "Generate" button
  - **Done**: "Regenerate ($9)" button (with confirmation)
  - **Error**: Free "Retry" button
  - **Generating**: "Generating..." badge (unchanged)

### Technical detail
- File: `src/components/dashboard/AudiobookStudio.tsx`
- Add a `handleRegenerateSingle(i)` that shows a confirm dialog before calling `generateChapter`
- The done-state row gets a new "Regenerate ($9)" button calling this handler

