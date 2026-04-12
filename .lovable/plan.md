

## Fix: Independent Scrolling for Sidebar and Content Panel

### Problem
The dashboard root container uses `min-h-screen`, which allows the entire page to scroll as one unit. When you scroll the right content panel, the left sidebar moves with it.

### Fix

**File: `src/pages/AuthorDashboard.tsx`**

1. Change the root `<div>` class from `flex min-h-screen` to `flex h-screen overflow-hidden` — this locks the viewport and prevents the whole-page scroll.

2. Change the sidebar wrapper `<div>` to include `h-screen overflow-hidden` (on desktop) so the sidebar stays fixed in place while its inner `<nav>` (which already has `overflow-y-auto`) handles its own scrolling.

3. Change the main content column from `flex flex-1 flex-col min-w-0 min-h-0` to `flex flex-1 flex-col min-w-0 h-screen overflow-hidden` so the `<main>` inside it becomes the scroll container.

This is a CSS-only change — three class tweaks in the same JSX return block. No logic, routing, or backend changes.

