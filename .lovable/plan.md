# Rebuild BA-11 Audiobook Studio (ElevenLabs)

The backend, BA11Builder shell, and storage are already intact. Only the 5 step UIs (currently a stub) need to be rebuilt and wired to the existing edge functions.

## What stays as-is

- `BA11Builder.tsx` — stepper, gating, autosave, blob-URL healing (already correct)
- All edge functions: `get-manuscript-source`, `ba11-voice-preview`, `ba11-audiobook-generate`, `ba11-publish-audiobook`, `distribute-audiobook`
- Storage bucket `audiobook-audio`, path convention `{user_id}/{book_id}/chapter-NNN.mp3`
- `listAudiobookChapters` helper in `src/lib/builder-autosave.ts`
- `DistributeAudiobookModal` (already exists at `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`)

## What gets built

Replace the stub `src/components/dashboard/builders/audiobook/AudiobookStepRenderer.tsx` with a real renderer that delegates to 5 new step components in the same folder:

### 1. `AudiobookSetupStep.tsx` — `stepId="setup"`
- Form fields written to `stepData.setup`:
  - Narration style (select): Conversational / Authoritative / Warm-storyteller / Energetic
  - Narrator credit (text, defaults to author's pen name)
  - Suggested retail price USD (number, default $14.99)
  - Short description (textarea, prefilled from book description if available)
- Calls `onMarkEdited("setup")` on change. Gate satisfied when `setup.narration` is set.

### 2. `ManuscriptOptimizationStep.tsx` — `stepId="optimize"`
- Single button: **"Split Manuscript into Chapters"**
- Calls `supabase.functions.invoke("get-manuscript-source", { body: { bookId } })`
- Splits returned text into chapters using existing heuristic: detect `^Chapter \d+`, `^CHAPTER`, `^# ` headings; fall back to ~3500-char paragraph chunks.
- Writes `stepData.chapters = [{ index, title, text, status: "script-ready", audioUrl: "" }]`
- Shows resulting chapter list (title + char count + status badge), with inline title/text edit per chapter.
- Gate satisfied when `chapters.length > 0`.

### 3. `VoiceSelectionStep.tsx` — `stepId="voice"`
- Grid of 10 ElevenLabs voices (using the canonical IDs from the TTS knowledge file: Roger, Sarah, Laura, Charlie, George, Callum, River, Liam, Alice, Matilda).
- Each voice card: name, short style descriptor, **Preview** button.
- Preview calls `supabase.functions.invoke("ba11-voice-preview", { body: { voiceId, text? } })` and plays the returned MP3 (handle base64 or URL response).
- Selecting a voice writes `stepData.selectedVoiceId` and `stepData.selectedVoiceName`.
- Gate satisfied when `selectedVoiceId` is set.

### 4. `ChapterProductionStep.tsx` — `stepId="production"`
- Lists `stepData.chapters` with per-chapter controls:
  - **Generate Audio** button — calls `ba11-audiobook-generate` with `{ voiceId: selectedVoiceId, chapterText: chapter.text, chapterIndex: i, bookId }`. On success, store `audioUrl` from response and set `status: "audio-generated"`.
  - **Generate All** button at top — sequentially generates pending chapters with a small delay (1.5s) between calls to avoid rate limiting; shows live progress bar.
  - Inline `<audio controls src={audioUrl}>` once available, plus **Regenerate** button.
- Persists each completed chapter via `onMarkEdited("production")` so blob-URL healing isn't needed (we store the public storage URL directly).
- Gate satisfied when ≥1 chapter has `status === "audio-generated"`.

### 5. `AudiobookPublishStep.tsx` — `stepId="publish"`
- Shows summary card: voice, # chapters generated, total runtime estimate (chars / 14 ≈ seconds).
- **Publish & Open Distribution** button:
  1. Calls `supabase.functions.invoke("ba11-publish-audiobook", { body: { bookId, voiceId, chapters: [...], setup, retailPriceUsd } })` to mark the audiobook live in the registry.
  2. On success, opens `DistributeAudiobookModal` (already built) for ACX/Spotify/Apple/Findaway/Platform package generation via `distribute-audiobook`.
- Shows `PublishSuccessScreen` (shared) once published.

### 6. `AudiobookStepRenderer.tsx` — switch on `stepId`
Plain `switch` returning the right step component, forwarding props (`stepData`, `setStepData`, `onMarkEdited`, `bookId`, `bookTitle`, `userId`, `generationState`, `setGenerationState`).

## Bug-fixes baked in from history

- **Never persist `blob:` URLs** — only store the public `audioUrl` returned from the edge function (which uploads to `audiobook-audio` bucket).
- **Use `supabase.functions.invoke()`** everywhere — not raw `fetch` to `/api/...` paths.
- **Manuscript step gates production** — production button disabled until chapters exist (already enforced by `canAdvance` in BA11Builder).
- **Session healing on reload** — already handled by BA11Builder's `listAudiobookChapters` effect; new components must read `chapter.audioUrl` and treat empty as "needs generation".
- **ElevenLabs 4500-char cap** — UI shows a warning when a chapter exceeds the cap so the author can split it before generating.

## Files to create

- `src/components/dashboard/builders/audiobook/AudiobookSetupStep.tsx`
- `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx`
- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`
- `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`
- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`
- `src/components/dashboard/builders/audiobook/voices.ts` (the 10-voice catalogue)

## Files to replace

- `src/components/dashboard/builders/audiobook/AudiobookStepRenderer.tsx` — swap stub for real switch.

## Out of scope (can ship later)

- Multi-chunk stitching for chapters longer than 4500 chars (current behavior: server truncates; UI warns).
- Custom voice cloning (ElevenLabs Voice Library connect).
- Background music bed / chapter intro stings.

Approve to proceed and I'll implement all 6 files in one pass.
