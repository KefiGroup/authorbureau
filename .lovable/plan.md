## Fix BA-11 publish 401 Unauthorized

Replace the `supabase.functions.invoke('ba11-publish-audiobook', ...)` call in `DistributeAudiobookModal.tsx` with a direct `fetch` using the project's standard shared-backend auth pattern.

### Change

In `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`:

1. Import `getActiveToken` and `fetchWithTimeout` from `@/lib/get-active-token`.
2. Replace the `supabase.functions.invoke(...)` call with:
   - Resolve token via `await getActiveToken()`.
   - On missing token, show a clear "Please sign in again" error.
   - POST to `https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ba11-publish-audiobook` with headers:
     - `Authorization: Bearer <token>`
     - `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`
     - `Content-Type: application/json`
   - Use `fetchWithTimeout` (90s) to avoid premature aborts on ZIP packaging.
   - Parse response; on non-2xx surface `data.error || data.message` to toast.
   - On retryable 401, do one `getActiveToken({ forceRefresh: true })` retry.
3. Keep payload identical (`mode: "publish"`, bookId, chapters, voiceName, etc.).
4. Only call `onDistributed()` after a confirmed 2xx success — preserves the existing fix where Published badge + Library confirmation only appear post-success.

### Why

- Edge function logs show 401 on `ba11-publish-audiobook`.
- This project uses the shared backend; valid JWT lives in localStorage under `authorsbureau-shared-auth`, not the project-local Supabase client session.
- `supabase.functions.invoke` attaches the project-local session/anon key, which the function's resolver rejects.
- `getActiveToken()` + direct fetch is the canonical pattern (per Shared Backend Token Standard memory) used across BA-11 generators and all other working builders.

### Files

- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx` (only file changed)

### Out of scope

- No edge function changes (`ba11-publish-audiobook` already uses canonical `_shared/resolve-user.ts`).
- No DB or schema changes.
- No changes to `AudiobookPublishStep.tsx` — already correct after prior fix.

### Expected result

- "Send to PublishNow" returns 200, ZIP + ACX guide save to Library, Published badge + green Library link render only after success.
