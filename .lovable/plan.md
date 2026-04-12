

## Fix: Lead Magnet Generation 401 — Auth Token Source

### Root Cause
`SharedContentStep.tsx` gets the auth token from the **local Cloud client only** (line 150). The user is authenticated via the **shared backend**, so the local session is empty. The request sends `Bearer undefined` to the `business-consultant` edge function, which returns 401.

This is the exact same auth mismatch pattern that broke theme saving — direct use of the local client instead of `getActiveToken()`.

### Fix

**File: `src/components/dashboard/builders/shared/SharedContentStep.tsx`**

1. Import `getActiveToken` from `@/lib/get-active-token`
2. Replace line 150:
   ```typescript
   // Before
   const token = (await supabase.auth.getSession()).data?.session?.access_token;
   
   // After
   const token = await getActiveToken();
   ```
3. Remove the unused `supabase` import (line 12) if no longer needed elsewhere in the file.

### Scope
- Single file, single line change
- No backend/database changes
- No edge function changes needed (it already has `resolveUser` with dual-auth)

### Why This Will Work
The `business-consultant` edge function already checks the shared backend first in its `resolveUser()`. The only issue is the frontend wasn't sending the correct token. `getActiveToken()` checks Cloud first, then shared backend — matching the pattern already used in `ProfileEditor` and `SiteThemePicker`.
