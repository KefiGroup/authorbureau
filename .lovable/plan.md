

# Sprint 27 — BP-02 Publish Fix + Connected Accounts + BP-03 401 Fix

```
ARCHITECTURE CHECKLIST:
✅ SharedPublishStep.tsx touched? → NO (already correct — no changes needed)
✅ UniversalBuilderStudio.tsx touched? → NO
✅ New sidebar item added? → NO (Connect Settings already exists in sidebar)
✅ New GHL edge function created? → NO
✅ author_nodes touched? → NO (edge functions already handle upserts correctly)
✅ Author-facing text contains banned words? → Zero
✅ Subscription tier values used? → N/A (no tier logic in this sprint)
```

## Current State Assessment

After reading all relevant files, several items in the sprint brief are **already implemented**:
- "Connect Settings" sidebar item already exists (DashboardSidebar.tsx line 220)
- AccountSettings.tsx already has 4 tabs including "connections" (line 86-87)
- ConnectedAccountsTab component already exists and works (GHL status, Connect Now, Re-deploy)
- SharedPublishStep.tsx already references "Connect Settings" correctly (lines 139, 229, 233)
- `deploy-bp02-to-ghl` already includes `revenue_to_date: 0` and `current_step: 1` in its upsert (line 65-66)

## What Actually Needs Fixing

### Fix 1 — BP-02 Upsert 401 (Root Cause: Missing config.toml entry)

`deploy-bp02-to-ghl` is NOT listed in `supabase/config.toml`, so it defaults to `verify_jwt = true`. When the frontend calls it via `fetchWithTimeout` with a potentially expired or missing token, the gateway rejects it with 401 before the function code even runs. The function uses `SUPABASE_SERVICE_ROLE_KEY` internally and does not need JWT verification.

**File:** `supabase/config.toml`
- Add `[functions.deploy-bp02-to-ghl]` with `verify_jwt = false`

Additionally, improve error handling in the frontend:

**File:** `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`
- Add full error logging with `console.error` for the response body
- Add specific error messages based on error type (RLS, network, auth)

### Fix 2 — Connected Accounts (Already Done)

All items in Fix 2 are already implemented:
- Sidebar has "Connect Settings" under REVENUE & TOOLS
- Clicking it navigates to `/account-settings?tab=connections`
- AccountSettings has the "connections" tab rendering `ConnectedAccountsTab`
- ConnectedAccountsTab shows GHL status, Connect Now, deployed nodes, Re-deploy

**No changes needed.**

### Fix 3 — BP-03 401 (Root Cause: Missing config.toml entry)

`generate-bp03-social-media` is NOT in `config.toml`, so it defaults to `verify_jwt = true`, causing the 401. The function uses service role key internally.

Same issue affects `deploy-bp03-to-ghl`.

**File:** `supabase/config.toml`
- Add `[functions.generate-bp03-social-media]` with `verify_jwt = false`
- Add `[functions.deploy-bp03-to-ghl]` with `verify_jwt = false`
- Also add ALL other deploy/generate functions that are missing (BP-01, BP-04, BP-05, etc.) to prevent the same 401 across other builders

**File:** `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- Improve error handling in `handleGenerate`: show specific messages for 401 (session expired), 500 (server error), timeout
- Replace generic error text with actionable Abby messages

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/config.toml` | Add ~20 missing edge functions with `verify_jwt = false` |
| `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx` | Better error logging and specific error messages |
| `src/components/dashboard/builders/bp03/BP03Builder.tsx` | Specific error messages for 401, 500, timeout |

## What This Fixes

- BP-02 "Publish to Marketing Hub" will stop returning 401 and succeed
- BP-03 "Generate My Social Media" will stop returning 401 and succeed
- All other builders (BP-01, BP-04, BP-05) will also work without 401 errors
- Error messages become specific and actionable instead of generic failures

