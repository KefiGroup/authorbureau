

# Fix Login Race Condition for Admin Users

## Problem

There is a race condition in `useAuth.tsx` that causes admin users to be briefly redirected to `/dashboard` instead of `/admin`.

**Root cause** in `src/hooks/useAuth.tsx` lines 106-124:

```text
getSession().then(({ data: { session } }) => {
  setUser(session?.user ?? null);

  if (session?.user) {
    supabase.rpc("has_role", { ... }).then(({ data }) => {
      setIsAdmin(...);     // <-- resolves LATER
    });
  }

  setLoading(false);       // <-- runs IMMEDIATELY, before isAdmin is set
});
```

`setLoading(false)` fires before the `has_role` RPC resolves. AdminDashboard then renders with `loading=false` and `isAdmin=false`, triggering `<Navigate to="/dashboard" />`.

## Solution

Two changes to eliminate the race:

### 1. Fix `useAuth.tsx` -- await admin check before clearing loading

In the `getSession` block, only call `setLoading(false)` after the admin check completes:

```text
getSession().then(async ({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);

  if (session?.user) {
    const { data } = await supabase.rpc("has_role", { ... });
    const isAdminSession = sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
    const isAdminEmail = ADMIN_EMAILS.includes(session.user.email ?? "");
    setIsAdmin(!!data || isAdminSession || isAdminEmail);
  }

  setLoading(false);  // now only after admin check completes
});
```

### 2. Add fallback admin check in `AdminDashboard.tsx`

As a safety net, check the user email against `ADMIN_EMAILS` before redirecting non-admins away:

```text
import { ADMIN_EMAILS } from "@/hooks/useAuth";

// Replace line 154:
if (!isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? "")) {
  return <Navigate to="/dashboard" replace />;
}
```

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Convert `getSession().then()` callback to async, await the `has_role` RPC before calling `setLoading(false)` |
| `src/pages/AdminDashboard.tsx` | Import `ADMIN_EMAILS`, add email fallback check before redirecting to `/dashboard` |

