## Problem

Book Hub now shows only the "Analyze with Abby — Free" empty state for Pauline, even though her data is intact (manuscript, consultation, plan, 23/28 nodes built — visible in earlier screenshots).

## Root cause

`src/components/dashboard/book-hub/BookHubOverview.tsx` (line 78-126) hydrates its data inside a `useEffect` that starts with:

```ts
const { data: { session: sharedSession } } = await sharedSupabase.auth.getSession();
const { data: { session: cloudSession } } = await supabase.auth.getSession();
const session = sharedSession || cloudSession;
const token = session?.access_token;
const userId = session?.user?.id;
if (!userId) { setDataReady(true); return; }
```

Both `getSession()` calls go through the gotrue web lock `lock:authorsbureau-shared-auth`. The console logs in the previous turn show this lock is timing out repeatedly (`acquisition timed out after 0ms`/`10000ms`). When the lock is contended, `getSession()` resolves to `null`, `userId` is null, the effect early-returns, and `hasConsultation`/`planSections`/`plan` all stay false — so `isAnalyzed === false` and only State A renders.

This is the same auth-lock contention pattern we already fixed for `getActiveToken()` and `customer-portal`.

## Fix

Apply the same lock-resilient pattern in `BookHubOverview.tsx`:

1. Replace the two `getSession()` calls with `getActiveToken()` (already races a 2s timeout and falls back to localStorage).
2. Decode `userId` from the JWT (`payload.sub`) instead of waiting for a full session object.
3. If still no token after the fallback, do **not** early-return into State A — leave `dataReady` false a bit longer and try one short retry, OR render the existing populated state if `useAbbyPlan(book.id)` already has data (the `plan` from `useAbbyPlan` is independent of session and will hydrate State B by itself).

Concretely:

```ts
const token = await getActiveToken();
let userId: string | null = null;
if (token) {
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      let p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (p.length % 4) p += "=";
      userId = JSON.parse(atob(p))?.sub ?? null;
    }
  } catch { /* ignore */ }
}
if (!token || !userId) { setDataReady(true); return; }
// ... rest unchanged, using `token` for the Authorization header
```

Also remove the now-unused `sharedSupabase` import if nothing else in the file references it.

## File to change

- `src/components/dashboard/book-hub/BookHubOverview.tsx` — swap session lookups for `getActiveToken()` + JWT decode.

## Verification

1. Reload Book Hub for `pl@paulineteo.com`. Hero strip with "23 of 28 products built", Yield Plan banner, Next 3 Steps, and tabs content render again.
2. Auth-lock console warnings remain (separate concern) but no longer break the Book Hub.
