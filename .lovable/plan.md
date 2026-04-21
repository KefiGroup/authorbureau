

## Plan — fix manuscript 401 + verify voice preview

### Phase 1 — New edge function `get-manuscript-source`

Create `supabase/functions/get-manuscript-source/index.ts` that:
- Accepts `{ bookId }` in the body.
- Resolves the user via Cloud token first, then shared-backend token + email reconciliation (mirrors `parse-manuscript`/`get-author-book`).
- Uses the **service-role client** to query `generated_assets` with `book_id = bookId`, `asset_type = 'source_material'`, trying `author_id` candidates: `userId` plus all `author_profiles.id where user_id = userId`.
- Verifies ownership via `books.author_id IN (candidates) OR books.owner_email = userEmail`.
- Returns `{ success: true, content, characterCount }` on hit, or `{ success: false, error: "No manuscript found. Please upload it in the Book Hub." }` (HTTP 200 envelope so the SDK doesn't swallow the message).
- Standard CORS headers + `OPTIONS` handler. No `verify_jwt` override needed (defaults to false for this project).

### Phase 2 — Rewrite `handleGenerate` in `ManuscriptOptimizationStep.tsx`

Replace both direct browser queries (`books` + `generated_assets`) with a single:
```ts
supabase.functions.invoke("get-manuscript-source", { body: { bookId } })
```
Keep `splitIntoChapters` and `buildAutoSuggestions` as-is — they work fine, they just never received text.

Friendly error mapping:
- `error` includes "No manuscript" → "Upload your manuscript in the Book Hub first." (toast with action hint)
- Network/timeout → "Couldn't reach Abby. Try again in a moment."
- Content < 500 chars → "Your manuscript looks too short — please re-upload."

### Phase 3 — Verify voice preview fix is actually live (your concern)

Before declaring Phase 1 complete, I will:
1. Re-read the deployed `VoiceSelectionStep.tsx` to confirm the prior fix (action `preview-voice`, `voiceKey: voice.id`, base64 data URI playback) is still on disk and not reverted.
2. Read the deployed `elevenlabs-tts-audiobook/index.ts` to confirm it accepts `action: "preview-voice"` with `voiceKey` and returns `{ audioBase64 }`.
3. Tail recent logs for `elevenlabs-tts-audiobook` for the `preview-voice` action to confirm a real ElevenLabs call succeeded the last time it ran (or, if no recent attempts, call the function directly with a test payload via `curl_edge_functions` and confirm a non-empty `audioBase64` response).
4. Only after that confirmation do we proceed to Phase 4.

If step 1-3 reveals the client/edge contract is **still** mismatched, I'll re-apply the contract fix in the same turn (no extra round-trip).

### Phase 4 — End-to-end verification on Be SUCKcessful

1. Click **Optimize for Audio** → expect ~20 chapters parsed from the 100,589-char manuscript (no more 401, no more "0 chapters").
2. **Next: Voice** unlocks (gating already in place).
3. Click ▶ on Sarah / Brian / Lily → audio plays within ~2 s.
4. Pick a voice → **Next: Production** unlocks → generate Chapter 1 audio → MP3 plays inline.

## Files touched

- **New**: `supabase/functions/get-manuscript-source/index.ts`
- **Updated**: `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx`
- **Read-only audit (no changes unless drift detected)**: `src/components/dashboard/builders/audiobook/VoiceSelectionStep.tsx`, `supabase/functions/elevenlabs-tts-audiobook/index.ts`

No DB migrations. No RLS changes. No new secrets. Edge function deploys automatically.

