# One sign-in code length: 6 digits

Right now the sign-in screens juggle two lengths (6 or 8 boxes, "accept 6 to 8"). That came from the login emails arriving with an 8-digit code while the screen expected 6. The fix is to settle on one length everywhere.

## What will change

1. **Make the emailed code 6 digits.** The code length is a backend email setting, currently 8. I'll set it to 6 so every login email sends a 6-digit code.
2. **Sign-in screens show exactly 6 boxes.** Author sign-in, reader sign-in, and password reset all use one shared 6-box field. It verifies automatically once the sixth digit is typed, and the Verify button works too.
3. **Email wording matches.** The login email says "Enter this 6-digit code", matching what people see on screen.
4. **Remove the mixed-length handling.** No more "6 to 8" logic in the code, so this can't drift apart again.

## If the backend length can't be changed to 6

If the platform doesn't let me change that setting, I will not leave a mismatch. Instead the screen becomes a single plain code box with no fixed slot count, so whatever length the email sends is accepted, and I'll tell you exactly what the limit is. I'll confirm which path applied before finishing.

## Verification

- Request a real login code and check the email shows 6 digits.
- Sign in with it on the author page and the reader page.
- Run a password reset with the code.
- Typecheck and existing tests.

## Technical notes

- Backend: auth mailer OTP length 8 to 6.
- `src/pages/Auth.tsx`, `src/pages/ReaderAuth.tsx`: `InputOTP maxLength` 8 to 6, slots 8 to 6, auto-submit at 6, guards `otp.length < 6` to `otp.length !== 6`.
- `src/lib/verify-email-code.ts`: unchanged single `verifyOtp(type: "email")` call (retrying consumes the code).
- `supabase/functions/_shared/email-templates/magic-link.tsx`: copy restored to "6-digit code"; redeploy `auth-email-hook`.
- Publish required for the sign-in pages to reach the live site.
