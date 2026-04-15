

# Fix: BP-04 "Build My Website" Ignoring Existing Live Website

## Problem
When clicking "Author Website & Microsite" from the Book Hub or Brand Products Hub, the user is taken to `/node-builder/BP-04` which shows "Let's build your Author Website" with a "Build My Website" button — even though the website is already live. This happens because `BP04Builder` only checks `author_nodes` for a BP-04 row, but the website was set up through the profile/slug flow, so no BP-04 node exists in the database.

## Root Cause
Two separate systems manage the website:
- `WebsiteBlueprintPage` (sidebar "My Website") — reads from `author_profiles` (slug, directory_status)
- `BP04Builder` — reads from `author_nodes` where `node_id = 'BP-04'`

When the author's website is already live via their profile slug, BP04Builder doesn't know about it.

## Solution

### 1. BP04Builder: Detect existing live website
In the `useEffect` that loads node data (line 48-100), after checking `author_nodes`, also check if the author has a live website via their profile (`author_slug` exists). If yes and no BP-04 node exists, redirect to `/dashboard?section=microsite-manager` instead of showing the introduction step.

### 2. BrandProductsHub: Route BP-04 to microsite-manager when live
In `handleCardClick` (line 160-163), for BP-04 specifically, if the node status is `live` or the author has a slug, navigate to `/dashboard?section=microsite-manager` instead of `/node-builder/BP-04`.

### 3. BookHubOverview: Already correct
The `getStudioPath("website")` already maps to `/dashboard?section=microsite-manager`, so clicks from the Book Hub go to the right place. No change needed here.

## Technical Changes

| File | Change |
|---|---|
| `src/components/dashboard/builders/bp04/BP04Builder.tsx` | Add fallback: if no BP-04 node exists but `author_slug` is set, redirect to `/dashboard?section=microsite-manager` |
| `src/pages/BrandProductsHub.tsx` | In `handleCardClick`, route BP-04 to `microsite-manager` when status is `live` or author has a slug |

