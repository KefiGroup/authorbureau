
## Root cause

The BA-11 voice preview failure is still a gateway-level auth rejection, not an ElevenLabs or playback bug.

Evidence from the current code and logs:
- `VoiceSelectionStep.tsx` is sending the request correctly to `.../functions/v1/elevenlabs-tts-audiobook-v2` with `Authorization: Bearer ${token}` and `voiceId`.
- `supabase/config.toml` already contains `[functions.elevenlabs-tts-audiobook-v2] verify_jwt = false`.
- `elevenlabs-tts-audiobook-v2/index.ts` has top-of-handler logs (`[tts-v2] request started`, auth logs, action logs).
- But `edge_function_logs("elevenlabs-tts-audiobook-v2")` returns **no logs at all**.

That combination means the request is being rejected **before the function body runs**. The local backend cannot verify the shared Manus auth token (`unrecognized JWT kid ... ES256` in auth logs), so any path where the gateway still tries to verify JWT will produce the raw 401 the user sees.

## Plan

### 1) Stop using the poisoned `elevenlabs-tts-audiobook-v2` route
Create a brand-new minimal endpoint for BA-11 voice preview, with a fresh function name such as:
- `supabase/functions/ba11-voice-preview/index.ts`

Why:
- `get-manuscript-source` already proves the token transport works in this app.
- `elevenlabs-tts-audiobook-v2` is still not reaching runtime despite correct config, so it is not a reliable endpoint to keep iterating on.

### 2) Make the new preview function minimal and modern
Implement only the preview use case first:
- Accept `{ voiceId }`
- Require `Authorization`
- Validate identity in-code using the simplest working path:
  - JWT decode first
  - optionally `auth.getClaims(token)` if needed
  - avoid depending on local `/user` validation as the primary path
- Call ElevenLabs and return `{ audioBase64, format: "mp3" }`

Important implementation details:
- Use current stable imports (`npm:@supabase/supabase-js` or the project’s modern function pattern), not the older `esm.sh` pattern.
- Keep CORS on every response.
- Return clear JSON errors with HTTP status and message.
- Add unmistakable logs at the very top: request started, auth header present, action/voiceId.

### 3) Give the new function its own explicit config and deploy it cleanly
Add:
```toml
[functions.ba11-voice-preview]
  verify_jwt = false
```

Then explicitly deploy **only** this new function so the gateway gets a fresh manifest path.

### 4) Point BA-11 voice preview to the new function
Update:
- `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`

Change the preview URL from:
- `elevenlabs-tts-audiobook-v2`

to:
- `ba11-voice-preview`

Keep:
- `getActiveToken()`
- `fetchWithTimeout()`
- `Authorization: Bearer ${token}`
- `voiceId: voice.elevenLabsId`

### 5) Improve client-side error reporting for preview
The UI currently falls back to a generic “Could not play voice preview.” Update preview handling so it:
- reads the JSON error body when status is not OK
- shows the actual backend message in the toast
- always resets the loading state
- guards against duplicate clicks while one preview request is in flight

This will prevent another silent failure loop.

### 6) Verify the fresh endpoint before retesting the UI
After deployment:
1. Call the new function directly with the logged-in session token.
2. Confirm `edge_function_logs("ba11-voice-preview")` shows runtime entries.
3. Confirm the response is HTTP 200 with `audioBase64`.
4. Retry Sarah/Lily/Brian in BA-11 and confirm audio plays.

### 7) Only after preview works, migrate chapter generation off the broken route too
`ChapterProductionStep.tsx` still points to `elevenlabs-tts-audiobook-v2`. Once the fresh preview endpoint is proven:
- either create a second fresh production endpoint (recommended), or
- migrate chapter generation onto a fresh shared BA-11 TTS endpoint

This avoids hitting the same gateway 401 one step later.

## Files to update

- New: `supabase/functions/ba11-voice-preview/index.ts`
- Update: `supabase/config.toml`
- Update: `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`

Likely next pass after preview succeeds:
- Update: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`
- Possibly new: `supabase/functions/ba11-audiobook-generate/index.ts`

## Expected result

After this change, clicking any BA-11 play button should:
- hit a fresh function route that actually reaches runtime
- bypass gateway JWT verification
- resolve the logged-in user from the shared-session token
- return preview audio successfully instead of raw HTTP 401
