

## Problems Found

### Problem 1: Publish fails — "Failed to save lead magnet data"
The upsert to `author_nodes` is failing. Root cause: the 28 node rows were never seeded because `provision-ghl-subaccount` was never called during onboarding. The upsert itself should still work (it creates a new row), but there may be a TypeScript/Supabase client issue with the column types or the `onConflict` parameter format.

**Fix:** Add error logging to surface the actual Supabase error. Also, make the upsert more robust by ensuring all required NOT NULL columns are included and properly typed. Additionally, add a fallback that seeds the author's nodes if they don't exist yet.

### Problem 2: "Connected Accounts" is invisible from the sidebar
The publish step tells users to "Go to Connected Accounts" but this is buried under the avatar dropdown → Account Settings → third tab. Users on the dashboard sidebar see nothing labeled "Connected Accounts" or "Connect Now". The instructions reference words that don't exist on the visible page.

**Fix:** 
- Add a **"Connect Settings"** item to the sidebar under "REVENUE & TOOLS" section, linking directly to the connections tab
- Rewrite the publish step instructions to match the actual visible label
- Add a direct clickable button in the publish step that navigates to the right place (already exists but the surrounding text is confusing)

---

## Plan

### Step 1: Fix the publish upsert failure
**File:** `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`
- Add `console.error` with the full upsert error details
- Ensure the upsert payload includes all NOT NULL fields with proper defaults: `revenue_to_date: 0`, `current_step: 1`
- Before upserting, call the provisioning function if no `author_nodes` rows exist for this author (lightweight check)

### Step 2: Add "Connect Settings" to the sidebar
**File:** `src/components/dashboard/DashboardSidebar.tsx`
- Add a new nav item under REVENUE & TOOLS: `{ id: "connect-settings", label: "Connect Settings", icon: Settings }`

**File:** `src/components/dashboard/AuthorDashboard.tsx` (or wherever sections are routed)
- Wire `connect-settings` section to navigate to `/account-settings?tab=connections`

### Step 3: Rewrite publish step instructions to match visible UI
**File:** `src/components/dashboard/builders/shared/SharedPublishStep.tsx`
- Replace "Go to Connected Accounts (in Account Settings)" with "Click **Connect Settings** in the left sidebar"
- Replace the pending-GHL instructions similarly
- Keep the direct navigation button but update its label to match

### Technical details
- No database migration needed
- No edge function changes needed
- The `author_nodes` table has `status` defaulting to `'locked'` and `revenue_to_date` defaulting to `0`, but explicit values in the upsert are safer
- The unique constraint on `(author_id, node_id)` supports the `onConflict` upsert correctly

