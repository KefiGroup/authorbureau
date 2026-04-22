
## Plan — unblock BA-11 voice preview by bypassing the stale gateway path

### What the code audit shows

- The failing UI is the **new BA-11 builder flow**, not the legacy audiobook studio:
  - `src/components/dashboard/builders/ba11/BA11Builder.tsx` renders `AudiobookStepRenderer`
  - `AudiobookStepRenderer` renders `VoiceSelectionStep`
- `VoiceSelectionStep.tsx` is already using the correct shared-session transport:
  - `getActiveToken()`
  - `fetchWithTimeout()`
  - explicit `Authorization: Bearer <token>`
  - `voiceId: voice.elevenLabsId`
- `ChapterProductionStep.tsx` is also already sending `voiceId` with the active token.
- `supabase/functions/elevenlabs-tts-audiobook/index.ts` does accept `voiceId` directly.
- `supabase/config.toml` already contains:
  - `[functions.elevenlabs-tts-audiobook]`
  - `verify_jwt = false`

### Key diagnosis

The remaining failure is still **before the function body runs**:

- The user sees raw HTTP 401s.
- The function log snapshot for `elevenlabs-tts-audiobook` shows only **boot/shutdown**, with **no runtime request logs at all**.
- By contrast, `get-manuscript-source` shows normal runtime logs once its gateway issue was cleared.

That means the current `elevenlabs-tts-audiobook` deployment path is still being rejected at the gateway, even though the code and config now look correct.

## Implementation plan

### Phase 1 — Stop fighting the stale deployment; create a fresh function endpoint

Create a new edge function name, for example:

- `supabase/functions/elevenlabs-tts-audiobook-v2/index.ts`

Copy the current audiobook TTS implementation into it and add a dedicated config entry:

```toml
[functions.elevenlabs-tts-audiobook-v2]
  verify_jwt = false
```

Why: the old function name appears to have a stale gateway/deployment state. A fresh function name forces a fresh manifest path instead of reusing the poisoned one.

### Phase 2 — Add unmistakable runtime diagnostics at the top of the new function

At the very top of the handler, before auth resolution:

- log `"[tts-v2] request started"`
- log whether `Authorization` exists
- log the requested `action`

Inside auth resolution, log every branch:

- JWT decode success/failure
- local auth success/failure
- shared-backend success/failure

This will make it immediately obvious whether requests are reaching runtime.

### Phase 3 — Simplify auth for preview requests

For `action === "preview-voice"`:

- validate the bearer token in code
- do **not** require book lookup or ownership logic
- proceed once user identity is resolved from claims/token

Why: preview only needs authenticated usage control for the paid TTS API. It does not need database ownership checks, so its auth path should be the simplest and least brittle.

### Phase 4 — Keep ownership checks only for chapter generation actions

For:

- `generate-chunk`
- `generate-chapter`
- `finalize-chapter`

keep the existing authenticated ownership checks against the book record, but after the new function’s auth resolution is confirmed working.

This preserves security while separating “preview auth” from “book ownership auth.”

### Phase 5 — Switch BA-11 callers to the fresh endpoint

Update both builder components to call the new function URL:

- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`
- `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`

Only the endpoint path changes; keep the current token transport and `voiceId` payload shape.

### Phase 6 — Verify in order

1. Click Sarah preview in BA-11.
2. Confirm the new function logs show:
   - request started
   - auth branch logs
   - preview action log
3. Confirm the response is HTTP 200 with `audioBase64`.
4. Confirm the browser plays the preview.
5. Generate Chapter 1 to verify the same endpoint also works for production.

## Files to update

- **New**: `supabase/functions/elevenlabs-tts-audiobook-v2/index.ts`
- **Update**: `supabase/config.toml`
- **Update**: `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`
- **Update**: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`

## Why this is the right next move

The current builder code is already sending the correct token and the correct `voiceId`. Since the function still returns raw 401 with no runtime logs, continuing to tweak client payloads or `resolveUser()` inside the existing function is unlikely to help. The cleanest fix is to move BA-11 onto a fresh function deployment path and instrument it heavily so the next test gives definitive backend evidence.

## Scope

- No database migration
- No RLS changes
- No frontend design changes
- Backend/auth transport hardening only
