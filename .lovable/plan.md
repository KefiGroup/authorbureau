## What's wrong

Your "Be SUCKcessful Workbook" published correctly:
- Status = `live`
- Price = $0 (free)
- Branded PDF + Word doc are uploaded to the public library bucket and are publicly downloadable

But the microsite still shows a disabled **"Available shortly"** button, and one of the feature bullets ("Instant download after purchase") doesn't fit a free workbook.

### Root causes

In `src/pages/MicrositePage.tsx` → `WorkbookSalesPage`:

1. **Line 920–930** — the free-CTA branch only looks at `data.node.delivery_url` for the download link. It ignores `content.library_asset.pdf_url` and `content.library_asset.url` (the real branded files Publish just uploaded). On top of that, `delivery_url` for this node was set to the microsite's *own* URL, not a file URL — so even if used, it's wrong.
2. **Line 1021** — the bullet "Instant download after purchase" is hard-coded; it doesn't switch wording when the workbook is free.

Pricing itself is consistent (free everywhere) — only the button and one bullet are off.

## Fix

In `src/pages/MicrositePage.tsx`, `WorkbookSalesPage`:

**A. Resolve the download URL from real fields, in this priority order:**
1. `content.library_asset.pdf_url` (preferred — branded PDF written by Publish)
2. `content.library_asset.url` if it ends in `.pdf` or `.docx`
3. `content.pdf_url` (legacy)
4. `data.node.delivery_url` only when it ends in `.pdf` / `.docx` (i.e., a real file, not the microsite URL)

If any are found → render an enabled **"Download Workbook (PDF)"** button (and a secondary **"Download Word version"** button when a `.docx` is also available). Otherwise keep "Available shortly".

**B. Make the feature bullet pricing-aware:**
- When `isFree` → "Instant download, no purchase required"
- When paid → keep "Instant download after purchase"

## Why this is safe

- Microsite-rendering only — no DB migration, no edge function change, no regenerating the workbook
- Already-published workbook starts working the moment the change ships
- Paid-workbook flow (BuyNowButton, Amazon links) is untouched

## Files to change

- `src/pages/MicrositePage.tsx` — `WorkbookSalesPage` (`renderCta()` free branch around lines 920–930 and the feature bullets around line 1021). No other files affected.
