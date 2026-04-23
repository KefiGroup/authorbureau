

# Author Asset Library — unify all 28 nodes + level up to pro-grade slides & visuals

## What you're asking for, in plain English
Right now, every node (BP-01 → YR-28) generates a JSON blob into `author_nodes.content_json` and each builder shows its own download buttons in its own way. The author has no single place to **see everything they own, re-download anything, or send the assets out into the world**. On top of that, the slide decks BP-09 produces today are flat `pptxgenjs` text frames — not what authors expect when they've seen tools like Gamma or Beautiful.ai.

Two things to fix:
1. **One central Author Library** that lists every asset built across all 28 nodes, with consistent re-download / re-edit / re-send actions.
2. **Pro-grade visual upgrade**: slide decks built with Gamma-style layouts and AI-generated cover/section images via Gemini 3 (already wired up in `generate-social-graphic`). Plus richer PDFs (workbooks, bulk-order proposals, handouts).

---

## Part 1 — What every node already produces (audit)

Below is the actual content sitting in `author_nodes.content_json` today, grouped by category. This is the master list the new Library will surface.

### Brand Products (BP-01 → BP-09)
| Node | Asset(s) in `content_json` | Best export format |
|---|---|---|
| BP-01 Email Marketing | 7 nurture emails + 5 broadcast templates + segments | DOCX, PDF, .eml |
| BP-02 Lead Magnets | Quiz (8Q + 5 results), gated landing page, social pack | PDF, public microsite |
| BP-03 Social Media | 20 branded posts + 4-week calendar + outreach kit | DOCX, CSV, PNG graphics |
| BP-04 Author Website | Full microsite copy (5 sections) | Live page + DOCX backup |
| BP-05 Webinars | Script, **slides**, promo emails, follow-up sequence | **PPTX (Gamma-style)**, PDF |
| BP-06 Workbook | Chapter-aligned exercises, prompts, templates | **Designed PDF workbook** |
| BP-07 Home Study | 21-day curriculum, lesson outlines, assessments | PDF curriculum + Thinkific bundle |
| BP-08 Special Editions | Tier descriptions, bonus list, signed-edition copy | PDF spec sheet |
| BP-09 Live Audience Toolkit | Workshop deck, signing kit, corporate deck, scripts, bios | **2× PPTX + PDF handout + PDF proposal** |

### Build Authority (BA-10 → BA-18)
| Node | Asset(s) | Best export |
|---|---|---|
| BA-10 Online Course | Full course outline, lesson scripts, quizzes | PDF, Thinkific CSV |
| BA-11 Audiobook | Chapter-by-chapter audio + cover art | MP3 zip + cover PNG |
| BA-12 Membership | Tier structure, content calendar, welcome emails | DOCX, PDF |
| BA-13 Group Coaching | Programme outline, weekly agendas, worksheets | PDF |
| BA-14 Podcast | Show concept, 12-episode arc, scripts | DOCX, RSS-ready text |
| BA-15 Media & PR | Press release, pitch list, media kit | DOCX, **designed PDF media kit** |
| BA-16 Affiliates | Programme rules, affiliate emails, swipe copy | DOCX |
| BA-17 Upsells | Bundle structure, pricing, upsell scripts | DOCX |
| BA-18 JV Partnerships | Partner list, outreach templates, deal terms | DOCX |

### Yield Revenue (YR-19 → YR-28)
| Node | Asset(s) | Best export |
|---|---|---|
| YR-19 1-on-1 Coaching | Packages, intake forms, sales scripts | PDF |
| YR-20 Big Ticket | High-end offer structure, sales letter | DOCX |
| YR-21 Speaking | Speaker brand, topic list, **keynote deck**, one-sheet | **PPTX + designed PDF one-sheet** |
| YR-22 Corporate Training | 8-step pedagogical programme | PDF curriculum + **PPTX** |
| YR-23 Mastermind | Programme structure, application, agendas | PDF |
| YR-24 Retreats | Itinerary, sales page, packing list | **Designed PDF itinerary** |
| YR-25 Certification | Curriculum, exam, certification docs | PDF |
| YR-26 Conference | Agenda, sponsor deck, speaker brief | **PPTX + PDF agenda** |
| YR-27 Fundraising | Campaign copy, donor emails, pitch deck | **PPTX + DOCX** |
| YR-28 Sponsors | Sponsorship tiers, prospectus | **Designed PDF prospectus** |

