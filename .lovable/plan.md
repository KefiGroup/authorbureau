

# Fix: Replace SSO Iframe with Direct GHL Link

## Problem
The Marketing Studio's SSO iframe approach uses `POST /oauth/locationToken`, which **only accepts OAuth 2.0 Agency Access Tokens** (JWT format), not Private Integration Tokens (`pit-...`). This is a GHL API limitation — all your scopes are correctly enabled but the endpoint itself rejects PITs by design.

## What Already Works
Your deploy functions (`deploy-bp01-to-ghl`, etc.) use the PIT for regular API calls (creating contacts, workflows, emails) and these work correctly. The Marketing Hub activation flow is unaffected.

## Solution: Replace SSO iframe with a direct GHL dashboard link

Since SSO token generation requires a full OAuth 2.0 app registration (marketplace app with client_id/client_secret and redirect flow), which is significantly more complex, the practical fix is:

### Step 1: Update MarketingStudio component
Replace the iframe-based SSO approach with a simple "Open in Marketing Dashboard" button that links directly to the GHL sub-account dashboard URL. The user would log in to GHL separately (one-time) and then access their location directly.

The URL format: `https://app.leadconnectorhq.com/v2/location/{locationId}/dashboard`

### Step 2: Add section deep-links
Map each tab (Contacts, Automations, Funnels, Email, Calendar) to direct GHL dashboard URLs that open in a new tab, preserving the current tab navigation UX.

### Step 3: Remove the ghl-sso-link edge function
No longer needed since we are linking directly instead of generating SSO tokens.

## Technical Details
- Modify `src/components/dashboard/MarketingStudio.tsx` to open GHL links in new tabs instead of iframes
- Remove or deprecate `supabase/functions/ghl-sso-link/index.ts`
- The PIT continues to be used by all deploy functions for API operations (unchanged)

## Alternative (Future)
If you later register a GHL Marketplace App with OAuth 2.0, we can revisit the SSO iframe approach using proper OAuth tokens with refresh rotation.

