

## Analysis: Current Code vs PublishNow's Notes

After reviewing `src/pages/Auth.tsx`, the current implementation **already handles both Path A and Path B correctly** in `handleVerifyOtp` (lines 156-175):

- **Path A** (`data.session_data`): Calls `establishSession()` — correct
- **Path B** (`data.authUrl`): Redirects via `window.location.href` — correct
- **`authFetch`** (line 41): Also checks for `authUrl` in error (non-200) responses — correct

The "No session returned" toast the user saw was from a stale bundle on the custom domain, not a code bug.

### One Small Gap to Fix

PublishNow's notes specify checking `data.success === false` **before** checking `session_data` or `authUrl`. Currently, if the backend returns HTTP 200 with `{ success: false, error: "Invalid code" }`, our code skips the success check and falls through to the generic "no session" error instead of showing the backend's error message.

### Change

**File: `src/pages/Auth.tsx`** — In `handleVerifyOtp`, add a `!data.success` check before the session/redirect branching:

```typescript
const handleVerifyOtp = async () => {
  if (otp.length !== 6) return;
  setSubmitting(true);
  try {
    const data = await authFetch({ action: "verify", email: email.trim(), code: otp });
    console.log("[Auth] verify response:", JSON.stringify(data));

    // Check for explicit failure first
    if (data && data.success === false) {
      throw new Error(data.error || "Verification failed. Please try again.");
    }

    if (data?.session_data?.access_token) {
      await establishSession(data.session_data);
    } else if (data?.authUrl) {
      window.location.href = data.authUrl;
      return;
    } else {
      throw new Error("Sign-in verified but no session was returned. Please try the magic link in your email instead.");
    }
  } catch (err: any) {
    toast({ title: err.message, variant: "destructive" });
  } finally {
    setSubmitting(false);
  }
};
```

Apply the same `success === false` guard to `handlePasswordLogin` and `handleResetPassword` for consistency.

Also tighten the `session_data` check from `data?.session_data` to `data?.session_data?.access_token` (matching PublishNow's recommended pattern) in all three handlers.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add `success === false` early-exit check and tighten `session_data.access_token` check in `handleVerifyOtp`, `handlePasswordLogin`, `handleResetPassword` |

### Summary

The core two-path handling is already implemented and correct. This patch adds the explicit failure check recommended by PublishNow and tightens the session_data validation. No backend changes needed.

