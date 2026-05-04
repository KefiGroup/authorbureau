## Problem

When you refresh `/node-builder/BP-02?bookId=...` (or any protected deep link) on Safari, you land on `/dashboard` instead of the page you were on.

## Root cause

Two bugs combine on refresh:

1. **`ProtectedRoute` in `src/App.tsx` (line 103)** redirects unauthenticated users to `/auth` **without preserving the URL**:
   ```tsx
   if (!user) return <Navigate to="/auth" replace />;
   ```
   It should pass `?redirect=<original path+search>` so login returns the user to the same builder page.

2. **`useAuth` safety timeout (line 281)** force-resolves `authLoading` after only **3 seconds**. On Safari, the shared-backend session restore (`getSharedSession()`) can take longer than 3s due to cross-domain cookie/localStorage handling. When the timeout fires while `user` is still `null`, `ProtectedRoute` sees "not loading + no user" and bounces to `/auth`. By the time login completes, the original URL is gone and Auth.tsx sends them to its default `/dashboard`.

## Fix

**File 1: `src/App.tsx` — preserve return URL in `ProtectedRoute`**

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) { /* existing skeleton */ }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}
```

`Auth.tsx` already reads `?redirect=` (line 49) and navigates there after sign-in, so this single change carries the full path through the round-trip.

**File 2: `src/hooks/useAuth.tsx` — extend the safety timeout and gate the bail-out on actual completion**

- Bump the `setAuthLoading(false)` safety timeout from **3000 ms to 8000 ms** so Safari's session restore has time to complete.
- Have it only fire if `getSharedSession()` hasn't already resolved (track via a ref / `Promise.race`-style guard). This eliminates the "loading flips false while user is still null" race that triggers the false redirect.

**File 3 (defensive): `src/pages/Auth.tsx`** — no change required; it already honours the `redirect` param.

## Why this fixes the symptoms you saw

- The Social Media draft is now correctly persisted (last sprint), so the data is fine.
- After this fix, refreshing on `/node-builder/BP-02?bookId=...` will:
  1. Show the auth skeleton until the Safari session truly restores (up to 8s).
  2. If the session restores → render NodeBuilder at the same URL (no bounce).
  3. If the session is genuinely gone → land on `/auth?redirect=/node-builder/BP-02?bookId=...` and after login return to that exact URL.

## Files touched

- `src/App.tsx` (ProtectedRoute)
- `src/hooks/useAuth.tsx` (safety timeout)

No DB or edge-function changes required.
