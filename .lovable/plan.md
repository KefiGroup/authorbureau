

# Plan — Fix Workbook (BP-06): Auto-Save, Branded PDF, and Author-Choice Pricing

Three independent fixes to the BP-06 Workbook builder so it behaves like the BA nodes you've already polished.

---

## Issue 1 — Workbook doesn't auto-save (refresh sends author back to step 0)

### Root cause
`BP06Builder.tsx` doesn't call `autosaveBuilderDraft(...)` after a successful generate. The BA builders (BA-10, BA-13, BA-14, BA-15, BA-16) all do — that's why they survive a refresh and BP-06 doesn't. The `InlineSectionCard` quick-edits already save, but the *initial* generated content never gets persisted to the draft store.

### Fix
1. Import `autosaveBuilderDraft, loadBuilderDraft` from `@/lib/builder-autosave` in `BP06Builder.tsx`.
2. After `setStep(2)` in `handleGenerate`, call:
   ```ts
   void autosaveBuilderDraft({ authorId, nodeId: "BP-06", nodeName: "Workbook", content: data.content, currentStep: 2 });
   ```
3. On mount (the existing `useEffect` that reads `author_nodes`), also try `loadBuilderDraft` as a fallback so a half-edited draft survives a refresh even before `status = "content_ready"`.
4. After every quick edit (in the existing `InlineSectionCard` save path) the row is already updated — no change needed there.

---

## Issue 2 — "PDF + Printable" is just claimed, no actual branded PDF is produced

### Current state
- The Review step shows badges like "52 pages" and "PDF + Printable" but those are just strings the AI returned.
- There is **no download affordance on BP-06 at all**. BA-10/13/14/15/16 show an `ExportPackageCard` (during review) and a `BANodeDownloadCard` (after publish) which use `src/lib/builder-pdf.ts` (jsPDF) and `src/lib/builder-export.ts` to produce a real, formatted PDF / DOCX / TXT package.
- The existing `builder-pdf.ts` is generic — fine for course outlines, but a **workbook is a fillable, page-by-page artifact** with a cover, contents, exercises, lined response space, and an action plan. Rendering it through the generic exporter won't look like a real workbook.

### Fix (two parts)

**Part A — Drop the existing `ExportPackageCard` + `BANodeDownloadCard` into BP-06 immediately**, so the author has *something* downloadable today (matches BA-10 pattern). Place `ExportPackageCard` inside the Review step and `BANodeDownloadCard` on the post-publish screen, exactly like `BA10Builder.tsx` lines 217–223 and 239–245.

**Part B — Add a workbook-specific PDF renderer** in a new file `src/lib/workbook-pdf.ts` that produces a real, printable workbook:
- **Cover page** — book title, workbook title, author name, tagline, "A Companion Workbook" label, brand footer.
- **Welcome / how-to-use page** — Abby's transformation promise + who-it's-for.
- **Table of contents** — auto-generated from `content.sections`.
- **One section per page-group** — section title as H1, description as intro paragraph, each exercise as a numbered prompt with **5–8 ruled response lines** (rendered as light grey horizontal rules using jsPDF `line()`), and an "After this section, you can:" outcome callout box at the end.
- **Action plan page** — pulled from `what_youll_get` plus a 30-day commitment grid (5 columns × 6 rows of empty cells).
- **Back cover** — author bio short line + link to the author's microsite + "Powered by Authors Bureau".
- Page size: US Letter, 1-inch margins, Helvetica, page numbers in the footer.

The Review step's "Download Workbook PDF" button calls this new renderer. The generic `ExportPackageCard` stays for the txt/docx/raw-content options.

**No new dependency** — `jspdf` is already installed (used by `builder-pdf.ts`).

---

## Issue 3 — Pricing is hard-coded to FREE; author should choose, with Abby's guidance

### Current state
- The edge function `generate-bp06-online-course/index.ts` (yes — that's the function name BP-06 uses; legacy naming kept) hard-codes `"suggested_price_usd": 0` and `"pricing_rationale": "Free lead magnet — captures email addresses and drives readers to your paid products"` in the prompt.
- The Review UI shows a single green "FREE Lead Magnet" badge with no input. There's already a `priceOverride` state variable in `BP06Builder.tsx` (line 49) and it's set from `data.content?.suggested_price_usd` after generate — but it's never *displayed* or *editable*.

### Fix

1. **Edge function — change the prompt** so Abby returns *both* a recommended path and a market-research-grounded rationale for each option:
   ```json
   {
     ...
     "pricing_recommendation": "free" | "paid",
     "suggested_price_usd": 0,                  // set when "paid", else 0
     "free_rationale": "Why FREE works: 2-3 sentences — list-building, top-of-funnel, low-friction onramp to your paid products.",
     "paid_rationale": "Why PAID works: 2-3 sentences with a market-research price band ($X–$Y) based on workbook depth, page count, and comparable workbooks in this niche."
   }
   ```
   Pricing band heuristic in the prompt: standalone workbook $7–$27, premium framework workbook $27–$47, companion to a course is best given free.

2. **Review UI — add a "Pricing" tab** (mirror BA-10's pricing tab):
   - Two large radio cards side-by-side: **FREE Lead Magnet** and **Paid Workbook**.
   - Selecting **FREE** → shows `free_rationale` underneath.
   - Selecting **Paid** → reveals a $ input pre-filled with `suggested_price_usd` (or $17 if the AI recommended free), shows `paid_rationale`, and the recommended price band (e.g. "$7–$27 typical").
   - Default selection = whatever Abby returned in `pricing_recommendation`.
   - A small `Sparkles` "Abby recommends: FREE because…" / "Abby recommends: $17 because…" line above the cards.
   - The badge in the Overview tab updates live based on the selection.
   - Choice is persisted via `autosaveBuilderDraft` (so refresh keeps it) and re-saved through the existing quick-edit save path on confirm.

3. **Sales page CTA copy** — when the author flips to Paid, the existing `cta_button_text` ("Download Free Workbook") must update too. Rule: if priced > $0 and the CTA contains the word "Free", swap it to "Get the Workbook — $X". This is a one-line transform in the Review render, not a re-generation.

---

## Files touched

- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — autosave wiring, new Pricing tab with FREE / Paid choice + Abby rationale, `ExportPackageCard` + `BANodeDownloadCard` integration, "Download Workbook PDF" button calling the new renderer, dynamic CTA swap.
- `src/lib/workbook-pdf.ts` — **new file**, branded workbook renderer (cover, TOC, ruled response lines, action plan, back cover) using existing `jspdf`.
- `supabase/functions/generate-bp06-online-course/index.ts` — prompt rewrite to return `pricing_recommendation` + `free_rationale` + `paid_rationale` + market-research price band.

## Out of scope

- Renaming the function from `generate-bp06-online-course` → `generate-bp06-workbook` (cosmetic; would break in-flight callers — defer).
- Uploading the generated PDF to PublishNow automatically (the author still downloads → uploads, as today; we'll just give them a properly formatted PDF to upload).
- Stripe wiring for the new "Paid Workbook" price (commerce engine already reads from `author_nodes.price_usd` once published — confirmed via `mem://architecture/commerce-engine-v1`).

## Verification

1. Generate a fresh Workbook → refresh the page → land back on the Review step with content intact (autosave).
2. Click **Download Workbook PDF** → open the file → see a cover page with book title, a TOC, sections with ruled response lines, an action plan, and a back cover. No black-box glyphs, no overlapping text.
3. Open the **Pricing** tab → see Abby's recommendation, switch between FREE and Paid → the Overview badge and Sales-page CTA update live → refresh → choice persisted.

