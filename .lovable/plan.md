

## Fix BP-03 Social Media "Unauthorized" on second book

### Root cause

`ContentGenerationStep.tsx` calls `business-consultant` with this line:

```ts
const { data: session } = await supabase.auth.getSession();
const token = session?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

The imported `supabase` client points at the **Cloud** project, but real user sessions live on the **shared backend** (`wuftdpnekscrsghqtssd.supabase.co`). When the Cloud session is missing or expired, the code falls back to the public anon key, which is not a user token. The `business-consultant` edge function calls `resolveUser(req)` — that succeeds against the shared backend with a real JWT, but cannot resolve the anon key → returns `Unauthorized`.

This isn't book-specific. The first book happened to work because a Cloud session was still cached. By the time the user opened the second book that cache had expired (or never existed in this browser), so the call falls through to the anon key and 401s every time. The platform memory explicitly says: **always use `getActiveToken()`, not `supabase.auth.getSession()`**.

### Fix

**`src/components/dashboard/builders/social-media/ContentGenerationStep.tsx`**

1. Add import:
   ```ts
   import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
   ```
2. Replace the token block in `generatePosts()`:
   ```ts
   const token = await getActiveToken();
   if (!token) {
     setGenerationState("error");
     toast({ title: "Session expired", description: "Please sign out and back in.", variant: "destructive" });
     return;
   }
   ```
3. Swap the `fetch(...)` call for `fetchWithTimeout(url, { method, headers, body }, 120000)` so the streaming request gets a sensible timeout (BP-03 generation runs ~30–90s).
4. Surface the real error instead of the generic "Generation failed". Read `await resp.text()` on `!resp.ok` and show the server message in the toast (`"Unauthorized"`, `"Rate limited"`, etc.) so future failures are diagnosable.

### Audit pass (same file family)

Search the BP-03 builder folder for any other `supabase.auth.getSession()` or hard-coded anon-key fallbacks; if the same pattern exists in `SetupStep.tsx`, `BulkEditStep.tsx`, `ExportPublishStep.tsx`, or `OptimizeProfilesStep.tsx` for AI-backed calls, apply the same `getActiveToken()` swap. (Initial search only flagged `ContentGenerationStep.tsx`, but I'll verify the sibling steps once during the fix.)

### Validation

1. Sign in fresh, open Invest Like Buffett for Parents → BP-03 → Step 3 → Generate Content. Posts generate successfully.
2. Open Be SUCKcessful → BP-03 → regenerate. Still works.
3. Manually clear Cloud session in localStorage, retry generation. Either it succeeds via the shared session OR shows a clear "Session expired — sign in again" toast (no silent 401).
4. Trigger a 429 from the gateway → toast shows the real "Rate limited" message instead of generic "Generation failed".

### Out of scope

- Edge function changes (`business-consultant` already handles dual-backend tokens correctly).
- Other builders' generation flows — they already use the standard token pattern per recent audits.

