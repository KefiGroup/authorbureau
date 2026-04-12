

## Current State

**GHL API keys exist** — `GHL_AGENCY_KEY`, `GHL_SUBACCOUNT_KEY`, and `GHL_API_KEY` are all configured as platform-level secrets. The `ghl-provision-author` edge function auto-creates GHL sub-accounts using the agency key and stores the `ghl_sub_account_id` on `author_profiles`.

**The deploy flow works** — `deploy-bp02-to-ghl` correctly checks for a sub-account, creates funnels/workflows/tags in GHL, and marks the node as `live`. If no sub-account exists, it falls back to `published_pending_ghl`.

**The gap is purely UI** — there is no "Connected Accounts" tab in Account Settings, so:
- Authors can't see if their GHL sub-account is provisioned
- Authors can't trigger provisioning manually
- The "Go to Settings" button after publish leads to a dead end
- There's no visibility into what's deployed to GHL

## Plan

### 1. Add "Connected Accounts" tab to Account Settings

Add a fourth tab to `AccountSettings.tsx` that shows:

- **GoHighLevel Marketing Hub** card showing:
  - Connection status (reading `ghl_provision_status` and `ghl_sub_account_id` from `author_profiles`)
  - Green "Connected" badge if provisioned, amber "Not Connected" if not
  - "Connect Now" button that calls `ghl-provision-author` edge function if not yet provisioned
  - "Re-provision" button if status is `failed`
  - Explanation text: "This powers your opt-in pages, email automations, and social media distribution"

- **What's Deployed** section showing nodes with status `live` or `published_pending_ghl` from `author_nodes`, so authors can see which products are active in GHL

### 2. Wire the post-publish "Go to Settings" button

Update `SharedPublishStep.tsx` so the "Go to Settings" button navigates to `/account-settings` with a query param like `?tab=connections`, and update `AccountSettings.tsx` to read this param and default to the connections tab.

### 3. Auto-provision on connect

When the author clicks "Connect Now", call `ghl-provision-author` with their `author_id`. On success, re-check any nodes stuck in `published_pending_ghl` and offer to re-deploy them (or auto-deploy).

### Files to change

1. **`src/pages/AccountSettings.tsx`** — Add "Connected Accounts" tab with GHL status, connect button, and deployed nodes list. Read `?tab=` query param to auto-select tab.
2. **`src/components/dashboard/builders/shared/SharedPublishStep.tsx`** — Update "Go to Settings" navigation to point to `/account-settings?tab=connections`.

### Technical details

- Fetch `author_profiles` (ghl_provision_status, ghl_sub_account_id) using the existing Supabase client
- Fetch `author_nodes` where status is `live` or `published_pending_ghl` to show deployment status
- Call `supabase.functions.invoke("ghl-provision-author")` on "Connect Now" click
- No database migration needed — all columns already exist
- No new edge functions needed

