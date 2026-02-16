

# Add Admin User and Test OTP Sign-In

## Overview

The sign-in system uses the shared PublishNow backend, which automatically creates user accounts on first sign-in. No manual user creation is needed -- `fasahath@gmail.com` simply needs to enter their email at `/auth` and the backend will send an OTP code.

However, there are two issues to address to ensure smooth testing:

## Changes

### 1. Bypass Platform Access Check for Admin Users

Currently, after sign-in, the dashboard requires "marketing" platform access (checked via the shared backend). Admin users like `fasahath@gmail.com` could be blocked by this check. We should ensure admins automatically bypass this gate.

**File: `src/hooks/usePlatformAccess.ts`**
- Accept `isAdmin` as a parameter or import `useAuth` internally
- If the user is an admin, automatically set `hasMarketing: true` without calling the platform-access endpoint

### 2. Ensure Admin Redirect Works

The Auth page (line 91) redirects admins to `/admin` and non-admins to `/dashboard`. Since `fasahath@gmail.com` is in `LOCAL_ADMIN_EMAILS`, they will be redirected to `/admin` after sign-in. We should verify the `/admin` page also handles loading and access gracefully.

### 3. No Database Changes Needed

The shared PublishNow backend's `user-auth` edge function handles user creation automatically when `request_code` is called. A profile will be auto-created in the local database via the existing `handle_new_user` trigger once the session is established.

## Technical Details

- **`src/hooks/usePlatformAccess.ts`**: Add admin bypass logic so admins always have `hasMarketing: true`
- **`src/pages/Auth.tsx`**: No changes needed -- the current flow already supports any email
- **`src/hooks/useAuth.tsx`**: Already has `fasahath@gmail.com` in `LOCAL_ADMIN_EMAILS`

## Testing Steps

1. Navigate to `/auth`
2. Click "Sign In via PublishNow"
3. Enter `fasahath@gmail.com` and click Continue
4. Check email for OTP code
5. Enter the 6-digit code
6. Verify redirect to `/admin` (since user is admin)

