

## Issues Found

### 1. Ghost "AI Toolkit" card on Dashboard Overview
The `monetisationSteps` array in `DashboardOverview.tsx` (line 277) still contains an "AI Toolkit" card that navigates to `ai-toolkit` section. This section was removed from the sidebar and the router — clicking it navigates to a non-existent section, which falls through to the default case and just re-renders the Overview (confusing UX).

**Fix:** Remove the "AI Toolkit" item from the `monetisationSteps[0].items` array so only "Build My Business" remains under the "AI Engine" group.

### 2. "Failed to fetch" on Sister Platform Links (SSO Handoff)
The sidebar's "AI Writing Studio" and "AI Publishing Studio" buttons call `redirectToPublishNow()` which hits the shared backend's `sso-handoff` edge function. The "Failed to fetch" error means the network request itself is failing — most likely because the shared backend at `wuftdpnekscrsghqtssd.supabase.co` is unreachable or returning a network error.

The current error handling in `redirectToPublishNow` catches the error but surfaces a generic `err.message` ("Failed to fetch") which is unhelpful. The sidebar handler then shows it in a destructive toast with title "Could not open".

**Fix (resilient, not band-aid):**
- Add retry logic (1 retry after 2s delay) to `redirectToPublishNow` before giving up
- Improve the error message to distinguish between "not authenticated", "network error" (shared backend unreachable), and "SSO token generation failed" (backend returned an error)
- Add a fallback: if SSO handoff fails after retry, offer a direct link to PublishNow (without SSO) so the user isn't completely blocked

### 3. Overview card click for "AI Toolkit" navigates to nothing
When clicking the "AI Toolkit" card on the overview, `onNavigate?.("ai-toolkit")` is called but `AuthorDashboard.tsx`'s `renderSection()` switch has no case for `ai-toolkit` — it falls through to the default which renders `DashboardOverview` again, creating a confusing no-op.

**Fix:** Already covered by removing the card in issue #1.

## Changes

### File 1: `src/components/dashboard/DashboardOverview.tsx`
- Remove the "AI Toolkit" item from `monetisationSteps[0].items` (line 277), keeping only "Build My Business"

### File 2: `src/lib/publishnow-redirect.ts`
- Add a single retry with 2s delay on network failure (`TypeError` / "Failed to fetch")
- After retry fails, return a more descriptive error message and include a `fallbackUrl` property pointing to `https://publishnow.io` so callers can offer a direct link
- Distinguish error types: auth error vs network error vs SSO error

### File 3: `src/components/dashboard/DashboardSidebar.tsx`
- Update the sister link click handler to use the `fallbackUrl` from `redirectToPublishNow` — if SSO fails, show a toast with a "Open directly" action that opens `publishnow.io` without SSO, so the user is never completely blocked

