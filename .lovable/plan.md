## Goal

Drastically simplify the left sidebar. Per-book builders (Brand Products, Build Authority, Yield Revenue, Review & Publish) are no longer top-level navigation. They live **inside each book** — reached by clicking a book in My Books Hub, then navigating its tabs in Book Hub.

This eliminates the multi-book chooser problem at the sidebar level: the user always picks a book first via My Books Hub, so there is never an ambiguous "which book is this for?" click.

---

## New sidebar structure

```text
HOME
  Dashboard
  Ask ABBY                 (locked until 1+ book exists)

BUILD MY BUSINESS
  My Business Plan         (author-level — the ABBY analysis & plan)
  My Books Hub             (entry point to every book's builders)

YOUR BRAND
  Author Profile
  My Author's Page
  My Funnels
  My CRM                   (tier-gated)
  Messages

REVENUE & TOOLS
  Marketing Hub
  My Library
  Revenue Dashboard
  Connect Stripe
  Payout Settings
  Connect Settings
```

Removed from sidebar entirely:
- "Get Started" section header
- Brand Products
- Build Authority
- Yield Revenue
- Review & Publish
- The current-book pill, the multi-book chooser popover, and the collapsible "Build Your Business" group

---

## Where the builders live now

All four book-scoped builders are reached **only via Book Hub**:

```text
Sidebar → My Books Hub
        → [click a book card]
        → Book Hub (/book-hub/:bookId)
            ├── Analysis tab          (was: dashboard overview content)
            ├── 💰 Brand tab          (Brand Products — 9 nodes)
            ├── 📈 Build tab          (Build Authority — 9 nodes)
            ├── 🏆 Yield tab          (Yield Revenue — 10 nodes)
            ├── ✅ Review & Publish   (NEW tab — replaces sidebar item)
            └── Analytics tab
```

Book Hub already has Brand / Build / Yield tabs and routes individual node builders with `?bookId=...` attached, so the plumbing is in place. We add one new tab for **Review & Publish**.

---

## Flow by user state

| State | Dashboard main panel | Sidebar behaviour |
|---|---|---|
| **A — No profile, no book** | "Create your profile on PublishNow" CTA | Ask ABBY locked; My Business Plan and My Books Hub visible but show "Add a book first" toast on click for My Business Plan |
| **B — Profile, 0 books** | "Add your first book" CTA → My Books Hub | My Books Hub unlocked; My Business Plan locked until 1 book |
| **C — 1 book** | Quick card: "Continue working on *[Book Title]*" → opens that Book Hub. ABBY analysis nudge if not yet analyzed | All sidebar items active. Per-book work happens inside Book Hub |
| **D — Multiple books** | Multi-book picker grid (existing `MultiBookPicker.tsx`) — each card jumps into that book's Book Hub | Sidebar identical to State C — no per-book ambiguity because builders aren't in the sidebar |

---

## Files to change

1. **`src/components/dashboard/DashboardSidebar.tsx`**
   - Remove `businessItems` array (Brand / Build / Yield / Review & Publish), the collapsible "Build Your Business" section, the current-book pill, and `BookChooserPopover` integration.
   - Rename "GET STARTED" → "BUILD MY BUSINESS"; keep only `My Business Plan` + `My Books Hub` in it.
   - Remove props no longer needed: `currentBook`, `bookCount`, `books`, `perBookStats`, `onPickBookForSection`, `buildAuthorityCategoryOpen`, `yieldCategoryOpen`, `buildUnlocked`, `buildAuthorityUnlocked`, `yieldUnlocked`, `pendingReviewCount` (the badge moves to My Books Hub item only).
   - `My Business Plan` shown locked with "Add a book first" when `bookCount === 0`.

2. **`src/components/dashboard/DashboardLayout.tsx`** & **`src/pages/AuthorDashboard.tsx`**
   - Stop passing the removed props to `DashboardSidebar`.
   - Keep the `?bookId=` query handling for deep links from Book Hub into individual node builders (still needed).
   - Remove the "Pick a book to continue" guard for sidebar-driven entry into BP/BA/YR/Review (no longer reachable that way). Keep it as a safety net only for direct URL access (`/dashboard?section=revenue-streams`) — redirect such URLs to `My Books Hub` if no `bookId` is present.

3. **`src/components/dashboard/DashboardOverview.tsx`** (and the framework dashboard wrapper)
   - State A: profile creation CTA only.
   - State B: "Add your first book" CTA only.
   - State C: single-book quick-resume card linking to that book's Book Hub.
   - State D: keep `MultiBookPicker` grid as the primary surface.
   - Remove any inline "Brand / Build / Yield quick-jump" sections that bypass Book Hub.

4. **`src/pages/BookHub.tsx`**
   - Add a 5th tab `Review & Publish` between `🏆 Yield` and `Analytics`.
   - Render the existing review-products view (the same component used today by the sidebar's "Review & Publish") inside that tab, scoped to the current `bookId`.
   - Show a numeric badge on the tab when the book has pending review items.

5. **`src/components/dashboard/MyBooks.tsx`**
   - Each book card's primary action navigates to `/book-hub/:bookId` (already does for some flows — make uniform).
   - Surface per-book progress (Brand X/9, Build X/9, Yield X/10) on the card so users see status before entering.

6. **Delete or stop importing**:
   - `src/components/dashboard/BookChooserPopover.tsx` (no longer needed at sidebar level — can be kept if used elsewhere; otherwise remove import in sidebar).
   - `useMyBooks` calls inside `DashboardSidebar` (still used by dashboard overview).

No edge function or DB changes required. `author-stats` already supplies `bookCount` and per-book progress.

---

## Out of scope

- Renaming Book Hub tabs or reordering them beyond adding "Review & Publish".
- Changing how individual node builders consume `bookId` — they still accept it via route/query param.
- Tier gating logic (Brand/Build/Yield plan tiers) — still enforced inside Book Hub tabs themselves, not at the sidebar.
