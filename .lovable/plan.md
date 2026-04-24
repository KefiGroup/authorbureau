## Goal

Make the dashboard explicitly state-aware so the user always sees the right "next move" based on whether they have **(A) no profile**, **(B) profile but no book**, **(C) one book**, or **(D) multiple books** — and rework the left sidebar so the per-book builders (BP / BA / YR / Review & Publish) cannot be entered without first picking which book they apply to.

---

## The 4 dashboard states

### State A — Brand new user (no profile, no book)
**Main panel:**
- Hero: "Welcome — let's set up your author profile first"
- Single primary CTA: **Create my profile on PublishNow**
- Secondary: **I've done it — Sync now**
- Hide everything below (Abby, Framework, books grid)

**Sidebar:**
- Show only: Dashboard, Ask ABBY (greyed w/ tooltip "Add a book first"), Author Profile
- BP / BA / YR / Review & Publish / My Books Hub / My Funnels → locked with tooltip "Add a book to unlock"

---

### State B — Profile complete, 0 books
**Main panel:**
- Profile-complete confirmation strip (green)
- Big card: **"Add your first book to unlock your business plan"**
  - Primary CTA: **Add a book** (→ My Books Hub → add flow)
  - Sub-text: "Each book gets its own 28-revenue-stream business plan"
- Below: muted preview of the ABBY framework (visual only, not interactive)

**Sidebar:**
- Unlock: My Books Hub
- BP / BA / YR / Review & Publish remain locked w/ tooltip "Add a book first"

---

### State C — Exactly 1 book
**Main panel — auto-focuses on that one book:**
- "Working on: *[Book Title]*" context header (no picker needed)
- Show the existing **Meet Abby — Analyze Your Book** card *only if* the book hasn't been analyzed
- After analysis: show book progress bar `X/28 revenue streams built` + 3 quick-jump cards (Brand 0/9, Build 0/9, Yield 0/10)

**Sidebar:**
- The current book is auto-selected (the existing currentBook pill shows it)
- BP / BA / YR / Review & Publish are clickable and route directly with the book context attached (`?bookId=...`)
- No book switcher needed (only 1 book)

---

### State D — Multiple books
This is the key new behaviour. **Builders are book-scoped — the user must always pick which book they're working on.**

**Main panel:**
- Header: "You have N books" + small "Add another book" link
- **Book picker grid** (cards, one per book):
  ```
  ┌─────────────────────┐  ┌─────────────────────┐
  │ Cover               │  │ Cover               │
  │ Title               │  │ Title               │
  │ ▓▓▓▓░░░░ 12/28      │  │ ▓░░░░░░░ 2/28       │
  │ Brand 5/9 Build 4/9 │  │ Brand 2/9 Build 0/9 │
  │ Yield 3/10          │  │ Yield 0/10          │
  │ [Open this book →]  │  │ [Open this book →]  │
  └─────────────────────┘  └─────────────────────┘
  ```
- "Open this book" sets the active bookId and lands on that book's hub view (same UX as State C for that book)

**Sidebar — new behaviour when user has >1 book and no active book selected:**
- BP / BA / YR / Review & Publish are **visible but show a "Choose a book" state** instead of locked
- Clicking them does NOT navigate to the builder; instead it opens a small **book chooser popover** ("Which book is this for?") listing all books → on pick, it sets `?bookId=...` and navigates to the builder
- Once a book is active (`?bookId` present), the existing currentBook pill appears at the top of the Build Your Business section showing `[Book Title] — 12/28` with a "Switch book" affordance
- My Books Hub stays the canonical place to switch/add books

---

## Sidebar changes summary

| Item | No book | 1 book | Multiple books, no active | Multiple books, active book |
|------|---------|--------|---------------------------|------------------------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Ask ABBY | locked | ✓ | ✓ | ✓ |
| My Books Hub | locked | ✓ | ✓ | ✓ |
| My Business Plan | locked | ✓ (auto-book) | "Pick a book" chooser | ✓ (current book) |
| Brand Products | locked | ✓ (auto-book) | "Pick a book" chooser | ✓ + per-book badge |
| Build Authority | locked | ✓ | "Pick a book" chooser | ✓ + per-book badge |
| Yield Revenue | locked | ✓ | "Pick a book" chooser | ✓ + per-book badge |
| Review & Publish | locked | ✓ | "Pick a book" chooser | ✓ |
| Author Profile / Microsite / Funnels / CRM / Messages | ✓ (author-level, no book scope) |
| Marketing Hub / Library / Revenue / Stripe / Payouts / Connect | ✓ (author-level) |

---

## Files to change

1. **`src/components/dashboard/DashboardOverview.tsx`** — add the 4-state branching (states A/B/C/D). Replace the current "Get Started" 3-step grid with state-specific content. Keep the sync-from-publishnow plumbing.
2. **`src/components/dashboard/DashboardSidebar.tsx`** — add `bookCount` prop; make BP/BA/YR/Review locked when `bookCount === 0`; when `bookCount > 1` and no active book, intercept clicks on those items and open a new `<BookChooserPopover>`.
3. **New `src/components/dashboard/BookChooserPopover.tsx`** — small list of the user's books that, on pick, navigates to `<intendedSection>?bookId=<picked>`.
4. **`src/components/dashboard/DashboardLayout.tsx`** — pass `bookCount` from `stats` into the sidebar; pass the books list (or fetch on demand inside the popover via the existing `get-author-book` / a new `list-author-books` shape — reuse what `useAuthorStats` already returns where possible).
5. **`src/pages/AuthorDashboard.tsx`** — when entering BP/BA/YR/Review without a `bookId` and the user has >1 book, render a **"Pick a book to continue"** chooser instead of the builder list (defence in depth in case a user types the URL directly).
6. **`src/components/dashboard/MyBooks.tsx`** — add the multi-book picker grid (card per book with B/B/Y progress) used by State D's main panel.

No edge function or DB changes — `author-stats` already returns `bookCount` and `products.perBook` with brand/build/yield/total per book, which is everything the new UI needs.

---

## Out of scope (call out, not doing now)
- Author-level vs book-level node split (e.g. some BP nodes today are tracked on `author_nodes` with no book_id and get attributed to the oldest book). That attribution stays as-is; we just surface it cleanly per book in the new UI.
- Changing how builders themselves consume `bookId` — they already accept it via route/query param.
