## Goal

Make BA-11 audiobook publish flow consistent with other BP nodes: clearly state the audiobook gets saved to **My Library**, and improve the "Narrator Name for Credits" field with a recommended default, a one-click reset, and inline validation.

## Changes

### 1. "Saved to Library" messaging (consistency with BP nodes)

**`src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`**
- Under the main `Publish & Open Distribution` button, add a small library badge / helper line:
  > *"Your audiobook ZIP + ACX guide will be saved to **My Library** automatically when you publish."*
- After successful publish (`published === true`), swap that line for a green confirmation: *"Saved to your Library"* with a `Library` icon link to `/dashboard?section=library` (matches the pattern other BP builders use).
- Update the post-distribution toast to read: *"Audiobook saved to My Library — ZIP + ACX guide ready to download."*

### 2. Narrator Name for Credits — helper, reset, validation

**`src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`**
- Pass `voiceName` (already in scope) and `bookTitle` into `<DistributeAudiobookModal>` as new props.

**`src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`** (Step 1)
- Accept new props: `voiceName?: string`, `bookTitle?: string`.
- Compute `recommendedCredit = "${voiceName} (ElevenLabs AI voice)"` (fallback to current default if no voiceName).
- On modal open, if `narratorCredit` is empty OR equals the previous default, prefill with `recommendedCredit`.
- Add a small **"Reset to recommended"** ghost button to the right of the field label that sets the input back to `recommendedCredit`.
- Add helper text under the input:
  > *"Shown as 'Narrated by …' on Audible, Spotify, Apple Books and your microsite. ACX requires you to disclose AI/synthetic narration — keep 'ElevenLabs AI voice' (or similar wording) in the credit."*
- Add inline validation (red text + disable Next button) when:
  - empty / whitespace, OR
  - trimmed value equals `bookTitle` (case-insensitive) → *"This looks like your book title, not a narrator name. Try '{recommendedCredit}'."*
- Validation message + disabled state replace the existing `disabled={!narratorCredit.trim()}` on the Next button.

## Out of scope
- No DB / edge function changes — `distribute-audiobook` already accepts `narratorCredit` as-is.
- No changes to Voice step or library asset writer (BA-11 already writes `audio_zip` per Sprint 54).

## Files touched
- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`
- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`
