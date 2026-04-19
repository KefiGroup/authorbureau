
## Plan

### What I found
- `author-crm-data` currently returns `{"error":"Invalid token"}` at the auth gate when `getUserIdAndEmail(authHeader)` fails.
- Its resolver uses:
  - shared backend `auth.getUser(token)`
  - then local backend `auth.getUser(token)`
- That is not the most reliable cross-project pattern already used elsewhere in this codebase.
- Working edge functions like `list-my-books`, `parse-manuscript`, and `check-subscription` use a more tolerant token strategy:
  - try local/cloud auth
  - fall back to shared backend auth
  - in some cases fall back to JWT/email extraction

### Root cause
`author-crm-data` is failing before any CRM query runs. This is now an auth-token acceptance issue, not a CRM data issue.

### Implementation
Update `supabase/functions/author-crm-data/index.ts` only:

1. Replace the current `getUserIdAndEmail()` auth gate with the same cross-project token resolution pattern used by the working functions.
2. Prefer the `parse-manuscript` / `list-my-books` style:
   - create a cloud admin client with service role
   - try `cloudAdmin.auth.getUser(token)` first
   - if not found, try shared backend `auth.getUser(token)`
   - if shared user resolves, map to the cloud user by matching email via `cloudAdmin.auth.admin.listUsers()`
   - return `{ userId, userEmail }`
3. Keep the existing CRM query logic after auth succeeds.
4. Keep the existing `authorContactKey` resolution only if still needed for CRM table keys; do not touch unrelated logic.
5. Add one clear log line after auth resolution so production logs show which path succeeded.

### Verification after approval
In default mode I will:
1. Deploy `author-crm-data`
2. Call the deployed function directly with the browser session token
3. Confirm the response contains a contacts payload instead of `{"error":"Invalid token"}`
4. If needed, inspect production logs to confirm whether auth resolved via cloud or shared path

### Files touched
- `supabase/functions/author-crm-data/index.ts`

### Expected outcome
The function will accept the user’s current session token and return CRM data successfully, allowing My CRM to load instead of failing with HTTP 401.
