## Goal
Make it obvious when an author has successfully connected a social account, even after the OAuth redirect returns to Connect Settings.

## What I’ll build
1. **Persist a post-connect success signal**
   - Update the social auth callback flow so a successful connect returns to Connect Settings with a small success marker in the URL or navigation state.
   - Include the connected platform and account name so the page can show a precise confirmation.

2. **Show a clear success confirmation on Connect Settings**
   - Add a visible success banner/toast near the top of the page saying the account connected successfully.
   - Make the message specific, e.g. “Facebook Page connected: Pauline Teo Wellness”.
   - Clear the temporary success signal after it has been shown so it does not reappear forever.

3. **Force-refresh social connection data on callback return**
   - When the page detects the post-connect success signal, re-fetch `social_connections` immediately.
   - Keep the existing focus/visibility refresh behavior as a fallback.

4. **Make the connected state more explicit in the social cards**
   - Keep the current connected badge, but ensure the connected account name is the primary status indicator.
   - If available, show “Connected” alongside the page/account name so it reads as an explicit outcome rather than just replacing the button.

## Expected result
After choosing a Facebook Page like Pauline, the author will return to Connect Settings and immediately see:
- a success confirmation at the top of the page, and
- the Facebook row updated to a connected state with the connected page name.

## Technical details
- Files likely to change:
  - `src/pages/SocialAuthCallback.tsx`
  - `src/pages/ConnectSettings.tsx`
- No database migration should be needed.
- I will keep the existing backend callback logic intact unless the frontend flow needs a small redirect payload adjustment only.