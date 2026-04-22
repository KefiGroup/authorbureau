

## Plan — fix BA-11 voice preview (two bugs stacked)

### Diagnosis

Two independent bugs are both blocking voice preview:

**Bug 1 — Gateway not honouring `verify_jwt = false` for `elevenlabs-tts-audiobook`.**
Same symptom we just fixed for `get-manuscript-source`: zero edge function logs after the user clicks preview, despite the client sending a valid token. `supabase/config.toml` line 54-55 already has the right config — it just hasn't been picked up by the gateway because the function hasn't been redeployed since.

**Bug 2 — Voice ID contract mismatch between client and edge function.**
- `src/components/dashboard/builders/audiobook/types.ts` defines `VOICE_OPTIONS` with `id: "v1"`, `"v2"`, … `"v10"`.
- `VoiceSelectionStep.tsx` line 67 sends `voiceKey: voice.id` → so it sends `"v1"`, `"v2"`, etc.
- `supabase/functions/elevenlabs-tts-audiobook/index.ts` `VOICES` map is keyed by `"sarah"`, `"george"`, `"laura"`, …
- Result: `VOICES[body.voiceKey]` is always `undefined` → function throws `"Unknown voice key"` → client shows generic "Could not play voice preview" toast.
- Bonus issue: `Liam` (v8) and `Chris` (v10) don't exist in the edge function's `VOICES` map at all.

Both bugs must be fixed together — fixing only the gateway would still result in "Unknown voice key", and fixing only the contract would still hit a gateway 401.

### Phase 1 — Force-redeploy `elevenlabs-tts-audiobook`

Use `supabase--deploy_edge_functions` to redeploy `elevenlabs-tts-audiobook`. Re-reads `config.toml`, applies `verify_jwt = false` at the gateway, and bumps the function manifest. No code change needed for this.

### Phase 2 — Fix the voice-id contract

Send the actual ElevenLabs voice ID from the client and have the edge function accept it directly, removing the brittle nickname lookup.

**File: `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`**
- Change `body: JSON.stringify({ action: "preview-voice", voiceKey: voice.id })` to `voiceId: voice.elevenLabsId`. Use the same field for the chapter generation call later in BA-11.

**File: `supabase/functions/elevenlabs-tts-audiobook/index.ts`**
- In `preview-voice`, `generate-chunk`, `generate-chapter`: accept either `voiceId` (preferred — already an ElevenLabs ID) or fall back to the legacy `voiceKey` nickname lookup for any other callers. Pass the resolved ID straight to `generateTTS`.
- Keeps backward compatibility with anything still sending `voiceKey: "sarah"`.

### Phase 3 — Direct test before user retest

Use `supabase--curl_edge_functions` to call `elevenlabs-tts-audiobook` with `{ action: "preview-voice", voiceId: "EXAVITQu4vr4xnSDxMaL" }` (Sarah). Expect a JSON response with `audioBase64` populated. If it fails, inspect the now-populated logs and patch immediately in the same turn.

### Phase 4 — End-to-end on Be SUCKcessful

1. Re-open Voice step.
2. Click ▶ on Sarah, Brian, Lily — audio plays within ~2s.
3. Pick a voice → **Next: Production** unlocks.
4. Generate Chapter 1 audio → MP3 plays inline. (Chapter generation uses the same `voiceKey` path today, so the same fix unblocks it.)

### Phase 5 — Audit chapter generation call (same bug, downstream)

`ChapterProductionStep.tsx` also passes a voice nickname into the same edge function. Once the contract is `voiceId`, update that call too so we don't trip the exact same trap one step later. Will do this in the same pass.

### Files touched

- **No new files.**
- **Updated**: `supabase/functions/elevenlabs-tts-audiobook/index.ts` — accept `voiceId` directly.
- **Updated**: `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx` — send `voiceId: voice.elevenLabsId`.
- **Updated**: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx` — send `voiceId: voice.elevenLabsId` for `generate-chunk` / `generate-chapter`.
- **Redeploy**: `elevenlabs-tts-audiobook` to refresh gateway manifest.

No DB migrations. No RLS changes. No new secrets.

