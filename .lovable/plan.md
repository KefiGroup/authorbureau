

## Diagnosis: Admin Dashboard "Failed to load stats"

### Root Cause

There is a **user ID mismatch** between the two authentication backends:

- **Cloud backend** user ID: `5fd84779-8ac5-49f6-9524-0d7f1dcd4f33` (paulinet77@gmail.com) — has `admin` role in `user_roles`
- **Shared backend** user ID: `50a60e39-3090-487e-aea4-75b86a1cf76a` (same email) — no admin role in Cloud's `user_roles`

When the user is logged in via the shared backend, `getActiveToken()` returns the shared session token. The Cloud edge functions (`admin-books`, `admin-data`) receive this token, resolve it to the shared user ID (`50a60e39`), then look up `user_roles` in the Cloud database — where only `5fd84779` has the admin role. Result: **403 "Admin access required"** on every call, causing the "Failed to load stats" toast.

### Fix

**Add the shared backend user ID to Cloud's `user_roles` table** so that both IDs are recognized as admin:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('50a60e39-3090-487e-aea4-75b86a1cf76a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

This is a single database migration — no code changes needed.

### Why This Is the Right Fix

- Both edge functions already have dual-auth resolution (`resolveUserId` tries Cloud first, then shared) — this logic is correct
- The `useAuth` hook and `getActiveToken()` correctly return whichever session is active
- The only gap is the missing role mapping for the shared-backend user ID
- Adding the role row means the admin dashboard works regardless of which backend issued the session

### Files Changed
- **1 database migration** (single INSERT statement)
- No code file changes

