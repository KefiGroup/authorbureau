## Goal
Stop the persistent **“Failed to load books”** error in the Admin Books tab and make the tab reliably load existing book records after refresh or deep-link navigation.

## What I found
- The backend is healthy.
- The `books` table has data.
- The deployed `admin-books` function responds correctly when called directly.
- The failure is isolated to the **client-side Books tab request path**, which still uses a separate fetch flow and can run during a shared-auth/session restoration race.

## Plan
1. **Stabilize the Books tab fetch timing**
   - Update `src/pages/AdminDashboard.tsx` so the Books tab does not call its data loader until shared auth is fully ready.
   - Reuse the project’s existing auth-restoration pattern instead of relying on the request to succeed during token/session recovery.

2. **Harden the admin books request path**
   - Refactor the Books tab fetch to use the shared admin request helper pattern rather than the fragile one-off path.
   - Add one retry path for transient auth-token restoration failures before showing the destructive toast.

3. **Keep UI state consistent during transient failures**
   - Preserve last good Books-tab data when a single request fails.
   - Prevent the empty-state view from implying there are zero books when the real issue is a temporary fetch/auth failure.

4. **Validate the fix**
   - Re-check the request flow against the live backend path.
   - Verify the Books tab can load without the toast on refresh/deep-link scenarios.

## Files likely to change
- `src/pages/AdminDashboard.tsx`
- possibly `src/lib/admin-data-fetch.ts` or a small shared admin fetch helper if needed

## Technical notes
- I will keep this as a frontend-only fix unless the code proves a backend change is necessary.
- I will not change the data model or access rules for this issue.
- The fix will follow the existing `useAuthReady` / shared-session restoration conventions already used elsewhere in the app.