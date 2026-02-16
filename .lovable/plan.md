

# Add Platform Access Tab to Admin Dashboard

## Overview

Add a new "Platforms" tab to the Authors Bureau admin dashboard that mirrors the PublishNow platform access management UI. This tab displays all users with their platform access toggles (Writing, Publishing, Marketing) and allows admins to grant/revoke access. Only admins who are also admins on PublishNow will see this tab.

## Changes

### 1. Add Platform Access API Methods (`src/lib/admin-api.ts`)

Add new methods to the admin API helper:

- **`checkPublishNowAdmin()`** -- calls `admin-stories` with `source_platform: 'publishnow'` and `action: 'check_super_admin'` (or a similar check) to verify the current user is a PublishNow admin. This is a cross-platform admin check.
- **`listPlatformUsers()`** -- calls `platform-access` with `action: 'list'` and `source_platform: 'publishnow'` to fetch all users and their platform access states.
- **`togglePlatformAccess(userId, platform, enabled)`** -- calls `platform-access` with `action: 'grant'` or `action: 'revoke'` to toggle a user's access to a specific platform.

A new helper function `callPlatformAccess(body)` will be added alongside the existing `callAdminAuth` and `callAdminStories` helpers, targeting the `platform-access` edge function.

### 2. Add "Platforms" Tab to Admin Dashboard (`src/pages/AdminDashboard.tsx`)

- Add `"platforms"` to the `Tab` type
- Add a new tab entry with a shield/globe icon, visible only when `isPublishNowAdmin` is true
- On mount, check if the logged-in user is a PublishNow admin (via the new `checkPublishNowAdmin()` API call)
- When the Platforms tab is selected, fetch all users with their platform access data

The new `PlatformAccessTab` component will display:
- A header showing "Platform Access" with a user count badge and a Refresh button
- A search bar to filter users by email
- A table with columns: Email, Writing, Publishing, Marketing (Authors Bureau), Source
- Each platform column shows a toggle (Switch component) that can be flipped to grant/revoke access
- A "Source" badge showing where the user originated from (e.g., "publishnow", "authorsbureau")

### 3. UI Details for PlatformAccessTab

- Uses the existing `Switch` component from `@radix-ui/react-switch` for toggles
- Search filters the displayed list client-side by email
- Toggling a switch immediately calls the API and updates local state optimistically
- On error, the toggle reverts and a toast notification appears
- The table is responsive, scrollable on mobile

## Technical Details

### File changes summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/admin-api.ts` | Modify | Add `callPlatformAccess` helper, `listPlatformUsers`, `togglePlatformAccess`, `checkPublishNowAdmin` methods |
| `src/pages/AdminDashboard.tsx` | Modify | Add `platforms` tab type, `isPublishNowAdmin` state, `PlatformAccessTab` component |

### Access control logic

The "Platforms" tab visibility depends on a separate admin check against the `publishnow` platform:

```text
callAdminStories({
  action: 'check_super_admin',
  source_platform: 'publishnow'   // <-- check against PublishNow, not authorsbureau
})
```

If this returns successfully (user is a PublishNow admin), the tab is shown. If it fails or returns false, the tab is hidden.

### Platform access API calls

```text
// List all users with platform access
callPlatformAccess({ action: 'list', source_platform: 'publishnow' })

// Grant access
callPlatformAccess({ action: 'grant', user_id: '...', platform: 'writing', source_platform: 'publishnow' })

// Revoke access
callPlatformAccess({ action: 'revoke', user_id: '...', platform: 'writing', source_platform: 'publishnow' })
```

