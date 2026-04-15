

# Update GHL Agency Key

## Problem
The stored `GHL_AGENCY_KEY` secret contains the old/expiring token (`pit-7543...6919`), which caused the 401 error. GHL has rotated to a new token (`pit-3512...9475`).

## Fix

### Step 1: Update the secret
Use the `update_secret` tool to replace `GHL_AGENCY_KEY` with the new token value from GHL Settings → Private Integrations.

### Step 2: Redeploy the edge function
Deploy `ghl-sso-link` so it picks up the new key.

### Step 3: Test the SSO flow
Call `ghl-sso-link` with a real author ID to verify 200 response and valid SSO URL.

## Notes
- The old token will expire in ~5 days per the GHL UI, so this is time-sensitive.
- Also worth checking if `GHL_API_KEY` and `GHL_SUBACCOUNT_KEY` need similar updates, though they may serve different purposes.

