# Analysis Tab — Design Rationale & Navigation Audit

## Part 1 — Why the Analysis tab looks the way it does

The Analysis tab (`BookHubOverview.tsx`) is the **strategic command center** for a single book. Its job is to answer one question fast: *"What is the next thing I should build for this book, and how far along am I?"*

### Color & UI rationale
The screen uses a deliberate three-stage color system tied to the **B-B-Y framework** (Brand → Build → Yield), defined in `categoryAccent.ts`:

- **Brand (💰 emerald/green)** — products & monetization. Green = money/growth.
- **Build (📈 violet)** — marketing & authority assets. Violet = creative/craft work.
- **Yield (🏆 sky blue / amber-gold)** — premium revenue (coaching, speaking). Gold = trophy/high value.
- **Secondary gold (#B8860B)** — Abby (the AI advisor) and "next action" highlights, reinforcing brand identity.
- **Emerald success bar** ("Yield Plan active — 28 of 28 builders unlocked") — confirms entitlement at a glance.

This matches the locked **visual identity & design freeze** memory: high-contrast cards, dark navy (#1B2A4A) for premium tier, gold for Abby/CTAs.

### Information hierarchy (top → bottom)
1. **Book context bar** — title, genre breadcrumb, "View Microsite" link, tabs (Analysis / Brand / Build / Yield / Review & Publish / Analytics).
2. **Hero strip** — `BookHubHeroStrip`: trophy progress (23 of 28, 82%), tri-color segmented bar showing per-stage completion, three clickable stage cards (BRAND 7/9, BUILD 6/9, YIELD 10/10), plus the "Continue Where You Left Off" CTA on the right colored by destination stage.
3. **Abby's Business Snapshot** — collapsible AI-advisor plan, with Refine / Download .docx / Replace manuscript actions.
4. **Plan status strip** — green confirmation of active subscription + manage-plan link.
5. **Your Next 3 Steps** (`JourneyStepper`) — the actionable list grouped by sub-category (Branding & Marketing, Digital Products, Scale Your Content), each row with code (BP-03), sequence number, status pill (Ready / In Progress / Completed / Locked), and a "Build Now →" CTA.
6. **Abby's Market Snapshot** — competitive scan + live trends.

The two-state design (pre- vs. post-analysis) is intentional: before consultation a single big "Analyze with Abby — Free" CTA dominates; after, the data-rich command center appears.

## Part 2 — Audit of clickable buttons and where they actually go

You're right to notice this — almost every action button on the Analysis tab routes the user to `/dashboard?section=…`, **not** to a dedicated `/book/:bookId/...` builder route. Source: `getStudioPath()` in `src/config/abbyFrameworkConfig.ts` (lines 215–242). Every node maps to `/dashboard?section=<name>&bookId=...`.

### Where each CTA actually leads

| Button | Destination | Notes |
|---|---|---|
| Continue / Start Building (hero CTA) | `/dashboard?section=<next-node>&bookId=…` | Correct destination, but URL leaves `/book/:id` |
| BRAND / BUILD / YIELD stage cards | Stays on Analysis page, switches local tab | OK |
| Build Now (BP-03 Social Media) | `/dashboard?section=social-media&bookId=…` | Correct — opens Social Media Manager inside dashboard shell |
| Build Now (BP-08 Book Sales) | `/dashboard?section=book-sales&bookId=…` | Correct |
| Build Now (BA-10 Online Course) | `/dashboard?section=courses&bookId=…&builder=online-course` | Correct |
| View Microsite | `https://authorsbureau.com/<authorSlug>/<bookSlug>` (new tab) | OK |
| Manage plan | `/account-settings?tab=billing` | OK |
| See full journey → | Switches Analysis → Brand tab in same page | OK |
| Brand / Build / Yield package cards (free tier only) | `/dashboard?section=build-business` | OK |
| Competitive Scan / Live Market Trends | Inside `MarketSnapshot` component | (need to verify — see audit step 1) |

### Why it feels like "going back to the dashboard"

The Book Hub lives at `/book/:bookId`, but every builder is mounted inside `AuthorDashboard.tsx` at `/dashboard` and selected via the `?section=` query param. So clicking *Build Now* on Social Media:

1. Navigates from `/book/<id>` → `/dashboard?section=social-media&bookId=<id>`
2. The dashboard sidebar reappears with "Dashboard" highlighted by default for a brief moment before `section=social-media` resolves
3. The user perceives this as "I just got bounced back to the dashboard home"

This is a structural UX issue, not broken links. The destinations are correct — but the transition reads as a regression.

## Part 3 — Recommended fixes (proposed, awaiting approval)

### Fix A — Make builder pages feel like "still inside the book"
Add a persistent **BookBuilderContextBar** at the top of every section the user reaches via `getStudioPath()` showing: book cover thumb · title · "← Back to Book Hub" link. (`BookBuilderContextBar.tsx` already exists — verify it's mounted on every section listed in the table above.)

### Fix B — Highlight the active section in the sidebar immediately
In `DashboardSidebar.tsx`, ensure the sidebar highlights the section from `?section=` query param on first paint, not after a re-render. This removes the "Dashboard flash" that feels like being sent home.

### Fix C — Preserve `?from=book-hub` so we can show a "Back to Be SUCKcessful" pill
When navigating from Analysis tab, append `&from=book-hub` to the URL. The destination renders a top-of-page chip: `← Back to Be SUCKcessful` linking to `/book/<id>`. Cheaper than refactoring routes.

### Fix D (larger, optional) — True nested routes
Move builder routes from `/dashboard?section=social-media&bookId=…` to `/book/:bookId/build/social-media`. Keep the dashboard sidebar visible, but the URL itself signals "you're inside this book". Bigger refactor — recommended only if A–C aren't enough after testing.

### Fix E — Verify two un-audited link clusters
1. `MarketSnapshot` — confirm "Competitive Scan" and "Live Market Trends" don't redirect to `/dashboard`.
2. `JourneyStepper` *Locked* state — currently calls `onUpgrade?.()` which navigates to `/dashboard?section=build-business`. Consider sending users to a dedicated `/upgrade?from=node:<id>` so the upgrade page can pre-select the right tier.

## Recommended sequencing

1. **Fix B** (sidebar active-state on first paint) — single-file change, biggest perceived improvement.
2. **Fix A** (mount `BookBuilderContextBar` on every builder section) — confirms "you're still on this book".
3. **Fix C** (back-pill via `?from=book-hub`) — additive, safe.
4. **Fix E** — small audit pass on MarketSnapshot + locked-node upgrade target.
5. **Fix D** — only if user testing still reports the "thrown back to dashboard" feeling after 1–4.

After approval I'll implement A, B, C, and E, then ask before tackling D.
