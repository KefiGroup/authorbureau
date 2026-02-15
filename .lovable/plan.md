
# Microsite Workflow Redesign (Shared Database)

## What Changed

PublishNow.io and Authors Bureau share the **same database**. This eliminates the need for:
- Cross-database sync edge functions
- Separate credentials or service role keys
- Any "sync" buttons, sync timestamps, or sync status indicators

Instead, both platforms read and write to the same tables. When an author creates a profile or book on PublishNow.io, that data is already in the same database Authors Bureau reads from. No syncing required.

---

## What Stays the Same

The visitor-facing book microsite page (`/books/:slug` rendered by `DynamicBookMicrosite.tsx`) is untouched. The layout, hero, bestseller proof, author bio, and purchase links all remain exactly as they are.

---

## Revised Plan

### 1. Replace `/create-microsite` with a Marketing Landing Page

**File**: `src/pages/CreateMicrosite.tsx`

Remove the inline form and live preview. Replace with:
- Hero section explaining what book microsites are and their benefits
- Two clear call-to-action paths:
  - **"I use PublishNow.io"** -- Sign in to see your books (data is already in the shared database)
  - **"I have a published book"** -- Sign in and add books via Amazon scrape or manual entry
- "Powered by PublishNow.io AI Marketing Studio" branding
- Keep the existing "Every Microsite Includes" features section

### 2. Create "My Books" Dashboard Component

**File**: `src/components/dashboard/MyBooks.tsx` (new)

Replaces the current "Book Enricher" section. This component:
- Queries the `books` table for the current author's books (same table PublishNow.io writes to)
- Displays books in a card grid with cover thumbnails, titles, and status badges (draft if `published_at` is null, published otherwise)
- Shows source indicator per book: "Manual", "Amazon Import", or "PublishNow.io" based on the `entry_mode` column
- "Add Book" button opens the existing `DualModeBookForm`
- Per-book actions: view live microsite, edit details
- Empty state with a friendly prompt to add a first book

### 3. Update Dashboard Routing

**File**: `src/pages/AuthorDashboard.tsx`

- Change the `DashboardSection` type: replace `"book-enricher"` with `"my-books"`
- Import and render `MyBooks` instead of `BookEnricher`

### 4. Update Sidebar

**File**: `src/components/dashboard/DashboardSidebar.tsx`

- Change `"book-enricher"` / "Book Enricher" to `"my-books"` / "My Books" with a BookOpen icon (already imported)
- Add a subtle "AI Marketing Studio" label below the logo area

### 5. Update Dashboard Overview

**File**: `src/components/dashboard/DashboardOverview.tsx`

- Change the "Book Listing" step's target from `"book-enricher"` to `"my-books"`
- Add a subtle "Part of PublishNow.io AI Marketing Studio" note in the welcome section

### 6. Add PublishNow.io Tab Placeholder in Book Form

**File**: `src/components/DualModeBookForm.tsx`

- Add a third tab: "Import from PublishNow.io" -- disabled with a "Coming Soon" badge
- Existing Amazon scrape and manual entry tabs remain unchanged

---

## No Database or Edge Function Changes

Since both platforms share the same database:
- No new tables or columns needed
- No sync edge functions needed
- No new secrets needed
- The `entry_mode` column already exists and will naturally hold `"publishnow"` for books created via PublishNow.io

## Summary of Files

| File | Action |
|---|---|
| `src/pages/CreateMicrosite.tsx` | Modify -- marketing landing page with two paths |
| `src/components/dashboard/MyBooks.tsx` | Create -- book management section reading from shared DB |
| `src/pages/AuthorDashboard.tsx` | Modify -- swap BookEnricher for MyBooks |
| `src/components/dashboard/DashboardSidebar.tsx` | Modify -- rename item + add AI Marketing Studio label |
| `src/components/dashboard/DashboardOverview.tsx` | Modify -- update nav target + add branding |
| `src/components/DualModeBookForm.tsx` | Modify -- add disabled PublishNow.io tab |
