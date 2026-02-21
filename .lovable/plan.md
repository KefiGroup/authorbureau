

## Fix: "Invalid or expired verification code" on Login

### Problem
The shared backend rejects the OTP code even though it was just received. This is likely caused by stale session tokens persisted in localStorage from a previous login. The shared Supabase client (`@/lib/shared-backend`) has `persistSession: true`, so old tokens may conflict with the OTP verification flow.

### Solution
Two changes to `src/pages/Auth.tsx`:

1. **Clear the shared backend session before requesting a new code** — Call `supabase.auth.signOut()` at the start of `handleContinue` (the email submit handler) to ensure no stale session interferes with the OTP flow.

2. **Add detailed error logging** — Log the full response from the shared backend's verify endpoint so we can diagnose any future issues more easily.

### Technical Details

**File: `src/pages/Auth.tsx`**

- In `handleContinue`, add `await supabase.auth.signOut()` before calling `request_code` to clear any stale session on the shared backend.
- In `handleVerifyOtp`, log the full error response body for better debugging.

This ensures a clean authentication state each time the user attempts to sign in, preventing stale tokens from interfering with the OTP process.

