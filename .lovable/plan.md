

# Complete Auth Overhaul — Password Login, Forgot Password, Session Fixes

## Summary

Rebuild the Auth page to support all sign-in methods from the PublishNow integration notes, simplify session establishment using the confirmed `session_data` format, fix the SSO `signOut()` gap, and add a Set Password section to the dashboard.

---

## Nothing to flag back to PublishNow

Their confirmation resolves all open questions. `verify_token` returns `session_data`, `verify` (OTP) returns `session_data`, and `password_login` returns `session_data`. We can use one unified session handler for all flows.

---

## Phase 1: Rebuild `src/pages/Auth.tsx`

### Remove the modal pattern
Replace the current "Sign In" button → modal flow with an **inline card** directly on the page. No extra click needed.

### Add sign-in mode toggle
Two tabs/modes at the top of the card: **"Email Code"** and **"Password"**. Default to Email Code.

### Email Code mode (streamlined)
- Keep email input → request OTP → enter 6-digit code flow
- **Add "Resend Code" button** with 60-second countdown timer (`useState` + `setInterval`)
- Keep "Or click the magic link in your email" hint

### Password mode (new)
- Email + password fields
- Call `action: "password_login"` on submit
- **"Forgot password?" link** below the password field — switches to forgot-password sub-flow

### Forgot password sub-flow (new, inline states)
1. **Email screen**: enter email → call `action: "forgot_password"` → show generic success message
2. **Reset screen**: 6-digit code + new password + confirm password → call `action: "reset_password"`
3. On success, establish session from returned `session_data`

### Unified session establishment
Replace all the deep-search `token_hash` / nested access logic with one simple function:

```typescript
async function establishSession(sessionData) {
  await supabase.auth.signOut({ scope: 'local' });
  await supabase.auth.setSession({
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token,
  });
}
```

Used by: OTP verify, magic link verify_token, password login, reset password, and the `authUrl` fallback (if `session_data` is null, redirect to `authUrl`).

### Error handling
Map specific status codes to user-friendly messages:
- 401 → "Invalid credentials" / "Invalid or expired code"
- 429 → "Too many attempts. Please wait a moment and try again."
- 400 → Show the server's error message directly
- Network errors → "Connection problem. Please check your internet."

---

## Phase 2: Fix `src/pages/SSO.tsx`

Add `signOut()` before `setSession()` per the integration notes:

```typescript
await supabase.auth.signOut({ scope: 'local' });
await supabase.auth.setSession({ ... });
```

One-line addition around line 116.

---

## Phase 3: Add Set Password to Dashboard

### New component or section in ProfileEditor / dashboard settings
- "Set a Password" card (only visible when user is signed in)
- New password + confirm password fields (min 8 chars, client-side validation)
- Calls `supabase.functions.invoke('user-auth', { body: { action: 'set_password', password, source_platform: 'authorsbureau' } })` — JWT included automatically
- Success toast: "Password set successfully"

---

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Full rebuild: inline card, mode toggle, password login, forgot/reset password, resend timer, unified session handler, error mapping |
| `src/pages/SSO.tsx` | Add `signOut()` before `setSession()` (~1 line) |
| `src/components/dashboard/ProfileEditor.tsx` | Add "Set Password" section |

No database migrations needed. No edge functions to create. All API endpoints already exist on the shared backend.

---

## Technical Details

**API calls summary:**

| Action | Endpoint body | When |
|--------|--------------|------|
| `request_code` | `{ action, email, source_platform }` | Email Code mode — send OTP |
| `verify` | `{ action, email, code, source_platform }` | Email Code mode — verify OTP |
| `verify_token` | `{ action, token, source_platform }` | Magic link arrival |
| `password_login` | `{ action, email, password, source_platform }` | Password mode |
| `forgot_password` | `{ action, email, source_platform }` | Forgot password step 1 |
| `reset_password` | `{ action, email, code, password, source_platform }` | Forgot password step 2 |
| `set_password` | `{ action, password, source_platform }` + JWT header | Dashboard settings |

All successful responses return `{ success: true, session_data: { access_token, refresh_token } }` (except `forgot_password` which returns `{ success: true, message }` and `request_code`).

