

## Diagnosis — why the publish button "opens Abby chat"

The button isn't really opening Abby. It's silently failing, and the floating Abby help widget is what the user notices on the page. Three stacked bugs in `distribute-audiobook`:

1. **Auth rejects shared-backend JWTs.** The function uses `supabase.auth.getUser(token)` which returns `bad_jwt: unrecognized JWT kid ... ES256` for the shared Manus session — same gateway issue we already fixed in `ba11-voice-preview`, `ba11-audiobook-generate`, and `save-author-node`. Result: HTTP 401 before anything runs.
2. **Ownership check uses wrong id.** `book.author_id !== user.id` compares an `author_profiles.id` (or `author_profiles.user_id`) against an auth `sub`. Even after fixing auth, this would 403.
3. **No audio files in storage.** `ba11-audiobook-generate` returns chapter MP3s as base64 to the browser; nothing is uploaded to the `audiobook-audio` bucket. So even with auth fixed, `distribute-audiobook` would error "No audio files found."

There is no ZIP download anywhere. There is no confirmation screen with ACX / Google Play links — only an email + a one-line toast. The public page filter `n.node_id.startsWith("BA-11")` already exists, so once `author_nodes` is upserted `status=live` the audiobook will appear at `/pauline-teo`.

## Plan

### Phase 1 — Persist chapter MP3s to storage during generation

Update `supabase/functions/ba11-audiobook-generate/index.ts`:

- After ElevenLabs returns the MP3 bytes, upload to `audiobook-audio/{authorProfileId}/{bookId}/chapter-{NN}.mp3` using the service role client.
- Return both `audioBase64` (for immediate inline preview) AND `audioUrl` (the public URL of the uploaded file).
- Use `chapter-01.mp3`, `chapter-02.mp3` … so a `localeCompare` sort yields chapter order.

Update `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx`:

- Already prefers `data.audioUrl` over base64 (line 63) — no change needed beyond confirming it persists `audioUrl` into the chapter via `updateChapter` (already does).

### Phase 2 — Replace `distribute-audiobook` with a fresh, working publish endpoint

**New**: `supabase/functions/ba11-publish-audiobook/index.ts`

Same proven pattern as `ba11-audiobook-generate` and `save-author-node`:

- `verify_jwt = false` in `supabase/config.toml`.
- In-code JWT decode (`decodeJwtSub`) — accepts shared-backend tokens.
- Resolve `author_profiles` by `user_id = sub`, derive `authorProfileId` and `authorSlug`.
- List MP3 files from `audiobook-audio/{authorProfileId}/{bookId}/`.
- Build per-channel manifests reusing the existing `CHANNEL_SPECS` map (Audible/ACX, Google Play Books, Apple, Spotify/Findaway, Authors Bureau platform).
- Upsert `author_nodes` row:
  - `node_id = "BA-11"`, `node_name = "Audiobook"`, `status = "live"`
  - `delivery_type = "digital_audio"`, `delivery_url = preview chapter URL`
  - `microsite_url = "/" + authorSlug + "/audiobook"`
  - `price_usd`, `currency = "USD"`, `activated_at = now()`
  - `content_json` includes audiobook id, all chapter URLs, channel list
- Generate a downloadable ZIP server-side (use `jszip` from npm) containing:
  - Each chapter MP3 (fetched from the bucket)
  - `manifest.json` (full per-channel spec)
  - `README.txt` (re-encode notes for ACX, Google Play upload steps)
- Upload the ZIP to `audiobook-audio/{authorProfileId}/{bookId}/submission-package.zip` and return its public URL.
- Send the existing `audiobook-distribution-ready` email (non-blocking).
- Return `{ success, audiobookId, chapterCount, channels, zipUrl, micrositeUrl, publicAuthorPageUrl }`.

### Phase 3 — Confirmation screen in the publish step

Update `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`:

- Replace `handlePublish` to call `/functions/v1/ba11-publish-audiobook` via `getActiveToken()` + `fetchWithTimeout(url, opts, 120_000)` (ZIP build can take a while). Keep the call body the same shape.
- Wire the existing `Export Audio Files` button to download `zipUrl` once available (and to call the publish endpoint with `mode: "package_only"` if pressed before publishing).
- After success, store the response in state and replace the existing one-line success card with a full **Confirmation panel**:
  - "🎉 Audiobook is now live on your author page" with a button linking to `publicAuthorPageUrl` (e.g. `/pauline-teo`).
  - Big **Download Submission ZIP** button → `zipUrl`.
  - Two prominent action cards:
    - **Submit to Audible / ACX** → opens `https://www.acx.com/help/narrators/200484550` in a new tab, with the file checklist (192 kbps mono 44.1 kHz, retail sample, opening/closing credits).
    - **Submit to Google Play Books** → opens `https://play.google.com/books/publish/`, with a 4-step quick-start.
  - Smaller links for Apple Books / Spotify (Findaway) / Findaway Voices when those channels were selected.
- Surface real backend error messages in the toast (currently swallowed by `toAbbyError`).

### Phase 4 — Verification

1. Generate one chapter → confirm a row appears in `audiobook-audio/{authorProfileId}/{bookId}/chapter-01.mp3`.
2. Click **Publish & Distribute Audiobook** → confirm `ba11-publish-audiobook` logs run end-to-end, ZIP is uploaded, response includes `zipUrl`.
3. Confirmation screen renders with working **Download ZIP**, **Open ACX**, **Open Google Play Books**, and **View on `/pauline-teo`** buttons.
4. Visit `/pauline-teo` → audiobook card appears (already supported via `formatNodes` filter).

## Files touched

- **Update**: `supabase/functions/ba11-audiobook-generate/index.ts` — upload MP3 to `audiobook-audio`, return `audioUrl`.
- **New**: `supabase/functions/ba11-publish-audiobook/index.ts` — JWT-decode auth, list chapter files, build ZIP, upsert `author_nodes`, send email.
- **Update**: `supabase/config.toml` — add `[functions.ba11-publish-audiobook] verify_jwt = false`.
- **Update**: `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx` — call new endpoint via `getActiveToken()`, render confirmation screen with ZIP download + ACX/Google Play links + author-page link, wire `Export Audio Files`.

## Scope

- No DB migration. No RLS changes. No new secrets (uses existing `ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`).
- Old `distribute-audiobook` function remains for the legacy `DistributeAudiobookModal` until it's migrated separately.
- Public `/pauline-teo` page already renders BA-11 nodes — no UI work needed there.

