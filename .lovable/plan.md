## Problem

In **BA-11 Audiobook Studio** the narrator "Preview" button shows:

> Preview failed — FunctionsHttpError: Edge Function returned a non-2xx status code

The `preview-voice` action in `elevenlabs-tts-audiobook` is currently gated behind the auth check. When the shared-backend session token is briefly unavailable (page transition, recent refresh, dashboard mounting AudiobookStudio), the function returns 401 and the toast fires. The voice sample is a generic sentence with no PII or per-user data, so it should be public — same treatment we already gave `list-voices` in the previous sprint.

A second related caller, `VoiceSelectionStep.tsx`, still uses the legacy `supabase.functions.invoke("ba11-voice-preview", …)` pattern which doesn't carry the shared-backend token and produces the exact "FunctionsHttpError" message seen in the toast.

## Fix

1. **`supabase/functions/elevenlabs-tts-audiobook/index.ts`**
   - Move the `preview-voice` branch above the `Authorization` check (right after `list-voices`).
   - Sample text is a static "Hello, this is a preview…" string — no auth needed.
   - Keep `generate-chunk` / `generate-chapter` / `finalize-chapter` strictly authenticated.

2. **`supabase/functions/ba11-voice-preview/index.ts`** (used by the older grid UI)
   - Verify it does the same: voice sample generation can be public; gate only the per-user write paths.
   - If the function currently checks JWT, remove the gate for the preview-only action.

3. **`src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`**
   - Replace `supabase.functions.invoke("ba11-voice-preview", …)` with the standard `getActiveToken()` + `fetchWithTimeout()` pattern so the call works on freshly-restored sessions and matches the rest of the platform.

4. **Redeploy** `elevenlabs-tts-audiobook` and `ba11-voice-preview`, then verify with curl that `preview-voice` returns 200 without an Authorization header.

## Files to edit

- `supabase/functions/elevenlabs-tts-audiobook/index.ts`
- `supabase/functions/ba11-voice-preview/index.ts`
- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`

No DB migrations, no schema changes. Aligns with the existing **Auth Standardization** + **Edge Function Protection** rules in Master Architecture.