The data is already there. What's missing is a **single shelf to put it on** and **better-looking exports**.

---

## Part 2 — The Author Library (new)

### New page: `/dashboard?section=library` ("My Library")

A single screen that lists every asset the author has ever built. Three view modes:

**A. Grouped by node (default)** — collapsible cards for each of the 28 nodes the author has touched, showing every downloadable file inside.

**B. Grouped by format** — "All slide decks", "All PDFs", "All written copy", "All graphics" — useful when the author thinks "I just need a deck for tomorrow's lunch".

**C. Recent activity** — flat list, newest first.

Each row exposes the same 5 actions:
- **Open** — re-opens the source builder at the Review step (so they can edit)
- **Download** — dropdown: Copy text · TXT · DOCX · PDF · PPTX (only formats valid for that asset)
- **Send** — push to email, Buffer (social), or Marketing Hub (where applicable)
- **Public link** — copy the live URL (for nodes that publish)
- **Regenerate** — rebuild this asset with one click (triggers the node's generate function)

### Where it lives
- Dashboard sidebar gets a new "My Library" entry between "Marketing Hub" and "Revenue Dashboard"
- Brand Products / Build Authority / Yield Revenue hub cards each get a small "View in Library →" footer link
- Every builder's `PublishSuccessScreen` gains an "Open in Library" CTA

### Backing query
A new edge function `get-author-library` reads `author_nodes` for the user, returns:
```json
{ "nodes": [
  { "node_id": "BP-09", "personalised_name": "...", "status": "live", "updated_at": "...",
    "assets": [
      { "type": "pptx", "label": "Workshop deck", "key": "workshop", "size_estimate": "14 slides" },
      { "type": "pptx", "label": "Corporate lunch deck", "key": "corporate_lunch" },
      { "type": "pdf", "label": "Workshop handout", "key": "handout" },
      ...
    ]}
] }
```

The asset list per node is computed by a small `nodeAssetRegistry.ts` that maps each `node_id → asset definitions`. New utility, no schema change.

---

## Part 3 — Pro-grade visual upgrade

Two upgrades, applied to every node that produces visual output.

### 3a. Gamma-style slide decks (replaces the current flat pptxgenjs output)

A new shared edge function `export-pro-slides` takes any node's slide JSON and renders it through a **library of 6 Gamma-inspired layouts**, picked automatically based on slide content:

| Layout | Use case |
|---|---|
| Hero cover | Title slide — full-bleed AI-generated image, large serif title overlay |
| Big stat | Single slide with one giant number + caption |
| Two-column split | Image left (40%), text right (60%) — for case studies |
| Bullet rail | 3-5 bullets with colored circle icons in left rail |
| Quote slide | Pull-quote with attribution, muted background |
| Divider | Section break — full-color background, white sans-serif title |

Implementation:
- `pptxgenjs` (already installed) does the heavy lifting — it supports gradients, shapes, images, master slides
- A `slide-themes.ts` module ships **3 starter themes** authors can pick from at export time: **Editorial** (serif + cream), **Boardroom** (navy + white), **Bold** (high-contrast color blocks)
- Theme picker appears on the export modal: "Choose a look" → 3 thumbnail previews → Download

### 3b. AI cover/section images via Gemini 3 (Nano Banana family)

You already use `google/gemini-3-pro-image-preview` in `generate-social-graphic`. Extend the same pattern:
- When a deck or designed PDF is exported, the system first generates **a cover image and 2-3 section dividers** via Gemini 3, prompted with the book's core thesis + author's brand colors
- Images are cached in the `social-media-graphics` bucket (already exists, public) keyed by `{author_id}/{node_id}/{asset_key}` so re-downloads are instant
- Author can swap the AI image for their own upload via a "Replace cover" button

This is the same hop you're already doing for social graphics — just applied to slide covers, PDF hero pages, media kits, retreat itineraries, sponsor prospectus, etc.

### 3c. Designed PDFs (replaces TXT-style PDF dumps)

A new shared edge function `export-pro-pdf` renders rich-layout PDFs (not just paragraphs of text). Built on a small HTML-to-PDF pipeline using a Deno-friendly renderer (we already do similar work for handouts via `export-bp09-handout`). Each pro PDF gets:
- Branded cover page (author photo + book cover + AI hero image)
- Section dividers with section number + title
- 2-column body where appropriate (workbook exercises, retreat itineraries)
- Footer with "Powered by Authors Bureau" (existing standard)
- Pulls accent color from author profile (or defaults to navy + gold)

Nodes that get the pro-PDF treatment first: **BP-06 Workbook**, **BP-09 handout/proposal** (already done — will be re-themed), **BA-15 media kit**, **YR-21 speaker one-sheet**, **YR-24 retreat itinerary**, **YR-28 sponsor prospectus**.

---

## Part 4 — Files to add / change

### New
- `src/pages/AuthorLibrary.tsx` — the My Library page (3 view modes, asset rows)
- `src/components/library/AssetRow.tsx` — single asset row with the 5 actions
- `src/lib/nodeAssetRegistry.ts` — declares which assets each of the 28 nodes exposes
- `src/lib/slide-themes.ts` — the 3 pro slide themes + 6 layout templates
- `supabase/functions/get-author-library/index.ts` — returns the author's full asset inventory
- `supabase/functions/export-pro-slides/index.ts` — universal slide exporter (Gamma-style, theme-aware)
- `supabase/functions/export-pro-pdf/index.ts` — universal designed-PDF exporter
- `supabase/functions/generate-cover-image/index.ts` — Gemini 3 hero/divider images, cached to storage

### Modified
- `src/components/dashboard/DashboardSidebar.tsx` — add "My Library" entry
- `src/components/dashboard/builders/shared/ExportPackageCard.tsx` — add a `pptx` button that calls `export-pro-slides` when content includes slides, and a "Choose theme" picker
- `src/components/dashboard/builders/shared/PublishSuccessScreen.tsx` — add "Open in Library" CTA
- All 6 builders that output slides (BP-05, BP-09, YR-21, YR-22, YR-26, YR-27) — swap the local pptx code for a single call to `export-pro-slides`
- `supabase/functions/export-bp09-slides/index.ts` — deprecate / re-route to `export-pro-slides`
- `supabase/config.toml` — register 3 new functions with `verify_jwt = false`

### Database
No schema changes required. `author_nodes.content_json` already holds everything. New `generate-cover-image` writes to the existing `social-media-graphics` bucket.

---

## Part 5 — Out of scope for this sprint
- Live Gamma API integration (their public API isn't open enough yet — we mimic the look with pptxgenjs themes)
- Real-time collaborative editing of slides (download-only)
- Auto-publishing slides to Google Slides / SlideShare
- Re-flowing existing live nodes — old content stays as-is until the author hits "Regenerate" or re-exports
- Versioning / history of past exports (single latest version per asset for now)

## Part 6 — Validation
1. Visit `/dashboard?section=library` — see every node the author has built, grouped 3 ways
2. Click "Download → PPTX" on a BP-09 workshop deck → choose Editorial theme → file opens with hero image, big-stat slide, bullet rail, quote slide, branded divider
3. Click "Download → PDF" on a BP-06 workbook → opens a designed multi-page PDF with cover, exercises in 2-column, footer
4. Click "Regenerate" on any asset → existing builder generate function runs, asset updates, library refreshes
5. Cover images on second export are served from cache (no Gemini call)
6. Author can swap the AI cover with their own uploaded image and re-download

