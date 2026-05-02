
# Sprint 55g — End-to-end BP audit fixes (Introduction → Final destination)

Audited every BP builder along the BP-06 reference path:

```text
Introduction (book detection)
    └─► Generate  (generator must receive book_id)
          └─► Review (Abby content)
                └─► Publish
                      ├─► Build branded deliverable (DOCX/PDF/TXT)
                      ├─► uploadAndRegisterLibraryAsset()
                      ├─► publishNodeToSite(... libraryAsset)   ◄── stamps library_asset
                      └─► Final destinations:
                            • Library (download card on success screen)
                            • Microsite (free download / Buy Now)
```

## Findings

| Node | Sends `book_id` | Has `library_asset` | Verdict |
|------|---|---|---|
| BP-01 Email Marketing | ✅ | ✅ TXT | OK; add PDF + success-screen download card |
| **BP-02** Lead Magnets | ✅ | ❌ | **Add DOCX + PDF library_asset** |
| BP-03 Social Media | ⚠ raw `bookId` | ✅ TXT | Switch to `activeBookId`; add PDF + download card |
| BP-04 Author Website | ✅ | ✅ external_url | OK (microsite IS the deliverable) |
| **BP-05** Webinars | ✅ | ❌ | **Add DOCX + PDF library_asset** |
| BP-06 Workbook | ✅ | ✅ DOCX + PDF | Reference — no change |
| **BP-07** Home Study | ❌ | ❌ | **Pass `activeBookId` to generator + add DOCX + PDF library_asset** |
| **BP-08** Special Editions | ⚠ raw `bookId` | ❌ | Switch to `activeBookId`; **add DOCX + PDF library_asset** |
| BP-09 Live Audience Toolkit | ❌ | ✅ TXT | **Pass `bookId` to generator**; add PDF + download card |

## What changes

### A. Book-context plumbing (small, surgical)

1. **BP-07** — derive `activeBookId = bookId ?? hookBookId` like BP-06; pass `book_id: activeBookId` in the `generate-bp07-home-study` body and in `publishNodeToSite(..., activeBookId)`.
2. **BP-09** — derive `activeBookId = bookId ?? hookBookId`; pass `book_id: activeBookId` to `generate-bp09-book-sales`; pass it to `publishNodeToSite` and `autosaveBuilderDraft`.
3. **BP-03** — switch `bookId ?? null` to `activeBookId` (already on `useAuthorBook`; just expose `hookBookId`).
4. **BP-08** — same `activeBookId` switch; pass it to the generator and to `publishNodeToSite`.

These bring all 8 builders to the BP-06 single-source-of-book pattern: route `bookId` wins, hook fallback for users who land without a route param.

### B. Library + downloadable deliverables

Adopt the BP-06 publish recipe verbatim on the four builders that don't yet write a `library_asset`:

**BP-02 Lead Magnets** (free, public bucket)
- Build branded **DOCX + PDF** containing: cover, the lead magnet itself (quiz/checklist), opt-in copy, thank-you, nurture preview.
- `uploadAndRegisterLibraryAsset({ kind: "docx", isPaid: false })`.
- Stamp on publish: replace the direct `author_nodes.update(...)` with `publishNodeToSite("BP-02", ..., libraryAsset)` so the canonical record lands on `content_json`.
- Add `BANodeDownloadCard` on the post-publish screen.

**BP-05 Webinars** (free, public bucket)
- Build **DOCX** = full webinar script + promo emails + follow-up sequence + registration page copy.
- Build **PDF** companion = slide outline (reuse `workbook-pdf.ts` layout helpers).
- Same upload + `publishNodeToSite` stamp + download card.

