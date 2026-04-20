
## Sprint 39 — 3-Phase Build Plan

### Phase 1 — Sprint 38 Carry-Over Fixes ✅ DONE
- **A1** Webinar index page (`/[slug]/webinar`) — public render with cards or empty state
- **A2** Lead capture form on `/[slug]` — Name + Email only, redirect to `/[slug]/thank-you` ✅
- **A3** Review & Publish "Unknown Book" — author-primary-book fallback ✅

A1 status: needs verification — confirm `/pauline-teo/webinar` renders (not blank spinner). If still blank, fix `AuthorSubpageResolver` route mapping for `bookSlug === "webinar"` and create `WebinarIndexPage` querying `webinars` table by `author_id` + `status='active'`.

---

### Phase 2 — Commerce Engine Foundation ✅ DONE
- DB migration: `purchases`, `courses`, `course_modules`, `course_lessons`, `course_enrolments`, `course_progress` + `author_nodes` columns (`stripe_product_id`, `stripe_price_id`, `payment_link`)
- Stripe Connect UI in Account Settings (connect/disconnect, connected badge)
- `RequireStripeConnected` guard modal
- `setup-stripe-product` edge function
- `process-purchase` Stripe webhook edge function
- `STRIPE_WEBHOOK_SECRET` configured

---

### Phase 3 — Brand Products Nodes BP-06 → BP-09 (THIS PASS)

Build the four final Brand Products node builders. Each uses the standard 4-step Universal Builder pattern (Setup → Generate → Review → Publish), Lovable AI Gateway for content, Stripe payment links via `setup-stripe-product`, microsite pages via `AuthorSubpageResolver`, and writes to `author_nodes` for status tracking.

**BP-06 — Workbook**
- Builder route: `/dashboard?section=node-builder&node=BP-06`
- AI generates 40-80 page workbook (exercises, templates, action plans) from manuscript
- Stored in `workbooks` table (existing) + `generated_assets`
- Stripe product (one-time purchase, author-set price)
- Public microsite: `/[slug]/workbook/[bookSlug]`
- Edge fns: `generate-bp06-workbook`, `publish-bp06-workbook`

**BP-07 — Home Study Course** *(gated: requires Workbook for same book — see product-development-sequence memory)*
- Builder route: `/dashboard?section=node-builder&node=BP-07`
- AI generates self-paced curriculum (modules, daily schedule, reflection exercises) referencing the existing workbook
- Writes to `home_study_courses` + `course_modules` + `course_lessons` (Phase 2 schema)
- Stripe product + enrolment via `course_enrolments` on purchase webhook
- Public microsite: `/[slug]/home-study/[bookSlug]` + gated learner area `/learn/[courseId]` (uses `course_progress`)
- Edge fns: `generate-bp07-home-study`, `publish-bp07-home-study`

**BP-08 — Special Editions**
- Builder route: `/dashboard?section=node-builder&node=BP-08`
- AI generates special-edition proposals, bundle descriptions, pre-order copy (signed/collector/bundle variants)
- Stored in `special_editions` table (create if missing) + `generated_assets`
- Stripe product per edition (one-time)
- Public microsite: `/[slug]/special-editions/[bookSlug]`
- Edge fns: `generate-bp08-special-editions`, `publish-bp08-special-editions`

**BP-09 — Book Sales at Events**
- Builder route: `/dashboard?section=node-builder&node=BP-09`
- AI generates QR landing copy, event pricing, bundle offers, follow-up email sequence
- Stored in `event_book_sales` table (create if missing) + `generated_assets`
- Stripe payment link + QR code generation (use `qrcode` npm)
- Public microsite: `/[slug]/order/[bookSlug]` (mobile-first, single-tap checkout)
- Edge fns: `generate-bp09-book-sales`, `publish-bp09-book-sales`

**Cross-cutting**
- Each builder: Methodology panel (5 tabs), category-aware UI (Brand = Teal), `RequireStripeConnected` guard before publish
- Sidebar Brand Products counter → 9/9 once all four are built
- Brand Products Hub status cards updated to recognise BP-06→09 published states
- Update `to-do.md` and `sprint-tracker.md` (Sprint 13B → COMPLETE)

### Files (Phase 3 only, ~16 new + 6 edits)
- `src/pages/node-builders/BP06WorkbookBuilder.tsx`, `BP07HomeStudyBuilder.tsx`, `BP08SpecialEditionsBuilder.tsx`, `BP09BookSalesBuilder.tsx`
- `src/pages/microsites/Workbook.tsx`, `HomeStudy.tsx`, `SpecialEditions.tsx`, `OrderBook.tsx`
- `src/pages/learn/CoursePlayer.tsx` (BP-07 gated learner)
- 8 edge functions (`generate-bp0X-*`, `publish-bp0X-*`)
- Migration: `special_editions`, `event_book_sales` tables (if not present) with RLS
- Edits: `AuthorSubpageResolver.tsx` (4 new routes), `BrandProductsHub.tsx` (4 new cards/states), sidebar counter, `node-slug-map.ts`, `to-do.md`, `.lovable/sprint-tracker.md`

### Verification
- Build all four nodes end-to-end as Pauline → publish → public URLs render → Stripe test purchase fires `process-purchase` → `author_nodes.status = 'live'` → Brand Products Hub shows 9/9 → Review & Publish lists all 9 with URLs.
