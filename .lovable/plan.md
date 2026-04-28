# Fix: Stale Stripe Email Causing "Free" Tag After Email Change

## Root Cause (confirmed)

You're right — it IS tagged to the wrong place, but not the user_id.

**`check-subscription` looks up Stripe by EMAIL**, not by user_id:

```ts
const customers = await stripe.customers.list({ email, limit: 1 });
```

Pauline's records right now:

| System | Email |
|---|---|
| Authors Bureau `auth.users` (id `ef23c521…`) | ✅ `support@paulineteo.com` (correct, just synced) |
| Stripe customer `cus_UJUky0qgRpdVKc` | ❌ `pl@paulineteo.com` (stale) |

So when she logs in:
1. Auth resolves her as `support@paulineteo.com` ✓
2. `check-subscription` queries Stripe for that email → 0 results
3. Returns `subscribed: false` → UI shows **Free**

The Stripe customer (with the active subscription) is still indexed under her old email.

The previous Sprint F sync function only updated `auth.users`, `books`, and `author_email_settings`. **It did not touch Stripe.** That's the gap.

## Fix — Two Parts

### Part 1: Immediate — update Pauline's Stripe customer email

Update `cus_UJUky0qgRpdVKc` email from `pl@paulineteo.com` → `support@paulineteo.com` via Stripe API. After that, `check-subscription` will find her active sub and the badge will flip to her real tier within ~60s (or immediately on next refresh).

### Part 2: Permanent — extend `sync-author-email` to also sync Stripe

Add a Stripe step to the existing `sync-author-email` edge function so this never happens again:

```ts
// after auth + books + settings updates:
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
const customers = await stripe.customers.list({ email: resolvedOldEmail, limit: 10 });
for (const c of customers.data) {
  await stripe.customers.update(c.id, { email: newEmailRaw });
}
```

Also log `stripe_customers_updated_count` to `email_sync_log` so you can audit it.

The same trigger on `auth.users` won't call Stripe (DB triggers can't make HTTP calls reliably here), but the **edge function** path (PublishNow webhook) will. The DB trigger remains the safety net for `books` + `author_email_settings`.

### Part 3 (optional hardening): teach `check-subscription` to fall back to user_id

Right now if email lookup fails, we give up. We can add a fallback: if no customer matches by email, look up customer by `metadata.supabase_user_id`. Going forward, `create-checkout` should stamp this metadata so we're never email-dependent again.

This is a nice-to-have — Part 1 + Part 2 fully resolves the immediate problem.

## Verification After Fix

1. Pauline reloads the dashboard within 60s → badge shows her actual tier (not Free)
2. `email_sync_log` row appears with `stripe_customers_updated_count >= 1`
3. Future PublishNow email-change webhooks automatically sync Stripe too

## Files Touched

- `supabase/functions/sync-author-email/index.ts` (add Stripe block + log column)
- New migration: add `stripe_customers_updated_count INT DEFAULT 0` to `email_sync_log`
- One-time Stripe API call to fix `cus_UJUky0qgRpdVKc`
- (Optional Part 3) `supabase/functions/check-subscription/index.ts` + `create-checkout`

No frontend changes. No memory updates needed beyond appending one line to the existing Cross-Platform Email Sync memory noting that Stripe is now in scope.