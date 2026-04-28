---
name: Cross-Platform Email Sync
description: PublishNow.io → Authors Bureau email sync via sync-author-email edge function with CROSS_PLATFORM_SECRET auth
type: feature
---
When an author changes their sign-in email in PublishNow.io, PublishNow MUST POST to Authors Bureau's `sync-author-email` edge function so all downstream records stay in sync.

**Endpoint:** `POST https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/sync-author-email`

**Headers:**
- `Content-Type: application/json`
- `x-cross-platform-secret: <CROSS_PLATFORM_SECRET>` (shared secret already in both projects)

**Body:** `{ old_email, new_email, user_id?, source? }` — provide either `old_email` or `user_id` (or both).

**What the sync does (service role, silent — no confirmation email):**
1. `auth.admin.updateUserById(user_id, { email: new_email, email_confirm: true })` — updates the sign-in identity in `auth.users`. PublishNow already verified the address, so no second confirmation is sent.
2. `UPDATE books SET owner_email = new_email WHERE owner_email = old_email OR author_id = user_id` — keeps the `get-author-book` ownership fallback working.
3. Updates `author_email_settings.reply_to_email` only if it still equals the old email (don't overwrite a manually-customized reply-to).
4. **Stripe customer sync** — `stripe.customers.list({ email: old_email })` and updates each match to `new_email` plus stamps `metadata.supabase_user_id`. This is critical because `check-subscription` looks up Stripe by email — without this step, a synced user shows as "Free" even with an active subscription. Logged as `stripe_customers_updated_count` in `email_sync_log`.
5. Audit row in `email_sync_log` (admin-only RLS).

**Idempotent:** Calling with an email that's already current is a noop. Unknown users log a noop row (`user_not_found_on_authors_bureau`) and return success so PublishNow never retries forever.

**Forbidden:** Do NOT update auth emails by direct SQL — `auth.users.email` must go through the admin API to keep identities/encrypted columns consistent.

**Backup safety net:** A DB trigger on `auth.users` (`sync_email_change_to_downstream`) syncs `books` + `author_email_settings` whenever auth email changes by ANY path (manual SQL, admin tool, etc.). The trigger does NOT call Stripe — only the edge function does — so direct `auth.users` updates outside the edge function will leave Stripe stale.
