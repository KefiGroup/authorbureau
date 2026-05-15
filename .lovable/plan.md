## Goal

Replace the current dashboard (giant ABBY Journey Framework poster + scattered cards) with a focused, multi-book-aware control center that answers three questions at a glance:

1. **Where am I in my journey?** (one clear next step)
2. **Which book am I working on?** (all books visible, with per-book progress)
3. **What's the state of my business?** (portfolio totals + subscription + microsite)

The framework poster is removed from the dashboard entirely (it stays on the public Methodology / FAQ pages where it belongs as marketing material — it does not earn its place on a logged-in workspace).

## New layout (top → bottom)

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. WELCOME + NEXT-STEP HERO                                 │
│    "Welcome back, Pauline" + Yield Package badge            │
│    Big card: "Your next step → Build your first product"   │
│    [Primary CTA] [Secondary: Ask Abby]                      │
├─────────────────────────────────────────────────────────────┤
│ 2. PORTFOLIO SNAPSHOT (slim strip, 4 tiles)                 │
│    Books · Live Microsites · Streams Built (X/28×N) · Rev   │
├─────────────────────────────────────────────────────────────┤
│ 3. MY BOOKS  (always visible — works for 1 or many)         │
│    Grid of book cards: cover, title, X/28, B/B/Y mini bars, │
│    per-book "next step" chip, click → Book Hub.             │
│    [+ Add another book]                                     │
├─────────────────────────────────────────────────────────────┤
│ 4. THIS WEEK / SEASONAL                                     │
│    Special Edition Calendar (compact, 3 upcoming editions)  │
├─────────────────────────────────────────────────────────────┤
│ 5. PLAN & PROFILE (two-column on desktop)                   │
│    Left: Subscription status (current tier, manage)         │
│    Right: Compact Microsite card (preview + View Live)      │
├─────────────────────────────────────────────────────────────┤
│ 6. (collapsed) About the ABBY Framework                     │
│    Disclosure row — opens the poster + explainer for new    │
│    authors who want to learn the model. Closed by default.  │
└─────────────────────────────────────────────────────────────┘
```

## Section behavior

**1. Next-Step Hero** — single source of truth driven by existing `currentJourneyStep` logic (microsite → analyze → payments → build → earn). Replaces both `JourneyMapCTA` (framework poster) and `MeetAbbySection`. New component `NextStepHero`. Includes the "Your book is the HOOK" tagline as a small italic line.

**2. Portfolio Snapshot** — reuses the already-built `PortfolioSummaryBar` but as a slim 4-tile strip (drop the 5th tile, keep: Books / Live Microsites / Streams Built / Revenue). Aggregates across all books (e.g. "14/56 streams built" for 2 books).

**3. My Books grid** — promote `MultiBookPicker` to always show (not just when >1 book). For single-book authors it renders one card the same way, which makes the multi-book transition seamless. Each card adds a one-line "Next step for this book" chip (e.g. "Analyze with Abby", "Build first product", "Connect Stripe to sell"). Clicking opens `/dashboard/book/:id` (existing route).

**4. Special Edition Calendar** — keep `SpecialEditionCalendarCard` as-is; move below the books so it doesn't dominate.

**5. Plan & Profile two-column** — keep `SubscriptionPricing` block (user explicitly wants this) and `CompactMicrositeCard` side-by-side on desktop, stacked on mobile.

**6. About the Framework (collapsed)** — `<Collapsible>` row "Learn the ABBY Journey Framework" that, when opened, reveals the poster image + 4-step explainer. Hidden by default. New authors can learn the model; experienced ones never see it again.

## Files to change (all UI / presentation only — no backend changes)

- **Edit** `src/components/dashboard/ABBYFrameworkDashboard.tsx`
  - Remove standalone use of `JourneyMapCTA` and `MeetAbbySection` from both STATE A and STATE B branches
  - New top-down composition matching the layout above
  - Collapse STATE A and STATE B into one render path (the difference is only what `currentJourneyStep` resolves to — the new hero handles both naturally)
- **New** `src/components/dashboard/framework-dashboard/NextStepHero.tsx`
  - Personalized greeting + tier badge + dynamic next-step CTA + Ask Abby secondary
  - Receives `currentJourneyStep`, `authorName`, `tier`, `bookApproved`, `onAction`
- **New** `src/components/dashboard/framework-dashboard/BooksGrid.tsx`
  - Thin wrapper around `MultiBookPicker`'s card UI, always visible, with per-book next-step chip computed from `perBook` stats + book state
- **Edit** `src/components/dashboard/my-books/PortfolioSummaryBar.tsx`
  - Add a `compact` variant (4 tiles, no plan-status pill on the right since plan now lives in section 5)
- **New** `src/components/dashboard/framework-dashboard/FrameworkLearnMore.tsx`
  - Collapsible wrapper around the existing `frameworkImg` + 4-step text
- **Keep untouched**: `SubscriptionPricing`, `SpecialEditionCalendarCard`, `CompactMicrositeCard`, all data hooks (`useMyBooks`, `useAuthorStats`, `dashboard-state`)

## What is intentionally NOT changing

- No backend / edge-function changes. All data already loads via `dashboard-state`, `list-my-books`, `useAuthorStats`.
- No routing changes. Existing `onNavigate` actions are reused.
- No copy violations: keeps "Brand / Build / Yield Package" tier names, "28 streams" framing, "Your book is the HOOK" tagline, no emdashes on public surfaces (this is the dashboard — gold author view).
- The framework poster image file stays in `src/assets/` — just no longer the dashboard hero.

## Multi-book correctness

- `useMyBooks` already returns all books for the author across `author_id` / `owner_email` / pen-name matches.
- `useAuthorStats` already returns `perBook` (canonical source per memory). Each book card pulls its own `total / brand / build / yield` from there.
- Portfolio totals = sum across `perBook` entries (no new queries).
- Per-book next-step chip is derived client-side from existing fields (no schema change): no plan → "Analyze with Abby"; plan but 0 products → "Build first product"; products live but no Stripe → "Connect Stripe to sell"; otherwise → "View revenue".

## Out of scope (call out if you want them later)

- Drag-to-reorder books
- Inline rename / delete from the dashboard card (still done in My Books page)
- Book-level revenue breakdown on the snapshot strip (currently shows portfolio total only)
