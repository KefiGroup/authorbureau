## Plan — BP-09 + BP-08 audit fixes (revised, no canonical-label changes)

Five surgical changes. Zero canonical-label/DB/docs-sprint impact.

---

### BP-09 changes (label "Book Sales" stays unchanged)

**1. Add an Amazon / bookstore purchase URL field**

The BP-09 `content_json` schema already allows `amazon_url` and `sales_page_url`, but the builder UI doesn't expose them and the QR on Slide 13 of the workshop deck currently uses a placeholder.

Files:
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — add a small "Where readers buy your book" group near the top of the Workshop tab with two inputs: `amazon_url` and `bookstore_url` (free-text URL, optional). Persist into `content_json.amazon_url` / `content_json.bookstore_url` using the existing autosave path. No new state machinery — reuse the `data` / `onChange` props that the tab already takes.
- `supabase/functions/export-bp09-slides/index.ts` — when rendering the QR slide, use `content_json.amazon_url || content_json.bookstore_url` as the QR target. Fall back to the microsite book URL if neither is set, then to a placeholder only if even that is missing.
- `supabase/functions/export-bp09-handout/index.ts` — same fallback chain in the printed handout footer so the printed copy matches the deck.

**2. Clarify the "Mark Toolkit Ready" CTA**

Audit flagged "ready for what?" confusion.

Files:
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` line ~357 — relabel button to "Save Toolkit to My Library" and add a one-line muted helper underneath: "Saves all four tabs to your Author Library. Nothing is published publicly." Same handler, same behaviour — copy-only change.

---

### BP-08 changes

**3. "Download as DOCX" on the Editions tab**

Author needs to send tier descriptions to a printer or gift buyer without copy-pasting.

Files:
- New edge function `supabase/functions/export-bp08-editions-docx/index.ts` — generates a .docx with one section per tier (name, price, physical specs, includes list, who-it's-for) plus the bundle offer at the end. Auth: dual-token via `_shared/builder-helpers.ts` pattern, service-role DB read.
- `supabase/functions/config.toml` entry — `verify_jwt = false` to match other export functions.
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — add "Download as DOCX" button on the Editions tab header. Wire via `fetchWithTimeout` + `getActiveToken` per Shared Backend Token Standard.

**4. Printable event order form template**

For manual sales at events.

Files:
- New edge function `supabase/functions/export-bp08-order-form/index.ts` — generates a print-ready HTML page (uses the same HTML→browser-print pattern as `printExportHtml`). Pre-fills book title and the 3 editions + prices from `content_json.editions`. Blank fields for buyer name, email, delivery address, edition choice, qty, payment method, signature.
- `supabase/functions/config.toml` entry — `verify_jwt = false`.
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — add "Download Event Order Form" button on the Bundle/Sales-Page area.

**5. Confirm library save + show inline download links**

Audit: "Save to My Library" gives no confirmation of what was saved or how to access it.

Files:
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — after `handlePublish` succeeds, render a confirmation panel below the CTA: "Saved 3 editions + bundle to your library" plus three inline buttons: "Open Author Library", "Download DOCX now", "Download Order Form now". Keep the existing CTA copy; only the post-save state expands.

---

### Out of scope (deliberately deferred)

- BP-09 rename — keeping "Book Sales" canonical; subtitle line already disambiguates.
- BP-08 bundle pricing calculator — Pricing tab content needs visual inspection first; will revisit once we see what ABBY puts there.
- BP-08 stale-badge cosmetic — likely already fixed by last turn's eager-shell change in `NodeBuilder.tsx`. Verify in spot-check; only revisit if it persists.
- BP-09 generation timing copy — minor; not bundling into this set to keep the diff focused.

---

### Verification after deploy

1. Open BP-09 → Workshop tab shows the Amazon/bookstore URL inputs; CTA reads "Save Toolkit to My Library" with the helper line.
2. Set Amazon URL on BP-09, regenerate the workshop .pptx → QR slide encodes the Amazon URL (not a placeholder).
3. Open BP-08 → "Download as DOCX" produces a clean printer-ready file with all 3 tiers + bundle.
4. Open BP-08 → "Download Event Order Form" produces a single printable page with editions pre-filled and blank buyer fields.
5. Click BP-08 "Save to My Library" → confirmation panel appears with three inline action buttons.

Approve to proceed.
