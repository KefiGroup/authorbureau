

# SSO Sign-In Process: Critical Analysis and UX Improvements

## Current Flow Assessment

The SSO flow works like this: PublishNow generates a one-time token, redirects the user to `/sso?token=...`, the page validates the token via an edge function, establishes a session, then navigates to `/dashboard`.

### What Works Well
- The race condition fix (waiting for `useAuth` loading) is solid
- Run-once guard with `useRef` prevents double execution
- Network retry logic handles transient failures
- The `cancelled` flag handles unmounting cleanly

### Problems Identified

**1. Loading State is Bare and Uninformative**
The current loading screen is just a spinner and "Signing you in..." -- there is no branding, no context about what is happening, and no progress indication. Users coming from PublishNow see a jarring, empty white page with a tiny spinner. This feels broken, not seamless.

**2. No Timeout Handling**
If the edge function hangs or the network is extremely slow, the user stares at a spinner forever. There is no timeout that eventually shows a helpful message or retry button.

**3. Error State is a Dead End**
The error screen shows a red icon and a single "Sign In Normally" button. Problems:
- The error message is raw (e.g., "SSO validation failed") -- not user-friendly
- No retry button -- the user must start the entire flow over from a different page
- No context about what went wrong or what to do next

**4. No Transition Animation**
The jump from spinner to dashboard (or spinner to error) is abrupt. There is no success state or transition to make the experience feel polished.

**5. Already-Authenticated Users Not Handled**
If a user lands on `/sso?token=...` but is already signed in, the flow still validates the token and calls `setSession` unnecessarily. It should detect the existing session and redirect immediately.

**6. Token Expiry Not Communicated**
SSO tokens are one-time use and expire. If a user bookmarks or refreshes the `/sso` page, they get a generic error. The message should explain that the link has expired.

## Proposed Changes

### File: `src/pages/SSO.tsx` -- Complete rewrite for UX excellence

**A. Multi-stage loading with progress feedback**
Replace the bare spinner with a branded, multi-stage loading experience:
- Stage 1: "Connecting to PublishNow..." (during fetch)
- Stage 2: "Setting up your session..." (during setSession)
- Stage 3: Brief success checkmark before redirect

Each stage updates a progress bar and status message so the user always knows what is happening.

**B. Branded loading screen**
Show the Authors Bureau logo and maintain visual continuity with the rest of the app. Use the app's secondary/accent colors for the spinner and progress bar.

**C. Timeout with manual retry**
After 15 seconds, show a "Taking longer than expected" message with a "Try Again" button that re-attempts the entire flow. This prevents infinite spinner scenarios.

**D. User-friendly error messages**
Map raw error strings to friendly messages:
- "SSO validation failed" or "expired" -> "This sign-in link has expired. Please go back to PublishNow and try again."
- "No SSO token provided" -> "No sign-in link was found. Please sign in from PublishNow or use email sign-in below."
- Network errors -> "We couldn't reach our servers. Please check your connection and try again."

**E. Retry button on error screen**
Add a "Try Again" button that resets `hasRun` and re-triggers the flow, in addition to the existing "Sign In Normally" fallback.

**F. Success animation before redirect**
Show a brief (600ms) checkmark animation with "You're in!" before navigating to the dashboard. This gives the user visual confirmation that the sign-in succeeded.

**G. Skip if already authenticated**
Check `useAuth().user` -- if the user is already signed in, redirect to dashboard immediately without running the SSO validation.

### Technical Implementation

```text
Component State Machine:

  IDLE (loading=true from useAuth)
    |
    v
  [user already exists?] --yes--> REDIRECT to /dashboard
    |no
    |
  [token missing?] --yes--> ERROR ("No sign-in link found")
    |no
    |
  STAGE_CONNECTING ("Connecting to PublishNow...")
    |
  STAGE_SESSION ("Setting up your session...")
    |
  STAGE_SUCCESS (checkmark, "You're in!" for 600ms)
    |
  REDIRECT to /dashboard
    |
  (on error at any stage)
    |
  ERROR (friendly message + Retry + Sign In Normally)
    |
  (on timeout after 15s)
    |
  TIMEOUT ("Taking longer than expected" + Retry)
```

### Specific Code Structure

- Add a `stage` state: `"waiting" | "connecting" | "session" | "success" | "error" | "timeout"`
- Add a `progress` state (0-100) that advances with each stage
- Add a 15-second timeout timer that sets stage to "timeout"
- Add a `friendlyError` function that maps raw errors to readable messages
- Add a `retry` function that resets `hasRun.current = false`, clears error, and re-triggers the effect
- Import the Authors Bureau logo from `src/assets/logo-with-text.png`
- Use framer-motion (already installed) for fade transitions between stages and the success checkmark animation
- Use the existing Progress component from `src/components/ui/progress.tsx` for the progress bar

### UI Layout (all stages)

```text
+------------------------------------------+
|                                          |
|         [Authors Bureau Logo]            |
|                                          |
|     [Spinner or Checkmark Icon]          |
|                                          |
|     "Connecting to PublishNow..."        |
|                                          |
|     [====Progress Bar=======-----]       |
|                                          |
+------------------------------------------+
```

Error state:
```text
+------------------------------------------+
|                                          |
|         [Authors Bureau Logo]            |
|                                          |
|     [Red Alert Icon]                     |
|                                          |
|     "This sign-in link has expired"      |
|     "Please go back to PublishNow        |
|      and try again."                     |
|                                          |
|     [ Try Again ]  [ Sign In Normally ]  |
|                                          |
+------------------------------------------+
```

### No other files need changes
- `useAuth.tsx` -- no changes needed
- Auth page -- no changes needed
- Edge functions -- no changes needed
- PublishNow -- no changes needed

