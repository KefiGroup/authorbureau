

## Root Cause

The `save-book` edge function uses `sharedAdmin.auth.admin.listUsers()` (line 61) which returns **only the first page of results** (default 50 users). If the user isn't in that first page, the email lookup fails with "User not found" -- which is exactly what's happening.

This same pagination problem also exists in the JWT auth path (lines ~100-110) where `listUsers()` is used again for dual-ID resolution.

## Fix

Replace the paginated `listUsers()` + client-side `.find()` approach with a **direct GoTrue REST API call** that filters by email server-side. This avoids pagination limits entirely.

The GoTrue admin endpoint supports: `GET /auth/v1/admin/users?filter=<email>` with the service role key as Bearer token.

### Changes

**File: `supabase/functions/save-book/index.ts`**

1. Add a helper function `lookupUserByEmail(sharedUrl, serviceRoleKey, email)` that calls the GoTrue admin REST API with `?filter=` query param, then matches the exact email from the (small) filtered result set.

2. Replace the `listUsers()` call in the **platform_secret path** (lines 57-64) with the new helper.

3. Replace the `listUsers()` call in the **JWT dual-ID resolution path** (~lines 100-110) with the same helper, looking up by `cloudUser.email`.

### Technical Detail

```text
// Before (broken for >50 users):
const { data: userList } = await sharedAdmin.auth.admin.listUsers();
const matched = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

// After (works for any number of users):
const res = await fetch(`${SHARED_BACKEND_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
  headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey }
});
const { users } = await res.json();
const matched = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
```

The `filter` param does a server-side search, returning only matching users. The `.find()` with case-insensitive comparison ensures exact match.

