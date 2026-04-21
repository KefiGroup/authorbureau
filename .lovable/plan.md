

## Goal
Collapse the multiple paths into ONE canonical flow:

**Sidebar (any item) → My Books Hub → Pick Book → Brand/Build/Yield tab → Node card → Builder (Introduction → Generation → Review → Publish/CTA)**

## Current Confusion
Today there are 3 parallel ways to reach a node builder:
1. **Book Hub path** (the path you want): `/my-books` → book → Brand/Build/Yield tab → node
2. **Standalone hub path**: Sidebar "Brand Products / Build Authority / Yield Revenue" → `/brand-products` (no book context, picks the latest book silently)
3. **Direct builder routes**: e.g. back-buttons inside builders go to `/brand-products` instead of back to the book

## Proposed Changes

### 1. Sidebar — funnel everything through Book Hub
In `AuthorSidebar` (and any nav that links to `/brand-products`, `/build-authority`, `/yield-revenue`):
- Keep the labels **Brand Products / Build Authority / Yield Revenue** (they're useful signposts and tier indicators)
- Change their click target to **`/my-books?intent=brand`** (or `intent=build` / `intent=yield`)
- "My Books Hub" sidebar item stays as `/my-books`

### 2. Book Hub — handle the `intent` param
In `src/pages/BookHub.tsx`:
- Read `?intent=brand|build|yield` from the URL
- If user has only **one book**: auto-select it and jump straight to that tab on the book page
- If user has **multiple books**: show the book picker with a banner: *"Select a book to start building your Brand Products"*
- If user has **no books**: show "Add your first book" CTA (existing empty state)

### 3. Retire standalone hub routes
In `src/App.tsx`:
- `/brand-products`, `/build-authority`, `/yield-revenue` become redirects to `/my-books?intent=…`
- Delete the standalone `BrandProductsHub.tsx`, `BuildAuthorityHub.tsx`, `YieldRevenueHub.tsx` pages (or keep as thin redirect components for back-compat)

### 4. Builder back-buttons — return to the book, not the hub
Every builder currently does `navigate("/brand-products")` etc. on Back/Close. Change all 28 builders to:
```
navigate(`/book/${bookId}?tab=brand`)   // or build / yield
```
The `bookId` is already available in the builder context (`author_nodes.book_id` or the active book).

### 5. Lock down the canonical flow
- After "Publish" in any builder → navigate to **Marketing Hub** (`/marketing-hub?node=BP-02`) which is the existing CTA target — no change needed, just make sure every builder uses it consistently.
- Remove any "Build Now" buttons on the dashboard cards that bypass the book picker.

## Files Touched (≈20)
- `src/App.tsx` — 3 route redirects
- `src/components/dashboard/AuthorSidebar.tsx` — change 3 link targets
- `src/pages/BookHub.tsx` — handle `?intent=` param + auto-select single book
- `src/pages/AuthorDashboard.tsx` — update the 3 `dashboardNavigate("/brand-products")` calls
- All 28 builder files (`bp01`–`bp09`, `ba10`–`ba18`, `yr19`–`yr28`) — replace `navigate("/brand-products|build-authority|yield-revenue")` with `navigate(\`/book/\${bookId}?tab=…\`)`
- Optional: delete `BrandProductsHub.tsx`, `BuildAuthorityHub.tsx`, `YieldRevenueHub.tsx`

## Result
One mental model for the author. Sidebar items are signposts; every road leads through the Book Hub so the user always knows **which book** they're building for before they hit a builder. Inside a builder the flow stays exactly as you described: Introduction → Generation → Review → Publish.

