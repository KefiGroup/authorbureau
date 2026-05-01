
## Goal

Replace the current per-node `hasRequiredAssets` switch with a single uniform contract: a node is **100% Live** when its ABBY-generated deliverable is saved to the library in the required format. Apply this to all 28 nodes, fix the BP-06 Workbook 60%-vs-Live bug, and bake in a process rule so every future business-rule change updates the master architecture in the same sprint.

---

## Part A — The `library_asset` contract

Every node, on publish, writes one record to `content_json.library_asset`:

```json
{
  "kind": "docx" | "pptx" | "audio_mp3" | "audio_zip" |
          "email_sequence" | "podcast_pack" | "external_url",
  "url": "https://…",        // primary file (DOCX, PPTX, audio, or external link)
  "pdf_url": "https://…",    // PDF export (always emitted for docx/pptx kinds)
  "txt_url": "https://…",    // TXT export (always emitted for docx/pptx/email/podcast)
  "title": "…",
  "saved_at": "2026-05-01T…"
}
```

**Readiness rule (single line):**
`asset.url` exists AND `asset.kind === REQUIRED_KIND[nodeId]` → 100% Live.

**Amendments to Manus v2 spec (A1–A3, agreed earlier):**
- **A1**: Always emit DOCX + PDF + TXT for any `docx` kind. No "TXT not needed" exceptions. Removes 6 special cases, simplifies code and library UI.
- **A2**: Audio and slides nodes emit native + PDF + TXT (TXT = script). Readiness gate is the native format only.
- **A3**: Add `library_asset_history[]`, signed URLs for paid deliverables, and a one-time backfill script.

### 28-node REQUIRED_KIND map

| Node | Name | `REQUIRED_KIND` | Native | PDF | TXT |
|------|------|-----------------|--------|-----|-----|
| BP-01 | Email Marketing | `email_sequence` | sequence rows | ✅ | ✅ |
| BP-02 | Lead Magnet | `docx` | ✅ | ✅ | ✅ |
| BP-03 | Social Media | `docx` (calendar) | ✅ | ✅ | ✅ |
| BP-04 | Author Microsite | `external_url` | URL only | — | — |
| BP-05 | Webinar / Event | `pptx` | ✅ | ✅ | ✅ (script) |
| BP-06 | Workbook | `docx` | ✅ | ✅ | ✅ |
| BP-07 | Home Study Course | `docx` | ✅ | ✅ | ✅ |
| BP-08 | Special Editions | `docx` | ✅ | ✅ | ✅ |
| BP-09 | Book Sales | `external_url` | URL only | — | — |
| BA-10 | Online Course | `docx` (curriculum) | ✅ | ✅ | ✅ |
| BA-11 | Audiobook | `audio_zip` | ✅ | — | ✅ (script) |
| BA-12 | Membership | `docx` | ✅ | ✅ | ✅ |
| BA-13 | Group Coaching | `docx` | ✅ | ✅ | ✅ |
| BA-14 | Podcast | `podcast_pack` (docx) | ✅ | ✅ | ✅ |
| BA-15 | Media & PR | `docx` | ✅ | ✅ | ✅ |
| BA-16 | Affiliates | `docx` | ✅ | ✅ | ✅ |
| BA-17 | Bundles | `docx` (proposal) | ✅ | ✅ | ✅ |
| BA-18 | JV Partnerships | `docx` | ✅ | ✅ | ✅ |
| YR-19 | 1-on-1 Coaching | `docx` (offer) | ✅ | ✅ | ✅ |
| YR-20 | Speaking | `docx` (one-sheet) | ✅ | ✅ | ✅ |
| YR-21 | Workshops | `pptx` | ✅ | ✅ | ✅ (script) |
| YR-22 | Corporate Training | `pptx` | ✅ | ✅ | ✅ (notes) |
| YR-23 | Mastermind | `docx` (prospectus) | ✅ | ✅ | ✅ |
| YR-24 | Retreat | `docx` | ✅ | ✅ | ✅ |
| YR-25 | Certification | `docx` (syllabus) | ✅ | ✅ | ✅ |
| YR-26 | Licensing | `docx` | ✅ | ✅ | ✅ |
| YR-27 | Fundraising | `docx` | ✅ | ✅ | ✅ |
| YR-28 | Sponsors | `docx` | ✅ | ✅ | ✅ |

Total = 28. BP-00 stays excluded (pre-step).

**Decoupled from Stripe / commerce.** A `docx`-kind node is Live when the document is saved to the library, regardless of whether the author has wired up Stripe. This is consistent with the existing "Payout vs Commerce Separation" memory rule.

---

## Part B — Code changes

### B1. Storage
- New private bucket `library-assets` for paid-product deliverables (BP-06, BP-07, BA-10, BA-12, BA-13, BA-17, YR-19, YR-21, YR-22, YR-23, YR-25). Signed URLs, 7-day expiry, regenerated on demand.
- Use existing public buckets where appropriate (BP-02 lead magnets stay in current public location).
- New `library-assets-public` bucket for free-distribution deliverables (BA-15 press kit, BA-16 affiliate kit, BA-18 JV kit, YR-20 speaker one-sheet, YR-26 licensing, YR-27 fundraising, YR-28 sponsors).

