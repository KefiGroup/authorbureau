
The user is telling me directly: she signs in with `pl@paulineteo.com`. My earlier audit said that email doesn't exist in `auth.users` for this Cloud project. I need to reconcile this before doing anything.

Two possibilities:
1. `pl@paulineteo.com` exists in `auth.users` but I missed it (e.g., case sensitivity, whitespace, or it's actually there and I queried wrong).
2. She signs into a different Supabase project (the shared backend `wuftdpnekscrsghqtssd`), and the Cloud project only has `paulinet77@gmail.com`. The dual-backend pattern in this codebase (`@/lib/shared-backend` + `@/integrations/supabase/client`) makes this very plausible — she signs into shared backend, and a separate Cloud user (`paulinet77@gmail.com`) is what holds her data.

Re-verification step (read-only, before any change):
1. Query Cloud `auth.users` again with broader filter: `email ilike '%pauline%'` to catch case/whitespace.
2. Check if there is a mapping table or linking record.
3. Read `src/lib/shared-backend.ts` to confirm the dual-backend setup.

Likely outcome: she authenticates against the shared backend with `pl@paulineteo.com`, and that session is mapped to the Cloud UID `5fd84779...` (paulinet77@gmail.com) for data ownership. The relink we did is correct, but the email mismatch is a UX bug — the header should show her actual sign-in email, not the Cloud auth email or `books.owner_email`.

## Plan

### Step 1 — Re-verify the auth identity (read-only)
- Query Cloud `auth.users` with `email ilike '%pauline%'` (case-insensitive).
- Read `src/lib/shared-backend.ts` to confirm whether sign-in goes to a separate Supabase project.
- If shared-backend, query the shared-backend users table for `pl@paulineteo.com` to get the shared UID and confirm the mapping to Cloud UID `5fd84779...`.

### Step 2 — Decide based on findings
- **If `pl@paulineteo.com` exists in Cloud `auth.users`** with a different UID than `5fd84779...`: the data is linked to the wrong UID. Migration: relink `author_profiles`, `books`, `author_nodes` from `5fd84779...` → the real `pl@paulineteo.com` UID.
- **If sign-in is via shared backend**: no UID change needed. The data is correctly linked to the Cloud UID that mirrors her shared-backend identity. The fix is purely in the dashboard header — show her actual sign-in email instead of `books.owner_email`.

### Step 3 — Apply the single appropriate fix
Either (A) one relink migration, or (B) one small change to `DashboardHeader.tsx` to display `user.email` from the active session (already passed in as `user.email`) instead of pulling `pen_name`/`owner_email`.

### Step 4 — Validate
1. Sign in as `pl@paulineteo.com` → header shows `pl@paulineteo.com`.
2. BP-03 loads on Step 4 with the 5 saved posts.
3. Lead magnet from earlier sessions appears.

### Scope guard
- No changes to RLS, edge functions, generation, or other builders.
- At most ONE migration OR ONE small UI fix in `DashboardHeader.tsx`.
