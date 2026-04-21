

## Correction

I was wrong in the previous step. Re-checked the database directly:

- `pl@paulineteo.com` = the real Pauline Teo account (this is who is logged in)
- `paulinet77@gmail.com` = the developer/admin account (NOT Pauline)
- All of Pauline's data — `author_profiles`, `books` ("Be SUCKcessful"), Stripe customer `cus_UJUky0qgRpdVKc`, active `yield` subscription — is correctly attached to user_id `ef23c521-9cce-4d86-9128-dc687748b65b`

The problem is **not** mis-mapping. The problem is that the auth user record for `pl@paulineteo.com` (id `ef23c521…`) is **missing from `auth.users`**, even though Pauline's JWT still decodes to that email and that exact ID. Everything downstream still points to her correctly — only the root auth row is gone. That is why `courses_author_id_fkey` fails.

So the previous proposed "re-link to paulinet77" fix would have been **destructive** — it would have transferred Pauline's book, course, profile, and subscription to the developer account. We must NOT do that.

## Correct fix

### 1) Restore the missing auth user for `pl@paulineteo.com`
Re-create the auth user record with the **same ID** Pauline already has everywhere else: `ef23c521-9cce-4d86-9128-dc687748b65b`.

This:
- preserves her `author_profiles` row
- preserves her book "Be SUCKcessful"
- preserves her Stripe customer + active yield subscription
- immediately unblocks the `courses_author_id_fkey` insert in BA-10
- leaves `paulinet77@gmail.com` (developer account) untouched

If the auth user cannot be re-inserted with the original UUID directly, the alternative is to create a new auth user for `pl@paulineteo.com` and then re-point `author_profiles.user_id`, `books.author_id`, `stripe_customers.user_id`, and any other owner FKs from `ef23c521…` to the new ID — in a single migration so nothing is orphaned. Restoring the original UUID is preferred because it requires zero downstream rewrites.

Pauline will need to use "Forgot password" to set a new password after restore, since the auth secret cannot be recovered.

### 2) Keep the BA-10 edge function preflight
The preflight check added previously (verify `auth.users` row exists before calling the AI) is still correct and should stay. It prevents wasted AI tokens if this ever happens again to any author. No change needed.

### 3) Keep BA-10 frontend error message
The "account needs to be re-linked, contact support" message stays as the user-facing fallback when the preflight fails. No change needed.

### 4) Add a safety guard so this cannot silently happen again
Add a one-time backend check + ongoing trigger:
- Backend audit query that lists every `author_profiles.user_id` that has no matching row in `auth.users`
- A lightweight trigger on `author_profiles` insert/update that logs a warning row into an `auth_uid_warnings` table when `user_id` does not exist in `auth.users` (warn-only, never blocks the write — to avoid breaking legitimate flows)

This gives early visibility into ghost-UID drift without touching the auth schema.

## Files / actions

- Backend migration / data repair (schema-safe)
  - Restore `auth.users` row for `pl@paulineteo.com` with id `ef23c521-9cce-4d86-9128-dc687748b65b`
  - If exact-UUID restore is not possible, perform a coordinated re-point migration across `author_profiles`, `books`, `stripe_customers`, `subscriptions`, `author_nodes`, `courses`, `course_modules`, `course_lessons` — all in one transaction
- New table: `auth_uid_warnings` (id, user_id, author_profile_id, detected_at, note)
- New trigger on `public.author_profiles` to populate `auth_uid_warnings` when user_id is orphaned
- No change to `supabase/functions/generate-ba10-online-course/index.ts` (preflight already correct)
- No change to `BA10Builder.tsx` (error mapping already correct)

## What will NOT happen
- We will NOT re-link Pauline's data to `paulinet77@gmail.com`
- We will NOT modify `paulinet77@gmail.com` in any way
- We will NOT delete or alter Pauline's `author_profiles`, `books`, Stripe customer, or subscription

## Verification

After the auth user is restored:
1. Pauline logs in at `pl@paulineteo.com` (password reset if needed)
2. Open `/node-builder/BA-10`
3. Click **Build My Course**
4. Expected: AI generation completes and writes to `courses`, `course_modules`, `course_lessons` without FK violation
5. Confirm her active yield subscription still resolves
6. Confirm her book "Be SUCKcessful" still loads in BA-10 intro
7. Run audit query — confirm no orphaned `author_profiles.user_id` remain

