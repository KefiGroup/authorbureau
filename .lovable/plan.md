

# Build Authors Bureau Admin Panel with Shared Backend

## Overview

Replace the current admin dashboard (which queries local tables directly) with a new admin panel that uses the shared PublishNow backend's `admin-auth` and `admin-stories` edge functions. This gives platform-scoped admin access, meaning only Authors Bureau-specific data, admins, and users are shown.

## Changes

### 1. Create Admin Login Page (`src/pages/AdminAuth.tsx`)

A dedicated admin sign-in page at `/admin-login` that uses the `admin-auth` edge function instead of `user-auth`:

- **Email entry** -- calls `admin-auth` with `{ email, action: 'request_code', source_platform: 'authorsbureau' }`
- **OTP verification** -- calls `admin-auth` with `{ email, action: 'verify', code, source_platform: 'authorsbureau' }`, then uses the returned `token_hash` with `supabase.auth.verifyOtp()`
- **Magic link handling** -- checks URL hash for `auth_token`, calls `admin-auth` with `{ action: 'verify_token', token, source_platform: 'authorsbureau' }`
- **Password login** (optional) -- calls `admin-auth` with `{ email, password, action: 'password_login', source_platform: 'authorsbureau' }`
- On success, redirects to `/admin`
- If the user is not an admin for `authorsbureau`, the backend will reject the request and the page shows an appropriate error

### 2. Rewrite Admin Dashboard (`src/pages/AdminDashboard.tsx`)

Replace the current dashboard that queries local Supabase tables with one that calls the shared `admin-stories` edge function for all data. The dashboard will have tabbed navigation:

- **Overview tab** -- calls `admin-stories` with `{ action: 'stats', source_platform: 'authorsbureau' }` to show platform stats (total users, submissions, books, admins)
- **Submissions tab** -- calls `{ action: 'list', source_platform: 'authorsbureau' }` to list author applications with approve/reject actions (calls `{ action: 'update_status', ... }`)
- **Users tab** -- calls `{ action: 'list_users', source_platform: 'authorsbureau' }` to show registered users
- **Books tab** -- calls `{ action: 'list_books', source_platform: 'authorsbureau' }` to show published books
- **Admins tab** (super admin only) -- calls `{ action: 'list_admins', source_platform: 'authorsbureau' }` to manage admins; promote/demote via `{ action: 'promote_admin' }` and `{ action: 'demote_admin' }`

All API calls include `Authorization: Bearer <session.access_token>` header.

### 3. Create Admin API Helper (`src/lib/admin-api.ts`)

A utility module to centralize all admin API calls:

```text
adminApi.requestCode(email)
adminApi.verify(email, code)
adminApi.verifyToken(token)
adminApi.stats()
adminApi.listSubmissions(page?, status?)
adminApi.updateSubmissionStatus(id, status)
adminApi.listUsers(page?)
adminApi.listBooks(page?)
adminApi.listAdmins()
adminApi.promoteAdmin(email)
adminApi.demoteAdmin(userId)
adminApi.isSuperAdmin()
```

Each function automatically includes `source_platform: 'authorsbureau'` and the current session token.

### 4. Update Auth Hook (`src/hooks/useAuth.tsx`)

- Remove the `LOCAL_ADMIN_EMAILS` hardcoded fallback (admin status will be determined by the shared backend's `admin-auth` verification success)
- Add an `isAdminAuth` flag that gets set when the user successfully authenticates via the `admin-auth` endpoint
- Keep the `has_role` RPC check as a secondary fallback

### 5. Update Routing (`src/App.tsx`)

- Add route: `/admin-login` pointing to `AdminAuth`
- Keep `/admin` pointing to the rewritten `AdminDashboard`
- Update the existing `/auth` page to redirect admins to `/admin` after login (already done)

### 6. Super Admin Detection

Call the shared backend to check if the current user is a super admin for Authors Bureau. This determines whether the "Admins" management tab is visible. Implementation:

- In the admin dashboard, call `admin-stories` with `{ action: 'check_super_admin', source_platform: 'authorsbureau' }` (or call the `is_platform_super_admin` RPC via the shared Supabase client)
- Store result in component state
- Conditionally render the Admins tab

## Technical Details

### File changes summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/admin-api.ts` | Create | Centralized admin API helper |
| `src/pages/AdminAuth.tsx` | Create | Admin-specific login page |
| `src/pages/AdminDashboard.tsx` | Rewrite | Use shared backend instead of local queries |
| `src/hooks/useAuth.tsx` | Modify | Remove hardcoded admin emails, add admin auth flag |
| `src/App.tsx` | Modify | Add `/admin-login` route |

### API endpoints used

All requests go to `https://wuftdpnekscrsghqtssd.supabase.co/functions/v1/`:

- `admin-auth` -- authentication (request_code, verify, verify_token, password_login)
- `admin-stories` -- data operations (stats, list, list_users, list_books, list_admins, update_status, promote_admin, demote_admin)
- `platform-access` -- granting marketing access on approval

### Security considerations

- Admin status is validated server-side by the shared backend (not client-side)
- The `admin-auth` function only allows users whose `admin_platforms` array includes `'authorsbureau'`
- Super admin privileges are checked via server-side function, not client logic
- Session tokens are obtained through `supabase.auth.verifyOtp()` after backend verification

