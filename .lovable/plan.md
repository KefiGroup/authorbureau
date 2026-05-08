## Bug

When clicking a saved cover design to make it active, the toast "Edge Function returned a non-2xx status code" appears. Function logs confirm a `POST 401 /functions/v1/set-active-product-cover`.

## Root cause

`ProductCoverPreview.tsx` calls `supabase.functions.invoke("set-active-product-cover", …)` using the auto-generated client at `src/integrations/supabase/client.ts`. But this project stores the user's auth session in the **shared-backend** client (storage key `authorsbureau-shared-auth`), not in the default supabase client. So `invoke()` sends only the anon key → the edge function's `auth.getUser()` returns no user → 401.

Every other authenticated call in the codebase uses the standard pattern: `getActiveToken()` + `fetchWithTimeout()` against `${VITE_SUPABASE_URL}/functions/v1/<fn>`. This is also documented in the project's "Shared Backend Token Standard" core rule.

## Fix (frontend only, single file)

Edit `src/components/dashboard/builders/shared/ProductCoverPreview.tsx`:

- Replace the `supabase.functions.invoke("set-active-product-cover", { body })` call inside `handlePick` with:
  - `const token = await getActiveToken();`
  - `await fetchWithTimeout(\`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-active-product-cover\`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: \`Bearer ${token}\`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ authorId, nodeId, bookId: bookId ?? null, url }) }, 25_000);`
  - Parse JSON response; on `!res.ok` or `success === false`, revert optimistic state via `loadCover()` and toast the message; on success, toast "Active design updated".
- Add imports: `getActiveToken`, `fetchWithTimeout` from `@/lib/get-active-token`.

No backend changes — `set-active-product-cover` itself is correct (verified by reading its source). No DB migration. No other call sites.

## Verification

1. Reload BP-08 → AI Cover Designs.
2. Click the inactive saved design (left card).
3. Confirm: toast says "Active design updated", gold ring + Active badge moves to clicked card, no 401 in network tab.
4. Refresh page → active design persists.
