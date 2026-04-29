## Final BP-01 → BP-09 Lineup

| Code | Display Name | Role | Change |
|---|---|---|---|
| BP-01 | Email Marketing | Nurture | unchanged |
| BP-02 | Lead Magnets | Capture | unchanged |
| BP-03 | Social Media | Attract | unchanged |
| BP-04 | Author Website | Hub | unchanged |
| BP-05 | Webinars | Lead-gen — fills the 1–2 hour live webinar where the sale happens | unchanged (clarify copy) |
| **BP-06** | **Book Sales / Live Audience Conversion Toolkit** | The conversion machinery used **inside** BP-05 webinars AND at in-person events: pricing strategy, Amazon listing, distribution channels, event sales scripts, QR code order pages | **NEW BP-06 under Branding & Marketing** |
| **BP-07** | Workbook | Entry digital product | **renumber** (was BP-06) |
| **BP-08** | Home Study Course | Mid-tier digital product | **renumber** (was BP-07) |
| **BP-09** | Special Editions | Premium physical (hardcover, signed, bundled) | **renumber** (was BP-08) |

The previous "BP-09 Live Audience Conversion Toolkit" is **absorbed into BP-06**, so the lineup stays at exactly 9 nodes (BA-10 still anchors the Build Authority series cleanly).

---

## Why this works
- **BP-05 + BP-06 are a pair.** BP-05 fills the room (webinar). BP-06 closes the sale (offer stack, slide closes, QR/order pages, event sales scripts, Amazon listing). Same toolkit serves both webinar attendees and in-person event audiences.
- **Existing BP-09 builder content** (pricing tiers, Amazon listing, distribution checklist, event sales scripts, QR order pages) is exactly what belongs in the new BP-06 — we reuse it.
- **Workbook, Home Study, Special Editions** all keep their existing builders and AI prompts; only their slot numbers and labels in the registry change.

---

## Implementation Plan (after approval)

### 1. Frontend registry — `src/components/dashboard/builders/builderNodeConfig.ts`
Current labels are wrong in several slots. Corrected map:
- BP-05 "Book Sales" → **"Webinars"** (icon `Video`, emoji 🎥)
- BP-06 "Workbook" → **"Book Sales"** (icon `BookOpen`, emoji 📚) — internal role: Live Audience Conversion Toolkit
- BP-07 "Audiobook" → **"Workbook"** (icon `FileText`, emoji 📓)
- BP-08 "Special Editions" → **"Home Study Course"** (icon `BookMarked`, emoji 🏠)
- BP-09 "Podcast" → **"Special Editions"** (icon `Sparkles`, emoji ✨)

### 2. Brand-tab cards — `src/config/abbyFrameworkConfig.ts`
- Move `book-sales-events` card from sequence 8 → **sequence 6** in Branding & Marketing (right after Webinars)
- Re-sequence: `workbooks` → 7, `home-study` → 8, `special-editions` → 9
- Drop the standalone "Live Audience Conversion Toolkit" concept — it now lives inside BP-06 Book Sales
- Update `ADVISOR_CONTENT["revenue-streams"]` recommendation order to match

### 3. Routing — `src/lib/node-slug-map.ts` + `src/pages/AuthorDashboard.tsx`
- `book-sales` section → **BP-06 builder** (this is the bug fix; today it misroutes to BP-05)
- `workbooks` → BP-07
- `home-study` → BP-08
- `special-editions` → BP-09

### 4. Builder components — rename & repoint, no rewrite
- Rename `BP06WorkbookBuilder` reference path → registry now points it at BP-07
- Rename `BP07HomeStudyBuilder` reference path → registry now points it at BP-08
- Rename `BP08SpecialEditionsBuilder` reference path → registry now points it at BP-09
- **New** `BP06BookSalesBuilder` — built by reusing the existing BP-09 Live Audience Conversion Toolkit builder code (pricing tiers, Amazon listing, distribution checklist, event sales scripts, QR order pages, plus webinar-stack additions: offer stack, slide closes, post-webinar follow-up emails)

### 5. Edge functions
- **New**: `supabase/functions/generate-bp06-book-sales/` (built from existing BP-09 generator content + webinar-conversion additions)
- Existing `generate-bp06-workbook`, `generate-bp07-coaching` (Home Study), `generate-bp08-mastermind` (Special Editions — note: function name is misleading, it actually generates Special Editions per its current code) keep their internal Deno function names. Only their UI labels change to BP-07, BP-08, BP-09 respectively. **No DB migration needed** — `author_nodes.node_id` values stay as written; only display labels change.
- Old BP-09 (Podcast/Mastermind) edge function leftover code is left in place but unlinked from the Brand tab.

### 6. Memory
- Update `mem://architecture/abby-7-engines-master-plan` and the BP lineup in Core to reflect the new BP-01 → BP-09 mapping.

---

## Out of scope
- BA-10 → BA-18 and YR-19 → YR-28 untouched.
- No database migrations; existing `author_nodes` rows keep their current `node_id` strings. Authors who already built a Workbook see it labelled BP-07.

Reply **approve** to proceed, or tell me what to adjust.