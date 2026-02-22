

# Unified Platform Experience: Remove PublishNow Branding and Add Sister Platform Links

## Summary

Remove all user-facing mentions of "PublishNow" so Authors Bureau feels like a standalone platform. Add sidebar links to PublishNow's AI Writing Studio and AI Publishing Studio (similar to the screenshot) as sister platform cross-links. Make Profile an internal dashboard section. Sync happens silently in the background.

## Changes

### 1. Auth Page (`src/pages/Auth.tsx`)
- Line 262: Change "Authors Bureau uses your PublishNow account..." to "Enter your email to get started"
- Lines 269-271: Change button text from "Sign In via PublishNow" to "Sign In" and remove `ExternalLink` icon

### 2. Dashboard Sidebar (`src/components/dashboard/DashboardSidebar.tsx`)
- Change "Profile" from an external link to an internal `DashboardSection` (id: `"profile"`, remove `external: true`)
- Add two new external cross-links at the bottom of the nav (before the collapse toggle), styled subtly:
  - "AI Writing Studio" with a pen/edit icon -- links to PublishNow via SSO (similar to screenshot reference)
  - "AI Publishing Studio" with a file/book icon -- links to PublishNow via SSO
- These use the existing `redirectToPublishNow()` utility behind the scenes but are labeled as sister platform features, not "PublishNow"
- Remove the `ExternalLink` icon tooltip text "Edit on PublishNow.io"

### 3. Author Dashboard (`src/pages/AuthorDashboard.tsx`)
- Add `"profile"` to the `DashboardSection` type union
- Import `ProfileEditor` and render it when `activeSection === "profile"`
- Remove the comment on line 8 ("Profile editing is now handled on PublishNow.io")

### 4. Dashboard Header (`src/components/dashboard/DashboardHeader.tsx`)
- Remove the "Go to PublishNow" button entirely

### 5. Dashboard Overview (`src/components/dashboard/DashboardOverview.tsx`)
- Line 139-141: Remove "Powered by PublishNow.io" badge
- Line 147: Rename "Sync from PublishNow" to "Sync Profile"
- Line 55: Change toast from "Profile synced from PublishNow" to "Profile synced"
- Line 56: Change description from "Your local profile matches PublishNow" to "Your profile is up to date"
- Lines 224-227: Change Step 1's "Click Profile in the left navigation bar" to navigate to the profile section directly (make it clickable like Step 2)

### 6. Navbar (`src/components/Navbar.tsx`)
- Remove the "PublishNow.io" entry from the `navLinks` array
- Remove `handlePublishNowClick` function and related imports

### 7. Footer (`src/components/Footer.tsx`)
- Change "Ecosystem" heading to "Sister Platforms" or "Partner Platforms"
- Remove "Part of the PublishNow ecosystem" tagline, replace with "Authors Bureau and PublishNow.io are sister platforms"
- Keep the links to PublishNow.io services but label them as partner offerings

### 8. SSO Page (`src/pages/SSO.tsx`)
- Line 14: Change "Connecting to PublishNow..." to "Connecting..."
- Lines 28-30: Update error messages to remove PublishNow references (e.g., "go back to PublishNow" becomes "please try again")

## Technical Notes

### Files to modify
- `src/pages/Auth.tsx` -- remove branding copy
- `src/components/dashboard/DashboardSidebar.tsx` -- internal Profile nav + sister platform links
- `src/pages/AuthorDashboard.tsx` -- add "profile" section rendering
- `src/components/dashboard/DashboardHeader.tsx` -- remove Go to PublishNow button
- `src/components/dashboard/DashboardOverview.tsx` -- rebrand sync button and remove badges
- `src/components/Navbar.tsx` -- remove PublishNow.io link
- `src/components/Footer.tsx` -- update ecosystem copy
- `src/pages/SSO.tsx` -- neutral stage labels and error messages

### What stays unchanged
- `src/lib/shared-backend.ts` -- shared backend infrastructure untouched
- `src/lib/publishnow-redirect.ts` -- still used internally for sister platform links (SSO handoff)
- `supabase/functions/sync-author-profile/` -- continues to sync silently on dashboard load
- `src/components/dashboard/ProfileEditor.tsx` -- already writes to shared backend, now rendered directly in dashboard

### No database changes required
All changes are purely UI/copy and navigation restructuring.

