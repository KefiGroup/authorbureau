# Fix sign-in for Authors Bureau

## What is wrong

Sign-in does not go through this app's own accounts system. It calls an outside login service that used to belong to the PublishNow side of the business. That service is no longer reachable at all — every login request fails before it even gets to checking your email or password. This is also the source of the repeating errors showing in the app right now.

Nothing is wrong with your email or password, and no author data is lost. All the site data (authors, books, products) already lives in this app's own backend and is loading fine.

## The fix

Move sign-in onto this app's own accounts system, which is already set up and already holds all five author accounts:

- paulinet77@gmail.com
- support@paulineteo.com
- bob@bbattista.com
- felicia@artoflife.sg
- fasahath@gmail.com

What changes for people signing in:

1. The sign-in page keeps both options it has today: a one-time code sent by email, or email + password.
2. Because passwords were never usable on this system, each author sets a password the first time via "Forgot password" (or simply uses the email code option, which needs no password).
3. Staying signed in, sign-out, admin access, and the dashboard all keep working the same way.

## Steps

1. Turn on email sign-in and email codes on this app's backend.
2. Point the sign-in page, the "who is signed in" check, and the sign-out action at this app's backend instead of the dead outside service.
3. Point the few remaining screens that still read data from the dead service (product page, coaching, speaking profile, course builder, enquiry form, join page) at this app's backend.
4. Verify end to end: request a code, sign in, land on the dashboard, reload and stay signed in, then sign out.
5. Send a password-set link to each author so password sign-in works too.

## Technical notes

- Root cause: `https://wuftdpnekscrsghqtssd.supabase.co` returns no response (connection fails). `src/pages/Auth.tsx` posts to its `functions/v1/user-auth` edge function, and `src/lib/shared-backend.ts` hosts the auth client used by `useAuth.tsx`, `useAuthReady.ts`, and `getActiveToken()`.
- Replace shared-client auth with the Cloud client (`@/integrations/supabase/client`): `signInWithOtp` for the email-code flow, `signInWithPassword` for password, `resetPasswordForEmail` + a `/reset-password` route for password setup.
- `enable_email_auth` must run in the same change; leave auto-confirm off.
- `getActiveToken()` becomes a thin wrapper over the Cloud session so edge functions keep working; `_shared/resolve-user.ts` already accepts Cloud tokens first, so no edge-function changes are required.
- Cloud `auth.users` already contains the 5 author rows with matching ids used by `author_profiles.user_id`, so roles, ownership, and RLS continue to resolve.
- Remaining `supabase.from(...)` calls imported from `@/lib/shared-backend` (AuthorProductPage, CoachingCRM, SpeakingProfile, CourseBuilder, ServiceInquiryForm, Join) switch to the Cloud client.
