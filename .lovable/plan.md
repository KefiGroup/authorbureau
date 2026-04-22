

## Root cause confirmed

Three storage path conventions are colliding for BA-11:

| Function | Folder key | Filename |
|---|---|---|
| `elevenlabs-tts-audiobook-v2` (older, wrote Pauline's file) | `{user_id}` | `chapter-000.mp3` (3-digit, 0-indexed) |
| `ba11-audiobook-generate` (current generator) | `{author_profile_id}` | `chapter-01.mp3` (2-digit, 1-indexed) |
| `ba11-publish-audiobook` + `save-author-node` list-audio (heal/zip) | `{author_profile_id}` (caller passes profile id) | any |

Verified in DB: Pauline's only audio file is `ef23c521-…(user_id)/e5b857ac-…(book_id)/chapter-000.mp3`, but the heal call sends `authorId = 92326a2f-…` (the `author_profiles.id`). The list returns 0 files. Same mismatch will break the publish ZIP. Future generations via `ba11-audiobook-generate` would write to a **different** folder again, so existing and new chapters can never coexist.

## Plan — pick one canonical path, then teach all functions to read both

**Canonical going forward:** `audiobook-audio/{user_id}/{book_id}/chapter-NNN.mp3` (3-digit, 0-indexed). Reasons: matches the only files actually in storage today (no migration of Pauline's file needed), matches `elevenlabs-tts-audiobook-v2` and `distribute-audiobook` legacy code, and `user_id` is the simplest key the browser already has.

### 1. `ba11-audiobook-generate` — write to canonical path

- Replace `${authorProfileId}/${bookId}/chapter-${(idx+1).padStart(2)}.mp3` with `${claims.sub}/${bookId}/chapter-${idx.padStart(3)}.mp3`.
- Drop the `author_profiles` lookup (no longer needed for the upload).
- Keep returning `audioUrl` and `audioUrlError` as today.

### 2. `save-author-node` `list-audio` — accept user_id-keyed folder, with profile-id fallback

- Resolve `user_id` from JWT (already done) and from `author_profiles.id = authorId` (already done in ownership check).
- List **two** prefixes: `{user_id}/{bookId}/` and `{author_profile_id}/{bookId}/`. Merge results.
- Filename regex must accept both `chapter-001.mp3` and `chapter-01.mp3` — use `^chapter-0*(\d+)(?:-chunk-\d+)?\.mp3$` and parse the captured number as 0-indexed (subtract 1 only if the number is ≥ 1 and we detect 2-digit padding; simpler: treat the file as belonging to chapter index `n` where `n = parsed`, then sort and re-index sequentially). Re-indexing sequentially after sort is the safest — avoids guessing which convention wrote it.
- Filter out the chunk variants (`-chunk-NNN`) for now, since the BA-11 builder produces single-file chapters. Chunked legacy files are out of scope.

### 3. `ba11-publish-audiobook` — same dual-prefix listing

Apply the same dual-prefix list + filename regex changes. The ZIP already enumerates whatever it finds in the folder, so this just needs the two-folder merge plus a filter that excludes `submission-package.zip` itself and `*-chunk-*.mp3`.

### 4. `BA11Builder.tsx` heal effect — re-index by position, not by filename number

After `listAudiobookChapters` returns, the response is already sorted. The current builder code maps `byIndex.set(f.index, f.publicUrl)` and matches against the **chapter array index**. Pauline's file is `chapter-000.mp3` → index 0 → first chapter. That works. Just confirm the response order is positional — done by sorting in the function before returning.

Also tighten the heal trigger: change the effect dependency from `stepData.chapters?.length` to `[authorId, bookId, resolvedBookId]` so a successful list still heals when chapters are present but their URLs are blob/empty (current condition `needsHealing` already covers this — keep it).

### 5. One-time silent cleanup

After heal succeeds for Pauline, the autosave in the builder will rewrite `content_json` with the permanent URL — replacing the blob URL — so the next reload doesn't even need to re-list. No DB migration required.

## Verification

1. Reload `/node-builder/BA-11` as Pauline → console shows `[save-author-node:list-audio]` returning 1 chapter, builder switches Chapter 1 to "Audio Ready", counter shows 1/6, autosave overwrites the blob URL with the permanent URL.
2. Generate Chapter 2 → file lands at `ef23c521…/e5b857ac…/chapter-001.mp3` (canonical path, 3-digit, 0-indexed). Reload → both chapters resume.
3. Click **Publish & Distribute** → ZIP includes both MP3s, `author_nodes.status = live`, audiobook appears at `/pauline-teo`.

## Files touched

- **Update** `supabase/functions/ba11-audiobook-generate/index.ts` — write to `{user_id}/{book_id}/chapter-NNN.mp3` (3-digit, 0-indexed).
- **Update** `supabase/functions/save-author-node/index.ts` — `list-audio` reads both `{user_id}/…` and `{author_profile_id}/…` prefixes, accepts both 2- and 3-digit filenames, excludes `-chunk-` and `submission-package.zip`.
- **Update** `supabase/functions/ba11-publish-audiobook/index.ts` — same dual-prefix list + filename filter for ZIP packaging.
- **No DB migration. No RLS changes. No new secrets. No frontend changes** beyond what's already shipped.

## Why this fixes it for good

One canonical write path going forward (`{user_id}/…`), plus tolerant readers that accept either historical convention, means: existing files heal immediately, new files round-trip through resume + publish, and the legacy `elevenlabs-tts-audiobook-v2` files are still discoverable until the customer regenerates.

