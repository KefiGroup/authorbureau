

## No code change — diagnosis is inverted

### What the user reported
> "Live bundle calls `wuftdpnekscrsghqtssd.supabase.co/functions/v1/get-author-book`. Change the URL to `tubpbslfrxyfhldkcyyq.supabase.co`."

### What the source actually shows
- `src/hooks/useBookContext.ts` line 6 + 53:
  ```ts
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  ...
  fetchWithTimeout(`${SUPABASE_URL}/functions/v1/get-author-book`, ...)
  ```
- `.env`:
  ```
  VITE_SUPABASE_URL="https://tubpbslfrxyfhldkcyyq.supabase.co"
  ```
- The edge function `supabase/functions/get-author-book/index.ts` is deployed to **this** project (`tubpbslfrxyfhldkcyyq`), not the shared backend.
- Grep confirms only `src/lib/shared-backend.ts` references `wuftdpnekscrsghqtssd`, and `useBookContext` does **not** import from it.

The two project URLs in the user's message are reversed:
- `tubpbslfrxyfhldkcyyq` = project-local (this Lovable project, where `get-author-book` is deployed — already what the code calls)
- `wuftdpnekscrsghqtssd` = shared backend (auth only, no `get-author-book` there)

So the source is already correct. Making the requested "fix" would actually break the call by pointing it at a project where the function does not exist.

### Why the live bundle still calls the wrong host
This is the same root cause as the previous turn: **the published bundle is pinned to `index-CI1iIzPP.js`** and the new `useBookContext` code never reached the browser. The live JS calling `wuftdpnekscrsghqtssd` is the symptom of stale bundle, not a wrong constant in source.

### Plan
1. **Do not edit `useBookContext.ts`.** Source is correct; flipping the URL would break the call.
2. **Resolve the deploy/cache block first** (per the previously approved plan):
   - Click **Publish → Update** again.
   - If the bundle hash stays `index-CI1iIzPP.js`, escalate to Lovable support with the project ID and the stuck hash to force-clear the build cache.
3. **After bundle hash advances**, hard-refresh and verify in DevTools Network:
   - Request goes to `https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/get-author-book`
   - Response contains `bookTitle: "Be SUCKcessful"`
   - Console shows `Build: 2026-04-20T10:18:00Z` and `[useBookContext] render` with `shouldGate: false`
4. **If after a confirmed fresh bundle the call still goes to `wuftdpnekscrsghqtssd`**, then (and only then) re-investigate — but that scenario is not possible given the current source.

### Out of scope
- Any URL change in `useBookContext.ts` or `get-active-token.ts`.
- Any change to `shared-backend.ts` (it is correctly pointed at the shared auth backend and is unrelated to this edge function call).