**BP-07 Home Study Course** (paid, private bucket, signed URL)
- Build **DOCX + PDF** of the 21-day programme (daily readings, exercises, reflections, action items).
- Stripe pre-flight (mirror BP-06's `StripeRequiredModal` "Make it free and publish" path).
- `uploadAndRegisterLibraryAsset({ kind: "docx", isPaid: true })` then `publishNodeToSite(..., libraryAsset)`.
- Add `BANodeDownloadCard` + a primary `Download Course PDF` button on success screen.

**BP-08 Special Editions** (paid, private bucket)
- Build **PDF + DOCX** edition spec (KDP Large 8.5×11 trim like BP-06): cover plan, signed-edition insert text, fulfilment notes, pricing tiers, occasion framing.
- Same upload + publish + download card.

### C. Companion files and success-screen polish on the three that already write a library_asset

- **BP-01**: add a PDF companion alongside the existing TXT (cover + sequence steps formatted), and surface `BANodeDownloadCard` on the success screen.
- **BP-03**: add a PDF companion to the existing TXT (social calendar formatted), surface `BANodeDownloadCard`.
- **BP-09**: keep TXT primary; surface `BANodeDownloadCard` on the success screen so the toolkit is one click away.

### D. Microsite parity

`MicrositePage.tsx` already prefers `library_asset.pdf_url` for the BP-06 free-download CTA. Apply the same priority resolver to the BP-02 lead-magnet, BP-05 webinar, BP-07 home-study, and BP-08 edition microsite blocks so the public page never says "Available shortly" once a library_asset exists.

## What stays untouched (guard rails)

- `supabase/functions/_shared/node-readiness.ts` — already accepts `library_asset` first, legacy fallback second.
- `supabase/functions/save-author-node` — already preserves caller-written `library_asset` and runs the `deriveLibraryAsset` fallback for BP-04.
- `src/lib/publish-library-asset.ts` — already supports paid/free buckets, signed URLs, optional pdf/txt companions.
- `builderNodeConfig.ts` canonical labels, the 28-node count, BP-00 framing — all untouched.
- All readiness gates and dashboard counter math — untouched.

## Files to be edited

- `src/components/dashboard/builders/bp01/BP01Builder.tsx` — add PDF companion + download card
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — add deliverable + library_asset + publishNodeToSite + download card
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — switch to `activeBookId`, add PDF companion, add download card
- `src/components/dashboard/builders/bp05/BP05Builder.tsx` — add deliverable + library_asset + publishNodeToSite + download card
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — pass `activeBookId` to generator + publish; add deliverable + library_asset; Stripe pre-flight; download card
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — switch to `activeBookId`; add deliverable + library_asset; download card
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — pass `activeBookId` to generator + publish; add download card
- `src/lib/build-library-txt.ts` (or new `src/lib/builder-deliverables.ts`) — add `buildBp01Pdf`, `buildBp02Docx/Pdf`, `buildBp03Pdf`, `buildBp05Docx/Pdf`, `buildBp07Docx/Pdf`, `buildBp08Docx/Pdf` (small wrappers around the existing `workbook-docx`/`workbook-pdf` layout helpers)
- `src/pages/MicrositePage.tsx` — extend the BP-06 download-URL resolver to BP-02 / BP-05 / BP-07 / BP-08 sections

## Acceptance per node

For BP-02, BP-05, BP-07, BP-08 after this sprint:
1. Pressing **Publish** uploads a real DOCX (and PDF where applicable) and stamps `content_json.library_asset.{kind,url,pdf_url,title,saved_at}`.
2. Node shows Live in the X / 28 counter via the **uniform contract**, not the legacy fallback.
3. The post-publish screen surfaces a `BANodeDownloadCard` with PDF + DOCX buttons.
4. The author's **Library** lists the file; signed URL works for paid, public for free.
5. The public **microsite** (where one exists) shows a working CTA driven by `library_asset` (no more "Available shortly").

For BP-01, BP-03, BP-09:
1. PDF companion (BP-01, BP-03) lands in the Library alongside the TXT.
2. Success screen shows `BANodeDownloadCard` so the file is one click away.

For BP-07, BP-09 specifically:
3. The generator request body now includes `book_id`, so multi-book authors get the correct book.

## Out of scope (next sprints)

- BA-10 → BA-18 and YR-19 → YR-28 in Sprint 55h / 55i. We're keeping this sprint to BP only to avoid the broad-blast changes that historically destabilised counters.
