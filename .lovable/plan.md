## What you actually have today (good news)

The BP-06 builder already produces a **fully branded workbook** — not a plain PDF. The PDF renderer (`src/lib/workbook-pdf.ts`) builds:

- Navy branded **cover page** with book title + author name
- Welcome page
- Table of contents
- 2 pages per section (prompt page + ruled response lines)
- Toolkit pages (Canvas grid, 90-day planner, weekly tracker, playbook table, story template, vision page)
- Action plan page
- Back cover

All print-ready US Letter (8.5 × 11", KDP-compatible).

## How the three things you asked about work

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Review screen (where you are now)                                   │
│                                                                      │
│  [Download PDF]  ──►  saves the branded PDF to your computer         │
│  [Download Word] ──►  editable .docx (re-import after edits)         │
│                                                                      │
│  [Publish to My Site] ──► does ALL of the following in one click:    │
│        1. Builds the branded PDF (same one as Download PDF)          │
│        2. Builds the .docx                                           │
│        3. Uploads both to library-assets storage bucket              │
│        4. Registers a library_asset record (title, pdf_url, docx)    │
│        5. Sets BP-06 status = live on your microsite                 │
│        6. Workbook now appears in My Library AND on your site        │
└──────────────────────────────────────────────────────────────────────┘
```

So the answer to "how do I save to library + publish to site": **clicking Publish to My Site does both.** The Library entry only appears *after* a successful Publish — Download PDF alone does not populate the Library.

## The actual problem from the previous session

The earlier session found that for "Be SUCKcessful" the BP-06 record is stuck at `status: 'content_ready'` with `library_asset: null` and zero server logs — meaning Publish to My Site was never successfully fired. Two likely reasons:

1. **Silent failure**: `BP06Builder.tsx:217` catches upload errors with `console.warn` and proceeds — so if upload fails you see nothing in the UI and nothing reaches the Library.
2. **Click never reached publish**: an earlier render crash or a disabled button state may have blocked it.

## What I'll do (one focused pass)

1. **Make the publish flow loud, not silent**
   - In `BP06Builder.tsx` `buildAndUploadDeliverable`, replace the swallowed `console.warn` with a toast error and abort publish if upload fails — so if storage rejects the PDF you'll see exactly why instead of a quiet no-op.
   - Add a `toast.success("Workbook saved to your Library")` when upload succeeds.

2. **Add a "Save to Library" affordance on the Review screen**
   - Right now Review only shows Download PDF / Download Word / Publish to My Site. Add a third button: **"Save to Library"** that runs `buildAndUploadDeliverable` only (uploads PDF + DOCX, registers the asset) without flipping the node to `live`. This lets you stash the file in your Library before deciding to publish to the site.
   - Publish to My Site keeps doing both (save + go live).

3. **Surface the existing Library link from Review**
   - Add a small "View in My Library →" link that appears after a successful save, deep-linking to `/dashboard?section=my-library`.

4. **Diagnose your specific book**
   - Open `Be SUCKcessful` BP-06 → click the new **Save to Library** button → watch `render-library-asset` and `save-author-node` logs in real time. If storage upload fails, the new toast will tell us the exact bucket / path / RLS error.

## Files I'll touch

- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — fail-loud, new Save-to-Library button, post-save link
- (no schema or edge-function changes — the storage bucket, `render-library-asset`, and `save-author-node` already do the right thing)

## What you'll see after this lands

On the Review step:

```text
[Download PDF]    [Download Word (.docx)]
[Save to Library]                              ← new
─────────────────────────────────────────────
[ Publish to My Site → ]                       ← still does save + go-live
```

After Publish succeeds, the workbook shows up in **Dashboard → My Library** (PDF + DOCX download links) AND on your public author site as a free/paid lead magnet — using the same branded PDF the Download button gives you.

## Out of scope (ask separately if you want them)

- Custom cover artwork upload (today the cover is the auto-generated navy branded cover)
- Inline PDF preview inside the builder
- Re-styling the PDF interior (current layout is the Sprint 55 print-ready spec)
