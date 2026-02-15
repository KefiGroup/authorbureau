

# Shared Backend Integration + SSO + Platform Access

## Overview

This plan connects Authors Bureau to the shared PublishNow.io backend and implements cross-platform SSO, platform access gating, and usage tracking.

---

## Important Note: Environment Variables

The `.env` file and `src/integrations/supabase/client.ts` are auto-managed by Lovable Cloud and cannot be edited directly. To point Authors Bureau at the shared PublishNow.io backend, the environment variables need to be updated through the Lovable Cloud settings. I will note this as a manual step for you to complete.

---

## Changes

### 1. Create `/sso` Route Page

**New file**: `src/pages/SSO.tsx`

- Reads `token` and `from` query params from the URL
- Shows a loading spinner while validating
- POSTs to the shared backend's `sso-handoff` function with `{ action: "validate", token }`
- On success, calls `supabase.auth.setSession()` with the returned tokens
- Redirects to `/dashboard`
- On failure, shows an error message with a "Sign In Normally" fallback button linking to `/auth`

**Modified file**: `src/App.tsx`

- Add `<Route path="/sso" element={<SSO />} />` (public route, no ProtectedRoute wrapper)

### 2. Add "Go to PublishNow" Button

**Modified file**: `src/components/dashboard/DashboardHeader.tsx`

- Add a "Go to PublishNow" button next to the existing buttons
- On click: gets the current session, calls the `sso-handoff` function with `{ action: "generate", session_data: { access_token, refresh_token } }`, then redirects to `https://publishnowinterface.lovable.app/#/sso?token=...&from=authorsbureau`

### 3. Pass `source_platform` in Edge Function Calls

**Modified files** (all files that call `supabase.functions.invoke`):

- `src/hooks/useAuth.tsx` -- `check-subscription` call
- `src/components/DualModeBookForm.tsx` -- `scrape-amazon-book` call
- `src/components/dashboard/DashboardOverview.tsx` -- `create-checkout` and `customer-portal` calls
- `src/components/dashboard/BookEnricher.tsx` -- `enrich-book-data` call
- `src/components/ServiceInquiryForm.tsx` -- `send-service-inquiry-email` call
- `src/components/dashboard/AIToolkit.tsx` -- `ai-author-tools` call

Each will include `source_platform: 'authorsbureau'` in the request body.

### 4. Platform Access Check + Gating

**New file**: `src/hooks/usePlatformAccess.ts`

A custom hook that:
- Calls the `platform-access` function with `{ action: "check" }` on mount
- Returns `{ platforms, loading, hasMarketing, requestAccess }`
- `requestAccess()` calls `{ action: "request", platform: "marketing" }`

**Modified file**: `src/pages/AuthorDashboard.tsx`

- After auth check, call `usePlatformAccess()`
- If `loading`, show spinner
- If `!hasMarketing`, show a "Request Access" screen instead of the dashboard content, with a button that calls `requestAccess()`
- If `hasMarketing`, show the normal dashboard

### 5. Admin User Approval -- Grant `marketing` Access

This applies to admin workflows. When approving authors:

**Modified file**: `src/pages/AdminDashboard.tsx`

- When approving a user, also call the `platform-access` function with `{ action: "grant", user_email: "...", platform: "marketing" }` to auto-grant marketing platform access

---

## Manual Step Required

You will need to update the backend environment variables through Lovable Cloud settings to point at the shared PublishNow.io backend:
- `VITE_SUPABASE_URL` to `https://wuftdpnekscrsghqtssd.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` to the PublishNow anon key you provided

This cannot be done through code changes -- it needs to be configured in the project settings.

---

## Summary of Files

| File | Action | Purpose |
|---|---|---|
| `src/pages/SSO.tsx` | Create | SSO handoff page for cross-platform login |
| `src/hooks/usePlatformAccess.ts` | Create | Hook for platform access checking and requesting |
| `src/App.tsx` | Modify | Add `/sso` route |
| `src/components/dashboard/DashboardHeader.tsx` | Modify | Add "Go to PublishNow" button |
| `src/hooks/useAuth.tsx` | Modify | Add `source_platform` to check-subscription |
| `src/components/DualModeBookForm.tsx` | Modify | Add `source_platform` to scrape call |
| `src/components/dashboard/DashboardOverview.tsx` | Modify | Add `source_platform` to checkout/portal calls |
| `src/components/dashboard/BookEnricher.tsx` | Modify | Add `source_platform` to enrich call |
| `src/components/ServiceInquiryForm.tsx` | Modify | Add `source_platform` to email call |
| `src/components/dashboard/AIToolkit.tsx` | Modify | Add `source_platform` to AI tools call |
| `src/pages/AuthorDashboard.tsx` | Modify | Add platform access gating |
| `src/pages/AdminDashboard.tsx` | Modify | Auto-grant marketing access on approval |

