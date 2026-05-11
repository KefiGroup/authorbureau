## Goal
Make the Facebook/Instagram connect flow land back in the app and immediately show the account as connected instead of bouncing the user back to Connect again.

## What I found
- Your screenshot is on `authorsbureau.com` (the live site), but the last code fix was only applied in the current draft/preview.
- The callback route `/auth/social-callback` is currently wrapped in a protected route, which can interrupt the OAuth handoff before the callback finishes saving the connection.
- The UI only treats `status = 'connected'` as a valid connection, while existing database rows for your account are stored as `active`, so the app can incorrectly look disconnected even when records exist.
- The callback function logs don’t show a successful completion entry yet, so I should add proper instrumentation and validate the end-to-end save path.

## Plan
1. **Ungate the OAuth callback route**
   - Let `/auth/social-callback` load without the protected-route redirect.
   - Keep the callback page responsible for validating the session/token and handling the save safely.

2. **Harden callback session recovery**
   - Use the shared-auth token flow consistently on the callback page.
   - Add a small retry/fallback path so the callback can finish even if auth restoration is still settling after the Facebook redirect.

3. **Normalize connection status handling**
   - Update the UI status checks so legacy `active` rows are recognized, or normalize statuses to a single canonical value.
   - Ensure Connect Settings, banners, and social gates all use the same definition of “connected.”

4. **Add targeted logging and verify the backend save**
   - Add explicit logs in `social-connect-callback` around user resolution, token exchange, page lookup, and connection upsert.
   - Re-test the callback and confirm a new/updated `social_connections` row is written for your user.

5. **Validate on the right environment**
   - Verify both draft preview and the live domain behavior.
   - If the issue is only on live, publish the fix and confirm the live OAuth redirect works on `authorsbureau.com`.

## Files I expect to touch
- `src/App.tsx`
- `src/pages/SocialAuthCallback.tsx`
- `src/pages/ConnectSettings.tsx`
- `src/hooks/useSocialConnectionStatus.ts`
- `supabase/functions/social-connect-callback/index.ts`

## Technical notes
- No new feature scope.
- No auth provider reconfiguration unless testing proves the issue is environment-specific.
- Focus is only on the Facebook/Instagram connect return flow and connected-state detection.