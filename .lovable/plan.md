

# Fix Three Authentication Issues

## Problems Identified

### 1. SSO "signal is aborted without reason"
**File:** `src/pages/SSO.tsx`

The SSO page's `useEffect` makes a `fetch` call but has no `AbortController`. React's strict mode (or re-renders caused by `searchParams`/`navigate` in the dependency array) unmounts and remounts the component, which aborts the in-flight fetch request. The browser reports this as "signal is aborted without reason".

**Fix:** Add an `AbortController` to the fetch call and pass its signal. On cleanup, abort gracefully. Ignore abort errors so they don't display as failures.

### 2. Admin OTP Verification Failing
**File:** `src/pages/AdminAuth.tsx`

The admin OTP verification calls `supabase.auth.verifyOtp()` which can also be affected by the same race condition -- the `useAuth` hook's `onAuthStateChange` fires and awaits `supabase.rpc("has_role")` directly inside the callback, potentially causing a Supabase client deadlock. The redirect on line 68-69 also has a race: if `isAdmin` hasn't resolved, an admin user with an active session gets redirected to `/dashboard`.

**Fix:** Add `ADMIN_EMAILS` fallback check to the redirect guard (line 68-69) so known admin emails are never bounced to `/dashboard`.

### 3. Session Lost on Refresh (Supabase Client Deadlock)
**File:** `src/hooks/useAuth.tsx`

The `onAuthStateChange` callback (line 84-103) directly `await`s `supabase.rpc("has_role")`. Per Supabase documentation, awaiting Supabase calls inside `onAuthStateChange` causes deadlocks -- the auth state change cannot complete until the RPC resolves, but the RPC may depend on the auth state. This can cause the session to silently fail to restore on page refresh.

**Fix:** Wrap the RPC call inside `onAuthStateChange` in a `setTimeout(() => ..., 0)` so it dispatches asynchronously without blocking the auth state change listener. The `getSession` path (line 106-123) is fine since it's already outside the listener.

## Changes

### File 1: `src/hooks/useAuth.tsx`

In the `onAuthStateChange` callback, avoid awaiting the `has_role` RPC directly. Instead, use `setTimeout` to dispatch it asynchronously:

```text
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);

  if (session?.user) {
    // Immediate fallback for known admins
    const isAdminEmail = ADMIN_EMAILS.includes(session.user.email ?? "");
    const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
    if (isAdminEmail || isAdminSession) setIsAdmin(true);

    // Dispatch RPC outside the listener to avoid deadlock
    setTimeout(async () => {
      const { data } = await supabase.rpc("has_role", { ... });
      setIsAdmin(!!data || isAdminSession || isAdminEmail);
    }, 0);
  } else {
    setIsAdmin(false);
  }
});
```

Remove the `async` keyword from the `onAuthStateChange` callback itself -- it should not be async.

### File 2: `src/pages/SSO.tsx`

Add an `AbortController` to the fetch call and ignore abort errors:

```text
useEffect(() => {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ... },
        body: JSON.stringify({ ... }),
        signal: controller.signal,
      });
      // ... rest of logic
    } catch (err) {
      if (controller.signal.aborted) return; // Ignore abort
      setError(err instanceof Error ? err.message : "SSO authentication failed");
    }
  })();

  return () => controller.abort();
}, [searchParams, navigate]);
```

### File 3: `src/pages/AdminAuth.tsx`

Add `ADMIN_EMAILS` fallback to the redirect guard so admin users are never bounced to `/dashboard` while `isAdmin` is still resolving:

```text
import { useAuth, ADMIN_EMAILS } from "@/hooks/useAuth";

// Replace lines 68-69:
if (user && (isAdmin || ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")))
  return <Navigate to="/admin" replace />;
if (user && !isAdmin && !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? ""))
  return <Navigate to="/dashboard" replace />;
```

## Technical Details

| File | Issue | Fix |
|------|-------|-----|
| `src/hooks/useAuth.tsx` | Deadlock: awaiting RPC inside `onAuthStateChange` | Use `setTimeout` to dispatch RPC outside listener; set immediate admin fallback |
| `src/pages/SSO.tsx` | No AbortController on fetch; re-renders abort the request | Add AbortController with signal; ignore abort errors |
| `src/pages/AdminAuth.tsx` | Redirect guard doesn't check `ADMIN_EMAILS` | Add email fallback to prevent wrong redirects |

