## Honest answer first

**Will this make the platform buggy?** There is real risk. The current pipeline works end-to-end (chapters generate, ZIP builds, node goes Live). Adding ACX-compliant transcoding touches the hottest path in BA-11. If we just bolt ffmpeg into the existing functions, three things can break:

1. **Edge function memory** — Supabase edge functions have a hard memory cap. We already hit it once (that's why the current ZIP intentionally does NOT bundle MP3s, line 333 of `ba11-publish-audiobook`). Loading ffmpeg-wasm + a 33-chapter audio buffer in one process will OOM.
2. **Cold-start latency** — ffmpeg-wasm is ~25 MB. First call after deploy can take 10–20s just to boot. Users would see "publish hangs".
3. **Existing audio gets re-processed** — if we change the source format (PCM instead of MP3), every author who already generated chapters has to regenerate. That breaks their work.

So the answer is: **yes it can introduce bugs if we do it inline. The safe path is a separate, opt-in transcoding step that does NOT change anything about the current generate/publish flow.**

## How you'd actually know it's ACX-compliant (verification, not promises)

This is the part I cannot fake. ACX has two layers of compliance:

| Layer | How we verify |
|---|---|
| **Technical specs** (192 kbps CBR, mono, 44.1 kHz, peak ≤ −3 dB, RMS −23 to −18 dB, ≤120 min/file, ≥0.5s room tone head/tail) | Run `ffprobe` on the output and assert each value. Output a machine-readable `acx-compliance-report.json` inside the ZIP that the author can verify themselves. |
| **Content specs** (retail audio sample 1–5 min, opening credits "{Title}, written by {Author}, narrated by {Narrator}", closing credits "The end of {Title} by {Author}") | We generate these as separate audio files using the same ElevenLabs voice and include them in the ZIP. |

The ONLY 100% truth is uploading to ACX itself and having their QA team accept it. Everything else is a strong proxy. I'm telling you this upfront because previously I've described things as "done" when they only passed local checks.

## Proposed approach — opt-in, isolated, verifiable

### Architecture

```text
[ Existing path - UNCHANGED ]
ba11-audiobook-generate  -->  chapter-NNN.mp3 (128k stereo, ElevenLabs default)
ba11-publish-audiobook   -->  node goes Live, microsite live, current ZIP

[ NEW path - additive, opt-in ]
ba11-audiobook-acx-pack  -->  per-chapter ffmpeg transcode + credits + report
                              -->  acx-submission-package.zip  (separate file)
```

Key constraints:
- Current Publish flow is untouched. If the new function fails, going Live still works.
- New function processes **one chapter at a time** (avoids OOM). Author clicks "Build ACX Pack", we queue work and stream progress.
- The output ZIP is a separate artifact (`acx-submission-package.zip`), saved alongside the existing `submission-package.zip`. Existing ZIP keeps the current "needs re-encoding" README.

### What ships in the ACX pack

1. `chapter-NN.mp3` — 192 kbps CBR, mono, 44.1 kHz, normalized to RMS −20 dB, peak −3 dB, 0.75s room tone head + 1.5s tail.
2. `00-opening-credits.mp3` — auto-generated from book metadata using the same ElevenLabs voice.
3. `99-closing-credits.mp3` — same.
4. `retail-sample.mp3` — auto-extracted ~3 min from chapter 1 (ACX requires a separate retail sample).
5. `acx-compliance-report.json` — ffprobe output for every file with pass/fail per ACX rule.
6. `acx-compliance-report.html` — human-readable version, green/red checklist.
7. `README-ACX.txt` — exact step-by-step ACX upload instructions.

### Verification you can run yourself (this is the answer to "how do I know")

After we ship, you can:

1. Click "Build ACX Pack" on any audiobook.
2. Download the ZIP.
3. Open `acx-compliance-report.html` — every chapter shows green/red against each ACX rule with the actual measured value (e.g., "Bitrate: 192 kbps ✓", "Peak: −3.2 dB ✓").
4. Upload one chapter to ACX's free "Audiobook Audio Quality Check" tool: https://www.acx.com/help/narrators/200484930 — this is ACX's own checker. If it passes there, ACX QA will accept it.

If the report says green and ACX's own checker says green, it's truly compliant. If either disagrees, we have an exact spec to fix.

### Technical details

- **Transcoding library**: `@ffmpeg/ffmpeg` WASM build, imported via `npm:` specifier in Deno.
- **Per-chapter processing**: New function `ba11-audiobook-acx-transcode` takes `{ bookId, chapterIndex }`, reads the source MP3 from storage, runs ffmpeg with:
  ```
  -ac 1 -ar 44100 -b:a 192k -filter:a "loudnorm=I=-20:TP=-3:LRA=7"
  ```
  Then writes `chapter-NN-acx.mp3` to a parallel storage prefix `audiobook-audio-acx/{userId}/{bookId}/`.
- **Orchestrator**: New function `ba11-audiobook-acx-pack` lists processed chapters, runs ffprobe on each, generates credits + retail sample, builds the report, builds the ZIP, returns URL.
- **Client**: New "Make ACX-Ready (beta)" button on the Publish step, separate from the current "Open distribution again" CTA. Shows per-chapter progress. Does NOT block Publish status.
- **Feature flag**: `acx_pack_enabled` boolean column on `audiobooks` so we can disable per-author if it misbehaves.

### Files to add (no edits to existing publish path)

- `supabase/functions/ba11-audiobook-acx-transcode/index.ts` — single chapter, ffmpeg WASM.
- `supabase/functions/ba11-audiobook-acx-pack/index.ts` — assembles credits, retail sample, report, ZIP.
- `src/components/dashboard/builders/audiobook/AcxPackPanel.tsx` — new UI panel on Publish step.
- Migration: storage bucket `audiobook-audio-acx` (public read), column `audiobooks.acx_pack_url`, `audiobooks.acx_compliance_json`.

### What I will NOT claim until you verify

- I will not say "ACX-compliant" in any toast or UI text. The button label will be **"Build ACX-Ready Pack (beta — verify with ACX checker before submitting)"**.
- I will not flip any node status based on the ACX pack. It's a downloadable artifact only.
- After shipping I will run the function on your existing audiobook, send you the compliance report, and you confirm it before we mark this done.

### Other retailers

The same transcoded files satisfy Findaway Voices and Apple Books. Spotify and Google Play already accept the current 128 kbps stereo MP3 — no extra work. So this single ACX-grade pack covers all four retailers.

## Risk summary

| Risk | Mitigation |
|---|---|
| ffmpeg-wasm OOM in edge function | One chapter per invocation, never bundle audio in a single function call. |
| Cold start latency | Show explicit "preparing transcoder…" progress, use `npm:` cached imports. |
| Breaking existing publish | Zero edits to `ba11-publish-audiobook` or `ba11-audiobook-generate`. New functions only. |
| False compliance claims | Ship machine-readable ffprobe report + tell author to run ACX's own free checker. |
| Author confusion (two ZIPs) | Old ZIP renamed to "Quick distribution pack (Spotify/Google ready)". New ZIP labeled "ACX-Ready pack (beta)". |

## Approval gate

Before I implement, please confirm:

1. You accept the **opt-in, separate-ZIP approach** (vs. modifying the current publish path).
2. You accept that final compliance is verified by ACX's own free checker tool, not by my word.
3. OK to add the `audiobook-audio-acx` storage bucket and the two new columns on `audiobooks`.

If yes, I'll implement and then run it against your existing "Be SUCKcessful" audiobook so you can download the report and verify with ACX's checker before we call it done.