

# Fix: Make Lead Capture Actually Work End-to-End

## Root Cause

The code is correctly wired: quiz gate → `handleGateSubmit` → `supabase.functions.invoke("microsite-action")` → 2-level CRM + email. However, the `microsite-action` edge function logs show **zero invocations** (only boot logs). This means either:

1. The quiz page wasn't loading when you tested (the "portal not loading" issue from earlier)
2. The function wasn't deployed at the time of your test

## What Needs to Happen

### 1. Redeploy `microsite-action` to ensure latest code is live
The function code has the 2-level CRM logic but may not have been successfully deployed with the latest version.

### 2. Add comprehensive logging to `microsite-action`
Add `console.log` at entry point and at each CRM write so we can trace exactly what happens (or doesn't) when a lead submits.

### 3. Test end-to-end with curl
After deployment, invoke the function directly via curl with test data to confirm:
- Author-level CRM contact created
- Platform-level CRM contact created  
- Resend email sent
- In-app notification created

### 4. Verify the quiz page loads on published URL
Navigate to the published microsite URL and complete the full quiz flow to confirm the gate form triggers `microsite-action`.

### Files Changed
- `supabase/functions/microsite-action/index.ts` — add entry logging

### No file changes needed for the client
The client-side code in `MicrositePage.tsx` is correctly calling the function. The issue is deployment/invocation, not code.

