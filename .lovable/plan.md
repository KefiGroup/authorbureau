

# Plan: Readers Bureau — Unified Reader Portal with Separate Auth

## Overview

Rename "Reader Portal" to **Readers Bureau**, consolidate it under the `/reading-club` route (now `/readers-bureau`), and give readers their own sign-up/sign-in flow distinct from the author auth.

## What Changes

### 1. Rename routes and branding
- `/reading-club` → `/readers-bureau` (add redirect from old path)
- `/reader-portal` → `/readers-bureau/library` (add redirect from old path)  
- `/reader-portal/:purchaseId` → `/readers-bureau/learn/:purchaseId`
- All "Reader Portal" / "Reading Club" labels → **"Readers Bureau"**
- Update Navbar, Footer, sidebar references

### 2. Create a tabbed Readers Bureau hub page
**New file: `src/pages/ReadersBureau.tsx`**

A tabbed layout (similar to the Author Dashboard pattern) with:
- **Reading Club** tab — the existing 100-day challenge (current `ReadingClub.tsx` content)
- **My Library** tab — purchased courses/content (current `ReaderPortal.tsx` content)
- **My Learning** — links into `/readers-bureau/learn/:purchaseId` for the home study viewer

The hub checks for auth and shows the reader sign-up prompt if not logged in (for protected tabs like Library).

### 3. Separate Reader Auth flow
**New file: `src/pages/ReaderAuth.tsx`**

A dedicated sign-in/sign-up page at `/readers-bureau/auth` that:
- Uses the same `user-auth` edge function on the shared backend (same auth system)
- Brands as "Readers Bureau" instead of "Authors Bureau"
- Sets `redirect` to `/readers-bureau` after login
- Sign-up form includes a "Reader" role indicator (stored via the existing `reader_profiles` table auto-creation)
- Authors can also sign in here — they just use their same credentials, but the redirect goes to Readers Bureau

This is not a separate auth system — it's the same authentication backend, just a different entry point with reader-specific branding and redirect. Authors who sign in here simply land in the reader experience.

### 4. Route updates in App.tsx

```text
/readers-bureau              → ReadersBureau (tabbed hub)
/readers-bureau/auth         → ReaderAuth (reader sign-in/up)
/readers-bureau/learn/:id    → ReaderContentViewer
/reading-club                → Redirect to /readers-bureau
/reader-portal               → Redirect to /readers-bureau/library
/reader-portal/:id           → Redirect to /readers-bureau/learn/:id
```

### 5. Navigation updates
- **Navbar**: "Reading Club" link → "Readers Bureau" pointing to `/readers-bureau`
- **Footer**: Same rename
- **Dashboard sidebar**: "Reading Club" → "Readers Bureau"
- **PurchaseSuccess**: Update link from `/reader-portal` to `/readers-bureau/library`

### 6. Files modified
- `src/App.tsx` — route changes + redirects
- `src/components/Navbar.tsx` — label + path
- `src/components/Footer.tsx` — label + path
- `src/components/dashboard/DashboardSidebar.tsx` — label
- `src/pages/PurchaseSuccess.tsx` — link update
- `src/pages/ReaderContentViewer.tsx` — back link + redirect updates

### 7. New files
- `src/pages/ReadersBureau.tsx` — tabbed hub combining Reading Club + Library
- `src/pages/ReaderAuth.tsx` — reader-branded sign-in/sign-up page

### 8. Existing files repurposed
- `ReadingClub.tsx` content moves into the ReadersBureau hub as a tab component
- `ReaderPortal.tsx` content moves into the ReadersBureau hub as the Library tab

No database changes required — `reader_profiles` table already exists with the right schema.

