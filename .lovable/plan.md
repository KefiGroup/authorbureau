

## Diagnosis: "No session returned" on OTP Verification

The screenshot shows the OTP flow reaching the verify step successfully (the API call to `user-auth` with `action: "verify"` completes without an HTTP error), but the response body does not contain `session_data`. This triggers the `throw new Error("No session returned.")` at line 156 of `Auth.tsx`.

### Root Cause

The `authFetch` helper only throws if `res.ok` is false (HTTP error). When the API returns `200 OK` but with an unexpected response shape (e.g., `{ success: true, email: "..." }` without `session_data`), the code falls through to the "No session returned" branch.

Possible reasons the backend returns no `session_data`:
1. The user account was just created (first sign-up) and the backend may need an extra step or return a different structure for new users
2. A server-side token exchange failure (the integration notes mention this can happen, returning `{ session_data: null }`)
3. The response includes a field like `authUrl` as a fallback (the magic link handler checks for this, but the OTP handler does not)

### Plan

**File: `src/pages/Auth.tsx`**

1. **Add `authUrl` fallback to the OTP verify handler** (lines 148-162) — mirror the same logic from the magic link handler: if `session_data` is null/missing but `authUrl` exists, redirect the user there

2. **Add diagnostic logging** — temporarily log the full response from `authFetch` in the OTP verify handler so we can see exactly what the backend returns. This will help pinpoint whether it is a missing field or a different response structure

3. **Improve the error message** — instead of the generic "No session returned", show a more helpful message like "Sign-in succeeded but session could not be established. Please try the magic link in your email instead."

### Changes

**`handleVerifyOtp` in `src/pages/Auth.tsx` (lines 148-162):**

```typescript
const handleVerifyOtp = async () => {
  if (otp.length !== 6) return;
  setSubmitting(true);
  try {
    const data = await authFetch({ action: "verify", email: email.trim(), code: otp });
    console.log("[Auth] verify response:", JSON.stringify(data));
    if (data?.session_data) {
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

Apply the same `authUrl` fallback and diagnostic logging to `handlePasswordLogin` and `handleResetPassword` as well.

**Files to modify:**
- `src/pages/Auth.tsx` — add `authUrl` fallback + console logging to all three session-establishing handlers (verify OTP, password login, reset password)

This is a small, targeted fix. After deploying, check the browser console to see the actual response shape from the backend, which will confirm whether it is a backend issue to flag to PublishNow or a client-side parsing issue.

