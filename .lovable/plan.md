

# Plan — Lock workbook to 8.5 × 11" (KDP standard)

The user wants to skip the trim-size picker entirely. Workbook is always **8.5 × 11"** — the standard Amazon KDP "Large Workbook" trim. We just need to say so.

## Changes

### 1. PDF + DOCX stay at 8.5 × 11"

`src/lib/workbook-pdf.ts` and `src/lib/workbook-docx.ts` already render at US Letter (8.5 × 11"). **No layout changes** — leave the page size, margins, and ruled-line spacing exactly as they are.

### 2. Update KDP-readiness messaging in the Amazon CTA

In `src/components/dashboard/builders/shared/BuilderIntroBlock.tsx`, update the BP-06 `publishExternal` description so the Amazon block tells the author the file is already at the right size:

> "Your workbook is formatted at **8.5 × 11"** — the standard Amazon KDP 'Large Workbook' trim. Download the PDF and upload it directly at PublishNow.io to list it on Amazon as a paperback (perfect for bundling with your book or as an upsell)."

### 3. Surface the trim in the Overview badge

In `src/components/dashboard/builders/bp06/BP06Builder.tsx`, the Overview "Format" line currently shows whatever Abby returned (e.g. "PDF + Printable"). Replace it with a fixed line:

> **Print format:** 8.5 × 11" (Amazon KDP Large Workbook standard) · KDP-ready

So every author sees the same correct trim, regardless of what Abby wrote into `content.format`.

### 4. Remove the trim suggestion from Abby's prompt

In `supabase/functions/generate-bp06-online-course/index.ts`, drop the `format` field from the JSON schema (or pin it to the string `"8.5 × 11\" PDF — Amazon KDP-ready"`) so Abby never proposes a different size. No `format_spec` block, no dropdown, no override.

## Out of scope

- Trim-size dropdown / picker UI (explicitly cut per user request).
- 7×10 and 6×9 layouts.
- Cover-file generation (handled in PublishNow.io).

## Verification

1. Open any existing workbook → Overview shows "Print format: 8.5 × 11" … KDP-ready".
2. Download PDF → renders at 8.5 × 11" (unchanged).
3. Download Word → opens at 8.5 × 11" page size (unchanged).
4. "Publish & sell on Amazon" block reads the new copy referencing 8.5 × 11" and PublishNow.io.
5. Generate a fresh workbook → no trim-size field appears anywhere; format is always shown as 8.5 × 11".

