# 02 · AB Author Journey Map

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `mem://ux/new-user-onboarding-flow`
- `mem://features/onboarding-and-manuscript-specs`
- `mem://ux/book-hub-architecture`

---

End-to-end flow from sign-up to first revenue.

## Stage 1 — Sign-up

1. Author lands on `authorsbureau.com` or is invited from PublishNow.io.
2. Signs up with email or Google (Supabase Auth).
3. `auth.users` insert trigger seeds 28 `author_nodes` rows (`status='draft'`).
4. Author lands on dashboard with the **3-step onboarding card**: Add book → Talk to ABBY → Activate first node.

## Stage 2 — Add a book

1. Author uploads manuscript (PDF / DOCX) OR provides a published-book URL.
2. Manuscript path: client-side `pdfjs-dist` / `mammoth` extracts text.
3. Published-book path: `parse-published-book` edge function scrapes metadata + sample.
4. Book row created in `books` (`published_at` initially NULL — admin gate).
5. `enrich-book-data` runs to fill cover, ISBN, etc.

## Stage 3 — Initial Analysis (BP-00)

1. ABBY runs `generate-bp00-analysis` → produces a **business plan** in `generated_assets`.
2. The Business Consultant chat flow walks the author through the plan (5 turns).
3. Author sees their personalised 28-node roadmap, sequenced by audience level.

## Stage 4 — Activate first Brand Product

1. Author opens BP-04 (Author Website) — recommended first node.
2. Reviews ABBY-drafted hero + about + sections.
3. Hits Activate → microsite goes live at `authorsbureau.com/<author>/<book>`.
4. Then BP-02 (Lead Magnet) → quiz live.
5. Then BP-01 (Email Marketing) → welcome sequence enrolling new subscribers.

## Stage 5 — First lead, first sale

1. Author shares microsite URL.
2. Reader takes quiz → enters CRM → enters email sequence.
3. Email Engine drives reader back to microsite → reader buys (BP-09 / BP-06 / BA-10).
4. Dual webhook (`verify-purchase` + `process-purchase`) confirms sale.
5. Author dashboard shows revenue tile increment + ABBY celebration nudge.

## Stage 6 — Scale via Build + Yield

1. ABBY's Daily Intelligence Report flags audience growth (`mem://ai/phased-product-sequencing-logic` Level 1+).
2. ABBY recommends moving to Sub-Phase B (digital products) → BP-06 / BP-07.
3. At Level 2+ (1k+ contacts), ABBY recommends Build nodes (BA-10 / BA-14).
4. At Level 4+ (5k+ contacts), ABBY recommends Yield nodes (YR-19 / YR-23).

## Touchpoints with ABBY (always-on)

- Persistent dashboard chat (`abby-chat`).
- Daily Intelligence Report email (06:00 author local).
- Real-time nudge cards (9 triggers).
- Per-node generators on activate.

## Author exports

- Business plan PDF (with disclaimers per `mem://features/author-export-packages`).
- Annual statements (`generate-annual-statements`).
- Course / workbook / sales packs (per node).

> Screenshots: Pauline can attach to a future revision. The flow above is the current source-of-truth narrative.
