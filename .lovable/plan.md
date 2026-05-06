## Fix BA-11 distribution: "Memory limit exceeded"

Auth is now working. Edge function logs show the real failure:

```
2026-05-06T00:54:02Z INFO  found 33 chapters across both prefixes
2026-05-06T00:54:27Z ERROR Memory limit exceeded
2026-05-06T00:54:27Z LOG   shutdown
```

`ba11-publish-audiobook` fetches every chapter MP3 (~33 files for this book) and stuffs them into a single in-memory JSZip. That blows past the edge function memory cap and the runtime kills the process — the client sees a non-2xx and shows "Distribution failed (compute resources)".

### Fix

In `supabase/functions/ba11-publish-audiobook/index.ts` (the ZIP-build block, lines ~280-294):

- Stop bundling MP3s server-side.
- Keep `manifest.json` and `README.txt` in the submission ZIP.
- Add `chapter-urls.txt` listing each chapter filename + its public storage URL so the author can fetch the audio directly (or use the existing client-side "Download Full ZIP (33 chapters + ACX guide)" button on the Publish page, which already handles full-audio bundling client-side).
- Redeploy `ba11-publish-audiobook`.

This keeps the submission package useful for ACX/Spotify/Apple Books uploads (manifest + per-channel specs + direct chapter URLs) while staying well under the edge memory limit, regardless of chapter count.

### Files

- `supabase/functions/ba11-publish-audiobook/index.ts` (edit ZIP-build section only — no other logic touched).

### Out of scope

- No frontend changes (auth fix already merged; "Download Full ZIP" client button already exists for the full-audio package).
- No DB / schema changes.
- No changes to channel manifest, audiobooks row upsert, or live-state flip.

### Expected result

- "Send to PublishNow" returns 200 even for books with many chapters.
- Submission ZIP downloads with manifest + README + chapter URL list.
- "Published" badge + green Library link render only after success (already correct from prior fix).
