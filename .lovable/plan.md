

## Diagnosis

Two independent bugs remaining in BA-11.

### Bug A — Generate Audio: HTTP 0 (client abort), not CORS

The v2 function logs prove the request **does** reach runtime and is processed:

```
[tts-v2] request started
[tts-v2] auth: jwt-decode SUCCESS
[tts-v2] action generate-chapter
[tts-v2] user resolved { via: "jwt-decode" }
```

There is no completion log. ElevenLabs chapter synthesis for a real chapter can take 30-90s, but `fetchWithTimeout` defaults to 25s — the browser aborts, which surfaces as `HTTP 0` and looks like CORS. The function keeps running and eventually shuts down with no observable result.

Plus, per the architecture decision we already made, BA-11 should not depend on the poisoned `elevenlabs-tts-audiobook-v2` route at all. We need a fresh production endpoint, mirroring `ba11-voice-preview`.

### Bug B — author_nodes 401: PostgREST rejects shared-backend JWT

`builder-autosave.ts` uses the Cloud Supabase client to write to `author_nodes`. The browser session is signed by the **shared Manus backend** (kid `10e65b79-...` ES256). Cloud auth logs confirm:

```
GET /user → 403 bad_jwt: unrecognized JWT kid 10e65b79-... for algorithm ES256
```

PostgREST in Cloud verifies every incoming JWT and cannot be told `verify_jwt = false`. Therefore **direct browser writes to `author_nodes` will always return 401** for shared-backend-authenticated users. Only edge functions (which we set `verify_jwt = false` and decode the JWT in code, exactly like `check-subscription` already does) can persist to this table on behalf of the user.

RLS on `author_nodes` is `(author_id IN (SELECT id FROM author_profiles WHERE user_id = auth.uid()))`, which is unreachable from the browser session.

## Plan

### Phase 1 — Fresh chapter generation endpoint with long timeout

**New**: `supabase/functions/ba11-audiobook-generate/index.ts`
- Same shape as `ba11-voice-preview`: in-code JWT decode, no DB ownership check needed, CORS on every response.
- Action `generate-chapter`: accepts `{ voiceId, chapterText, chapterIndex, bookId }`, calls ElevenLabs, returns `{ audioBase64, format: "mp3" }`. Server-side has no client timeout — the function will run as long as ElevenLabs needs.
- Optionally upload the resulting MP3 into `audiobook-audio` storage bucket and return a public `audioUrl`. Phase 1 returns base64; client converts to a blob URL for inline playback. (Storage upload can be Phase 1.5 if needed.)
- Add explicit log lines at every branch.

**Config**: add to `supabase/config.toml`:
```toml
[functions.ba11-audiobook-generate]
  verify_jwt = false
```

### Phase 2 — Switch ChapterProductionStep to the new endpoint with longer timeout

**Update**: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`
- Change URL from `elevenlabs-tts-audiobook-v2` → `ba11-audiobook-generate`.
- Pass `fetchWithTimeout(url, opts, 120_000)` so the browser waits up to 2 minutes for chapter synthesis.
- On success, decode `audioBase64` → `Blob` → `URL.createObjectURL` → assign to `audioUrl` so the existing `<audio>` element plays it inline.
- Surface the actual backend error message in the toast (currently swallows everything as "Audio generation failed").

### Phase 3 — Move `author_nodes` autosave behind an edge function

**New**: `supabase/functions/save-author-node/index.ts`
- `verify_jwt = false`, in-code JWT decode (same pattern as `check-subscription` and `ba11-voice-preview`).
- Body: `{ authorId, nodeId, nodeName, content, currentStep }`.
- Resolves the user via JWT, validates that the resolved `sub` matches `author_profiles.user_id` for the supplied `authorId` (server-side ownership check, since RLS is bypassed via service role).
- Performs the same upsert logic that `autosaveBuilderDraft` does today: select existing row, never downgrade `live`, then update or insert.
- Uses `SUPABASE_SERVICE_ROLE_KEY`.

**Config**: add to `supabase/config.toml`:
```toml
[functions.save-author-node]
  verify_jwt = false
```

**Update**: `src/lib/builder-autosave.ts`
- Replace direct `supabase.from("author_nodes")` calls with a `fetch` to `save-author-node` using `getActiveToken()` + `fetchWithTimeout()`.
- Keep the function signature identical so all 28 builders that already call `autosaveBuilderDraft` keep working transparently.
- `loadBuilderDraft` similarly needs an edge function or a public-readable view; for now, route reads through a new `get-author-node` action on the same `save-author-node` function (action-routed), or a sibling `get-author-node` function. Recommend: action-routed inside `save-author-node` so we ship one function.

This fixes the 401 not just for BA-11 but for every BA/YR builder that autosaves — they are all currently broken for shared-backend users in the same way.

### Phase 4 — Verification order

1. Click **Generate Audio** on Chapter 1. Confirm `ba11-audiobook-generate` logs show request + ElevenLabs success, browser plays the resulting MP3 inline.
2. Watch network tab while clicking through any builder step — `save-author-node` returns HTTP 200 instead of `author_nodes` 401.
3. Refresh the page — BA-11 resumes on the same step (proves load path also works).
4. Re-test BA-11 end-to-end: setup → manuscript → voice → production → publish.

## Files touched

- **New**: `supabase/functions/ba11-audiobook-generate/index.ts`
- **New**: `supabase/functions/save-author-node/index.ts` (handles both save and load via `action`)
- **Update**: `supabase/config.toml` (two new function blocks)
- **Update**: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx` (new URL, 120s timeout, base64→blob playback, real error toast)
- **Update**: `src/lib/builder-autosave.ts` (route both save and load through `save-author-node`)

## Scope

- No DB migration.
- No RLS changes (RLS on `author_nodes` stays as-is; service-role edge function bypasses it after server-side ownership check).
- No new secrets (`ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` already configured).
- Backend auth transport + endpoint hygiene only.

## Why this is the right next move

- Bug A is a timeout, not CORS. The fix is a fresh long-running endpoint plus a longer client timeout.
- Bug B is structural: shared-backend JWTs cannot pass Cloud PostgREST. The platform-wide fix is to gate every write to Cloud tables behind `verify_jwt = false` edge functions that decode the JWT in code — which `check-subscription` and `ba11-voice-preview` have already proven works reliably.

