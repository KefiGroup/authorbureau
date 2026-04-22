

## Plan — fix BA-11 chapter audio session resume

### Root cause

The persisted `author_nodes.content_json.studio.chapters[0].audioUrl` is a **`blob:` URL** (verified in DB: `blob:https://authorsbureau.com/3f3bad24-...`). Blob URLs are in-memory references created by `URL.createObjectURL()` and die the moment the page reloads. So when the user returns:

- The chapter row still says `status: "audio-generated"`
- The `<audio src="blob:...">` element is pointing at a dead URL
- And in this case the user reported it reverted to "Script Ready" — which means somewhere the load path is also treating an unplayable URL as no-audio, OR the row was overwritten by a later autosave that lost the status

The chapter's permanent storage URL (`https://.../storage/v1/object/public/audiobook-audio/{authorProfileId}/{bookId}/chapter-01.mp3`) was never saved into `author_nodes`, even though `ba11-audiobook-generate` does upload to that bucket.

### Fix

**1. `ChapterProductionStep.tsx` — never persist blob URLs**

In `handleGenerateAudio` (lines 62-72):
- Always prefer `data.audioUrl` (permanent https storage URL) when present.
- If only `data.audioBase64` came back, create the blob URL **for immediate inline playback in this session only** but keep a separate `permanentUrl` field set to `""`.
- Save the chapter as:
  - `audioUrl: permanentUrl` (only the https URL, never `blob:`)
  - `previewBlobUrl: blobUrl` (transient, in-memory only — explicitly excluded from autosave)
  - `status: "audio-generated"` only when `permanentUrl` is set; otherwise `"script-ready"` with a toast warning that storage upload failed.

This stops bad data from ever entering `author_nodes` again.

**2. `BA11Builder.tsx` — sanitize on load**

Right after `setStepData(draft.content.studio)` (line 61), run a sweep over `draft.content.studio.chapters` and, for any chapter where `audioUrl` starts with `blob:`:
- Clear `audioUrl`
- Reset `status` to `"script-ready"`

Then attempt to re-attach permanent URLs by listing the bucket for that author + book:
- Call a tiny new edge action `list-audiobook-chapters` (or extend `save-author-node` with an `action: "list-audio"`) that, given `{ authorId, bookId }`, lists files under `audiobook-audio/{authorProfileId}/{bookId}/chapter-*.mp3` and returns `[{ index, publicUrl }]`.
- Map matches into `chapters[i].audioUrl` and bump `status` back to `"audio-generated"`.
- Persist the cleaned-up state immediately so the row in `author_nodes` is fixed for next time.

This fully heals the existing broken row in DB and any future generations made before the forward fix.

**3. One-line server confirmation in `ba11-audiobook-generate`**

Currently when storage upload fails the function silently returns `audioUrl: ""`. Add: if upload fails, also include `audioUrlError: "<message>"` in the response so the frontend can show a clear toast rather than silently falling back to a blob.

### Files touched

- **Update**: `src/components/dashboard/builders/audiobook/ChapterProductionStep.tsx` — never save `blob:` URLs; warn when only base64 came back.
- **Update**: `src/components/dashboard/builders/ba11/BA11Builder.tsx` — sanitize on `loadBuilderDraft`, re-attach storage URLs, persist cleaned data.
- **Update**: `supabase/functions/save-author-node/index.ts` — add `action: "list-audio"` that lists `audiobook-audio/{authorProfileId}/{bookId}/` and returns chapter URLs (uses service role; in-code JWT decode, same pattern as existing actions).
- **Update**: `supabase/functions/ba11-audiobook-generate/index.ts` — surface storage upload errors in the response.

### Verification

1. Reload the BA-11 builder — the resume sweep finds the blob URL, lists storage, re-attaches `chapter-01.mp3`'s public URL, restores `status: "audio-generated"`, and autosaves the cleaned row.
2. Click play on Chapter 1 — audio plays from the permanent https URL.
3. Click **Publish & Distribute Audiobook** — passes the gate and runs the existing publish flow.
4. Generate Chapter 2 fresh — confirm `data.audioUrl` is the https storage URL and the autosaved row contains the https URL (not `blob:`).

### Scope

- No DB migration. No RLS changes. No new secrets.
- Pure frontend resume hardening + one new read-only action on an existing edge function.

