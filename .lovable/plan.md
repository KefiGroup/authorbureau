

# Fix Login Issue for fasahath@gmail.com

## Problem

There is a race condition in the login flow. When fasahath@gmail.com signs in via the Auth page:

1. OTP verification succeeds and sets the session
2. `onAuthStateChange` fires in `useAuth`, setting `user` immediately
3. The Auth page sees `user` is set, checks `isAdmin` -- but it is still `false` because the async `has_role` RPC call hasn't resolved yet
4. Auth page redirects to `/dashboard` (non-admin path)
5. The AuthorDashboard checks `hasMarketing` via `usePlatformAccess`, which depends on `isAdmin`
6. `isAdmin` is still `false` at this point, so the admin bypass doesn't kick in
7. The platform-access API returns no "marketing" platform for this user
8. Result: "Marketing Studio Access Required" screen

## Changes

### 1. Fix race condition in Auth page redirect (`src/pages/Auth.tsx`)

After successful OTP verification, check the email against the known admin list *before* navigating, instead of relying on the async `isAdmin` state:

- After `verifyOtp` succeeds, check if the email matches an admin email
- If yes, navigate to `/admin` directly
- If no, navigate to `/dashboard`
- This avoids depending on the async `isAdmin` computation from `useAuth`

Also apply the same fix to the magic link flow (lines 62-70).

### 2. Fix initial redirect check in Auth page (`src/pages/Auth.tsx`)

The existing redirect on line 91 (`if (user) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} />`) also has a race condition. When `loading` becomes `false`, `isAdmin` may not have resolved yet.

- Add a brief delay or ensure `loading` stays `true` until `isAdmin` has been determined
- Alternatively, check the user email directly against `ADMIN_EMAILS` as an immediate fallback in the redirect logic

### 3. Export ADMIN_EMAILS from useAuth (`src/hooks/useAuth.tsx`)

Export the `ADMIN_EMAILS` array so it can be imported in the Auth page for the immediate email check during redirect.

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Export `ADMIN_EMAILS` constant |
| `src/pages/Auth.tsx` | Import `ADMIN_EMAILS`, use email check for immediate redirect after OTP/magic link verification |

The core fix is adding this logic in the Auth page's verify handlers:

```text
const targetRoute = ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? "/admin" : "/dashboard";
navigate(targetRoute, { replace: true });
```

And updating the existing redirect:

```text
if (user) {
  const isKnownAdmin = isAdmin || ADMIN_EMAILS.includes(user.email ?? "");
  return <Navigate to={isKnownAdmin ? "/admin" : "/dashboard"} replace />;
}
```

