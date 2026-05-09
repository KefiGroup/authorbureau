# Sprint 11 Bug Audit — YR-23 / Speaker Script

## Audit Results

### Bug 1 — YR-23 missing PPTX → no script row · ❌ NOT FIXED

`supabase/functions/generate-yr23-mastermind/index.ts` only emits:
`mastermind_title, tagline, programme_promise, membership_tiers, curriculum_pillars, application_questions, sales_page, abby_summary`.

`src/lib/nodeAssetRegistry.ts:193-198` probes `c => has(c, "slides")` for both the pitch-deck row AND the speaker-script row. With no `slides` key, neither row ever renders — only the catch-all "Mastermind package" PDF shows up. Confirmed by reading both files.

### Bug 2 — "Generate on demand" needs a tooltip · ❌ NOT FIXED

`src/components/library/AssetRow.tsx` renders the `sizeHint` (which is the literal string "Generate on demand" from `speakerScriptAsset` in `nodeAssetRegistry.ts:69`) as a plain `<Badge variant="outline">` (line 142). No `Tooltip` wrapper, no description anywhere on the row. First-time users see only "Generate on demand · SCRIPT".

### Bug 3 — YR-22 script quality validation · ❌ NOT DONE

No evidence in code, sprint logs, or `dev_activity_log` that a YR-22 script was downloaded and inspected. The `export-speaker-script` function exists but has never been QA'd against the four required criteria (slide-by-slide talking points, facilitation prompts, timing cues, author-story references).

---

## Fix Plan

### 1. YR-23 generator → add a pitch-deck `slides` array
File: `supabase/functions/generate-yr23-mastermind/index.ts`

Extend the JSON schema in the user prompt to include a `slides` array (≈ 10-12 slides for an investor/applicant pitch: cover, problem, opportunity, programme overview, who it's for, the 4 curriculum pillars, the two membership tiers, application process, CTA). Persist `slides` into `content_json` like BA-13/YR-21/YR-22 already do. No registry change needed — once `slides` exist, both the pitch-deck row and the speaker-script row appear automatically.

### 2. Tooltip on the Generate-on-demand chip
File: `src/components/library/AssetRow.tsx`

When `asset.formats` includes `"script_docx"` AND `sizeHint === "Generate on demand"`, wrap the badge in the existing `Tooltip` primitive (`@/components/ui/tooltip`) with the copy:

> "Downloads a .docx speaker script — one talking-point page per slide. First generation takes ~30 seconds; subsequent downloads are instant."

Keep the badge style identical; only add `TooltipProvider/Trigger/Content`. Pure UI change.

### 3. YR-22 speaker-script QA pass
Use a sandbox script (no UI changes):

1. `code--exec` calls `export-speaker-script` for the existing seeded YR-22 author/book via `supabase--curl_edge_functions`.
2. Decode the base64 DOCX to `/mnt/documents/yr22-script-qa.docx`.
3. Convert to PDF + per-page JPGs with the LibreOffice + pdftoppm pipeline.
4. Read the rendered pages and verify each slide has: talking points, facilitator prompt, timing cue (e.g. "~3 min"), and a Pauline-story callback.
5. Surface a pass/fail with the exact deficiencies. If it fails, propose a prompt patch to `supabase/functions/export-speaker-script/index.ts` (separate follow-up).

Deliverable: a short QA report attached to this thread; the DOCX itself in `/mnt/documents/`.

---

## Out of scope
- Re-theming pitch deck visuals (existing `export-pro-slides` handles render).
- Backfilling `slides` into already-generated YR-23 nodes — authors can re-run the YR-23 generator to pick up the new schema.
- Changing speaker-script prompt unless QA in step 3 fails.

## Files to touch
- `supabase/functions/generate-yr23-mastermind/index.ts` (extend prompt + persist `slides`)
- `src/components/library/AssetRow.tsx` (tooltip on script-on-demand chip)
- `/mnt/documents/yr22-script-qa.docx` + QA report (no project file changes unless QA fails)