### B2. Shared rendering edge function
`supabase/functions/render-library-asset/index.ts` — takes `{ author_id, node_id, source_html | source_markdown, title, kind }`, produces DOCX (via `docx` npm) + PDF (LibreOffice headless) + TXT (markdown-stripped), uploads all three to the correct bucket, returns `library_asset` object. Single function used by every builder's publish step. PPTX rendering uses `pptxgenjs`; same pattern.

### B3. Readiness module
`supabase/functions/_shared/node-readiness.ts` — replace per-node switch with:
```typescript
const REQUIRED_KIND: Record<string, string> = { /* 28 entries */ };
export function hasRequiredAssets(nodeId, content) {
  const a = content?.library_asset;
  if (a?.url && a?.kind === REQUIRED_KIND[nodeId]) return true;
  return legacyHasRequiredAssets(nodeId, content); // bridge until next publish
}
```
Keep the existing switch as `legacyHasRequiredAssets` so rows already Live don't regress.

### B4. Builder publish steps
Each builder's "Publish / Go Live" handler calls `render-library-asset` then writes the returned object onto `content_json.library_asset`. ~28 small edits, one per builder.

### B5. Library UI
`src/pages/AuthorLibrary.tsx` — read `library_asset` as the single source. One row per node showing title + 3 download buttons (DOCX / PDF / TXT) where present.

### B6. Versioning
On every publish, push the previous `library_asset` onto `library_asset_history[]` (capped at last 5) before overwriting.

### B7. Backfill
`scripts/backfill-library-assets.mjs` — read all `status='live'` rows; for each, synthesise a `library_asset` from existing fields (`pdf_url`, `workbook_title`, `course_id`, `amazon_url`, etc.). Idempotent. Logs rows that can't be synthesised so we can re-publish them by hand.

### B8. Tests
`src/lib/__tests__/node-readiness.test.ts` — one case per node: correct `library_asset.kind` passes; mismatched kind fails; missing url fails; legacy fallback still works.

---

## Part C — Master-architecture sync (the "update every time" rule)

Lands in the same sprint as the code, not afterwards.

### C1. Update existing docs
- `docs/02-business-rules/02-node-readiness-gates-full-spec.md` — replace contents with the uniform rule + the 28-row REQUIRED_KIND table. Becomes the single spec.
- `docs/02-business-rules/03-product-lifecycle-rules.md` — update the 25/60/100 mapping to point at `library_asset` as the gate.
- `docs/01-architecture/01-master-architecture-reference.md` — add a "Readiness contract" paragraph linking to doc 02.
- `docs/04-node-frameworks/BP-01.md` … `YR-28.md` — each gets a "100% Live = `library_asset.kind = '<kind>'`" line (28 small edits).
- `docs/05-sprint-records/01-sprint-log-master.md` — append the sprint entry.
- `docs/05-sprint-records/04-decision-log.md` — record the decision and date.

### C2. New memory
`mem://business/uniform-readiness-contract` — captures the rule, the REQUIRED_KIND map, the three-format output policy, and the governance line. Indexed under Core in `mem://index.md`.

### C3. Standing process rule
Append to `mem://process/docs-sprint-maintenance`:

> Any sprint that changes a business rule (readiness, lifecycle, fees, gating, payout, commerce, eligibility, deliverable shape) MUST in the same PR update:
> 1. The matching `docs/02-business-rules/*.md` spec
> 2. Any affected `docs/04-node-frameworks/*.md`
> 3. `docs/05-sprint-records/04-decision-log.md`
> 4. The relevant `mem://` memory
>
> Sprint cannot be marked done until those edits exist.

A CI guard for code/doc drift is **out of scope** for this sprint. Enforcement is at sprint-completion review.

---

## Acceptance

- BP-06 Workbook re-published once → dashboard shows **100% Live** (matches "Your Workbook is now live!" screen).
- My Library shows one row per Live node with DOCX / PDF / TXT download buttons where applicable.
- `docs/02-business-rules/02-node-readiness-gates-full-spec.md` contains the 28-row REQUIRED_KIND table.
- `docs/04-node-frameworks/BP-06.md` states "100% Live = `library_asset.kind = 'docx'`".
- `mem://business/uniform-readiness-contract` exists and is referenced from index Core.
- `scripts/backfill-library-assets.mjs` reports zero stuck-Live rows for your account after running.
- All 28 readiness tests pass.

---

## Out of scope

- Stripe / payout readiness (still excluded by design).
- Marketing funnel generation.
- PPTX rendering for non-slide nodes.
- Automated CI guard for doc/code drift (deferred — manual review for now).
- Per-author email sender domain.

---

## Sequencing

1. Storage buckets + `render-library-asset` edge function + readiness module refactor + tests. (Foundation, no UI change yet.)
2. Backfill script run against your account → verifies BP-06 jumps to 100%.
3. Builder publish steps updated one category at a time: BP first, then BA, then YR.
4. Library UI consolidation.
5. Docs + memory updates land with the final commit of the sprint (per the new C3 rule).

