# Microsite Cleanup — Render-Time Fixes + Targeted Generator Prompts

## Ground-truth findings (live audit on authorsbureau.com)

I just opened the two lowest scorers in the browser. The good news: **CTAs are NOT missing** — both pages have working forms/buttons rendered by `MicrositePage.tsx` defaults. The real problems readers actually see are different and more important:

**`/pauline-teo/vip` (4/8)**
- Pricing exposed: `$5,000`, `$12,000`, `$25,000` — violates "no pricing on public microsites"
- Empty offer titles: "Offer 1 / Offer 2 / Offer 3" (JSON has prices but no `name` / `title`)
- Visible emdashes in body copy and form helper text
- Tiny "Pauline Teo" header bar at top — violates "no nav header"

**`/pauline-teo/certification` (5/8)**
- Pricing exposed: `$3,500` and tier label "Associate"
- Visible emdashes in tagline and body ("Every Master Was Once a Disaster — start by sucking…")
- Same "Pauline Teo" header bar

This pattern is the same across all 21 flagged pages. The fix order should be: **(A) render-time sanitization** (instant, blanket coverage of all 28 pages), then **(B) targeted JSON repair for VIP**, then **(C) generator prompt hardening** (so future writes stay clean).

## Pass A — Render-time sanitization (fixes all 28 pages instantly, no regen)

### A1. Strip emdashes server-side in `get-microsite-page`
Walk the resolved `content_json` and `book` payloads recursively before responding; replace `—` (U+2014) and `–` (U+2013) with `, ` (or ` - ` when between digits like ranges). Also strip from `bio_short`, `bio_long`, `tagline`, `credentials` on the author payload. Single function deployment fixes every existing page on next reader visit.

### A2. Hide pricing on the rendered microsite (`src/pages/MicrositePage.tsx`)
- Remove the price column on YR-20 offer rows; show only the offer name + a single "Apply" CTA.
- Remove the headline price block on YR-25 (Certification); replace with a quiet "Application required" line above the CTA.
- Audit all other paid-tier renderers (YR-19 Coaching, YR-23 Mastermind, YR-24 Retreats, BA-13 Group Coaching, BP-07 Home Study, BP-08 Special Edition) and apply the same suppression. Pricing only appears server-side in the BuyNowButton checkout flow, never in static page chrome.

### A3. Remove the small "Pauline Teo" header bar
Find the breadcrumb/header injection at the top of microsite pages and remove it (or wrap it behind an `isOwnerPreview` flag so authors still see context but readers don't). Public site rule says: no nav header.

### A4. Field hygiene fallbacks
In MicrositePage's YR-20 renderer, when an offer has no `name`/`title`, fall back to deriving one from the offer's `description` first sentence (or hide the row entirely instead of showing "Offer 1"). Same pattern for any other node that loops a list — never render numeric placeholders.

## Pass B — Targeted JSON repair for VIP (one author, one node)

Pauline's YR-20 `content_json.offers` array has prices but no titles. Either:
- Re-run the YR-20 generator with the hardened prompt (preferred — catches all five missing-title authors at once if there are any), or
- Patch this specific row to add three offer titles: "Sucking Sprint", "SUCKCESS Incubator", "Mentorship". 

Decision after Pass A: if the offers UI now hides untitled rows cleanly, no patch needed. If empty rows would be a regression, run a targeted regeneration.

## Pass C — Generator prompt hardening (prevents recurrence)

Add a single shared block to all 28 generator system prompts:

```
HARD RULES (these will fail QA if violated):
- NEVER use emdash (—) or endash (–). Use commas, periods, or " - " for ranges only.
- NEVER include dollar amounts, prices, or tier labels like "Associate"/"Pro" 
  in body copy, taglines, headlines, or descriptions. Pricing lives in price_usd only.
- Every list item (offer, package, module, episode) MUST have a `title` or `name` 
  field with concrete, descriptive copy — never generic placeholders.
- Use the author's brand vocabulary (frameworks, signature phrases) verbatim.
```

Apply to all `generate-yr*`, `generate-ba*`, `generate-bp*` functions. Single shared constant imported by each, no per-file copy-paste drift.

## Pass D — Re-audit

After Passes A & C deploy, re-score all 28 of Pauline's URLs using the same 8-point rubric. Target: every page ≥ 7/8, with VIP and Certification specifically returning to 8/8.

## Technical Details

- **Files edited**: `supabase/functions/get-microsite-page/index.ts` (A1), `src/pages/MicrositePage.tsx` (A2, A3, A4), all `supabase/functions/generate-{yr,ba,bp}*/index.ts` (C — shared prompt constant).
- **New file**: `supabase/functions/_shared/microsite-content-rules.ts` exporting `HARD_RULES_PROMPT` constant + `stripDashes(value: any): any` recursive helper. Both consumed by Pass A1 and Pass C.
- **No DB migration required** for Pass A; optional regeneration for Pass B.
- **Edge function deploys**: `get-microsite-page` immediately; generators only when each is next invoked.
- **Risk**: low — sanitizer is read-only output transform; pricing-removal is deletion of UI elements with no data writes.

## Out of scope for this sprint

- "Coming Soon" routing for unbuilt nodes (separate audit item)
- L1–L8 QA gate execution (post-fix)
- Mobile-overflow fixes (none observed in the two ground-truth pages; will re-check during re-audit)
