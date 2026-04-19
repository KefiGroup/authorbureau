
Goal: fix `author-crm-data` so it accepts the logged-in browser token and returns CRM contacts instead of `401 {"error":"Invalid token"}`.

What I found
- `src/components/dashboard/AuthorCRMPage.tsx` calls `author-crm-data` with `getActiveToken()`, so the browser is already sending the “best available” token.
- The current `supabase/functions/author-crm-data/index.ts` in this repo still has its own auth gate and that is the failing point.
- Working functions like `parse-manuscript` and `list-my-books` use a Cloud-first, shared-backend-fallback resolver. Existing logs also show some functions succeed only after JWT-based fallback, so I should include that as a final safety net.

Implementation
1. Open `supabase/functions/author-crm-data/index.ts`.
2. Replace `getUserIdAndEmail()` with a shared resolver patterned after `parse-manuscript` / `list-my-books`:
   - strip Bearer token
   - try Cloud auth with service-role client
   - if not found, try shared backend auth
   - if shared user resolves, map by email to the Cloud user ID
   - if both fail, add a final JWT-decode fallback to extract `sub` + `email` from the token payload
3. Keep the rest of the CRM query logic unchanged, including the existing author key resolution logic, since the database migration is already complete.
4. Add one clear log line showing which auth path succeeded.

Deploy + verification
1. Deploy `author-crm-data`.
2. Call the deployed function directly using the logged-in browser session token.
3. Confirm the JSON response contains a `contacts` array instead of `{"error":"Invalid token"}`.
4. If needed, inspect function logs to verify whether resolution happened via Cloud, shared backend, or JWT fallback.

Files touched
- `supabase/functions/author-crm-data/index.ts`

Expected result
- `author-crm-data` accepts the current browser session token and My CRM can load the migrated contacts successfully.
