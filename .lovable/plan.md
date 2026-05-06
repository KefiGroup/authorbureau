## Two fixes

### 1. Remove the 3 "Mark as submitted" rows
File: `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`, lines 246–283.

Strip the per-channel checklist (ACX / Spotify / Apple Books rows + buttons + `distributionStatus` mapping). Keep only the three auto-completed rows: Saved to Library, Live on author site, Export Pack generated.

Replace the helper text to point clearly at the Export Pack section *below* (which is where the download button actually lives — current copy says "above" which is wrong, that's the bug in your screenshot).

New block:
```tsx
<ul className="space-y-2 text-sm">
  <ChecklistRow done label="Saved to My Library" />
  <ChecklistRow done label="Live on your author site (Buy Now enabled)" />
  <ChecklistRow done label="Export Pack (ZIP + ACX guide) generated" />
</ul>
<p className="text-xs text-muted-foreground">
  ACX, Spotify, Apple Books and Findaway require manual upload — Authors Bureau does not
  submit on your behalf. Download the Export Pack below and follow ACX-UPLOAD-GUIDE.txt
  inside the ZIP for step-by-step instructions per retailer.
</p>
```

Also delete the now-unused `CHANNEL_LABELS`, `distributionStatus`, `toggleChannel`, `savingChannel` state and any related fetch (lines ~30–80 area). Will clean those in the same edit.

### 2. "Where's the Export Pack?"
It's already on the page — it's the **"Export Audiobook Package"** card with the **"Download Full ZIP"** button (visible in your screenshot, bottom). The confusing word was "above" in the helper text. Fix is the copy change in #1 (says "below" now), so the user knows where to look.

No backend changes. No migrations. One file edited.

## Approval

Approve and I'll make the edit and you'll see it on next refresh.