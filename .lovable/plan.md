

## Two fixes — diagnosed

### Issue 1 — Voice preview fails (real cause is NOT a missing API key)

`ELEVENLABS_API_KEY` **is** set in Cloud secrets (managed by the ElevenLabs connector — confirmed in the secret list). The real bug is a **contract mismatch** between the client and the edge function:

| Layer | What it sends / expects |
|---|---|
| `VoiceSelectionStep.tsx` (line 67-70) | `action: "preview"`, `voiceId: <elevenLabsId>`, `text: <sampleText>` — and reads the response as a **binary blob** |
| `elevenlabs-tts-audiobook/index.ts` | Only accepts `action: "preview-voice"` with `voiceKey` (a short key like `"sarah"`), and returns **JSON** with base64 audio |

Result: every preview call falls through to `"Unknown action"` → 400 → toast "Could not play voice preview". No API call to ElevenLabs is ever attempted.

**Fix**: align the client with the existing edge-function contract (no edge changes needed, no redeploy):
- In `VoiceSelectionStep.handlePreview`, send `{ action: "preview-voice", voiceKey: voice.id }` (the local `VoiceOption.id` already matches the keys in the edge function's `VOICES` map: `roger`, `sarah`, `laura`, `george`, `river`, `alice`, `matilda`, `brian`, `lily`, `daniel`).
- Parse the JSON response (`audioBase64`) and play via a `data:audio/mpeg;base64,...` URI (avoids the `atob`/binary corruption pitfall called out in the elevenlabs-tts skill).
- Drop the per-book sample text — the edge function's built-in sample is short and fast (~2 s response), which is what users expect from a preview button.

### Issue 2 — Manuscript step must gate Production

Today `BA11Builder.handleNext` in `ba11/BA11Builder.tsx` allows the user to advance from **Manuscript** → **Voice** → **Production** without ever clicking "Optimize for Audio", so they hit `chapters.length === 0` and see "No chapters found."

**Fix**: gate progression in `BA11Builder` (single source of truth, no changes needed to the step components):

1. Compute `canAdvance` per step:
   - `setup` → always true once narration type chosen
   - `optimize` → `(stepData.chapters?.length ?? 0) > 0` — i.e. user has clicked Optimize and chapters exist
   - `voice` → `stepData.selectedVoiceId` is set
   - `production` → at least one chapter has `status === "audio-generated"` or `"reviewed"`
2. Disable the **Next** button when `!canAdvance`, with a small helper line under it explaining what's missing (e.g. "Click *Optimize for Audio* to continue").
3. Also disable the click-to-jump on the stepper for any step the user hasn't unlocked yet (they can still click *back* to completed steps).

This makes "Optimize for Audio" structurally required without auto-running it — the author keeps explicit control of when AI fires (and spends ElevenLabs credits in step 4).

## Files touched

- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx` — rewrite `handlePreview` to use the correct action / payload / response decoding
- `src/components/dashboard/builders/ba11/BA11Builder.tsx` — add `canAdvance(stepIdx)` gate on the Next button + the stepper buttons, with a helper hint when blocked

No edge function changes. No DB migrations. No new secrets. No redeploys.

## Verification

1. Step 3 → click ▶ on **Sarah** → ~2 s later you hear the sample; the spinner clears via `audio.onended`. Repeat with Brian, Lily, etc.
2. Step 2 with no chapters → click **Next: Voice** → button is disabled, hint reads "Click *Optimize for Audio* to continue."
3. Click **Optimize for Audio** → chapters appear → **Next: Voice** unlocks.
4. Step 3 with no voice selected → **Next: Production** disabled with hint "Select a voice to continue."
5. Step 4 reachable only after a voice is picked, so it never shows "No chapters found" again.

