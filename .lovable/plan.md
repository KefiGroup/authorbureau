## Status check (post-wipe verification)

| Surface | State |
|---|---|
| `author_nodes` for Pauline | 0 rows ✅ |
| `marketing_assets`, `social_posts`, `email_flows`, `leads` | 0 rows ✅ |
| `books` | 2 rows preserved ✅ |
| Storage buckets `library-assets` (private) + `library-assets-public` (public) | exist ✅ |
| `render-library-asset` edge function | deployed ✅ |
| `save-author-node` synthesises `library_asset` on publish from legacy fields | wired ✅ |
| `hasRequiredAssets` precedence: uniform contract → legacy fallback | wired ✅ |
| 28 generator folders + canonical labels (Sprints 48–52) | aligned ✅ |

The reset is good. The architecture itself is locked. What's NOT yet aligned is the **builders' write-side** — they still write old-shape `content_json`, so on every publish we fall through to the legacy gate. That's safe but it means the Sprint-54 contract isn't actually being exercised yet.

## What still needs aligning before Pauline rebuilds

### 1. Builder publish flow → write `library_asset` directly (priority)

`save-author-node` only *synthesises* the asset from whatever legacy fields the builder happens to leave behind. That's a transitional safety net, not the spec. Each of the 28 builders should call `render-library-asset` (mode `register` or `txt_only`) on publish and pass back a real asset object — pdf_url, txt_url, kind matching `REQUIRED_KIND[nodeId]`. Until they do, we'll never see a Live node satisfy the new gate, only the fallback.

Recommended order: BP-06 first (already nearest — has DOCX/PDF in workbook builder), then BP-01, BP-03, BP-04, BP-09 (the 5 a new author touches in their first week), then BA category, then YR.

### 2. Dual-format output (DOCX + PDF + TXT, PPTX + PDF + TXT, audio + TXT)

`render-library-asset` currently supports only `register` (caller already uploaded files) and `txt_only`. The "three-format output policy" in the readiness spec requires the function itself to produce DOCX + PDF + TXT from a single source. That's the missing piece. Options:

- (a) Build it in `render-library-asset` using `docx` + `pdf-lib` (heavy, slow cold start).
- (b) Keep `render-library-asset` as a registry/uploader and let each builder use the existing per-builder export libs (`builder-pdf.ts`, `workbook-docx.ts`) to produce the files, then call `register`. **Recommended** — cheaper and reuses what already works for BP-06.

### 3. Storage bucket policies (RLS) audit

Both buckets exist but I should verify:
- `library-assets` (private): only the owning author can read/write; signed-URL serving for paid deliverables.
- `library-assets-public`: public read, authenticated write.

If RLS isn't right, the very first publish from BP-06 will fail silently or expose a paid asset publicly.

### 4. AssetRow / Library page display of `library_asset`

`src/components/library/AssetRow.tsx` and `src/pages/AuthorLibrary.tsx` were built for the old `marketing_assets` table. They need a small adapter that reads `author_nodes.content_json.library_asset` so a Live node actually shows up in the author's library. Without this, Pauline will publish BP-06, see "Live", and find nothing in her Library tab.

### 5. Decision-log + memory entries for the wipe

Two short entries:
- `docs/05-sprint-records/04-decision-log.md` — "2026-05-01: Wiped Pauline Teo's deliverables (kept books, profile, login, storage). 226 rows backed up to `/mnt/documents/pauline-pre-wipe-backup.jsonl`."
- New memory `mem://operations/test-account-wipe-procedure` — codify the scoped-DELETE pattern so future resets follow the same boundaries (don't touch `auth.users`, `author_profiles`, `books`, storage).

### 6. Optional: seed an empty `author_context` row?

Without `bp00-analysis` having been run, every framework-heavy generator will return `contextBlocked` and `AnalyseBookGate.tsx` will prompt Pauline before any node generates. That's the correct behaviour — no action needed, but worth flagging so we don't think it's a bug when she hits it.

## Proposed next sprint (Sprint 55 — "Builders adopt the contract")

1. Wire BP-06 (workbook) to call `render-library-asset` with mode `register`, passing the DOCX + PDF that the builder already produces. Verify Live in the new gate, not the fallback.
2. Audit + fix RLS on `library-assets` and `library-assets-public`.
3. Add the `library_asset` adapter to `AuthorLibrary.tsx`.
4. Repeat (1) for BP-01 / BP-03 / BP-04 / BP-09.
5. Update decision log + add the wipe-procedure memory.

Once approved I'll switch to default mode and execute Sprint 55 (or any subset you pick). I'll **not** wire all 28 builders in one sprint — that was the previous direction and it's too wide a blast radius without the BP-06 reference implementation landed first.

## Questions for you

- **Scope of next sprint**: do you want the full Sprint 55 above, or just the BP-06 reference implementation + RLS audit + Library adapter (steps 1–3) so we can validate the whole loop end-to-end before fanning out?
- **Library page**: should a Live node with a `library_asset` show as a single "Workbook" row, or do you want the existing per-asset breakdown (DOCX, PDF, TXT shown as 3 rows under one node)?
