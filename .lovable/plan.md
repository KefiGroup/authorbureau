

## The Security vs. Functionality Problem

The current views use `security_invoker = on`, which makes them respect RLS on the base tables. The base table `author_profiles` has this RLS setup:

- **"Authors can view their own profile"** — `auth.uid() = user_id` (authenticated only)
- **"Listed profiles viewable by authenticated"** — `directory_status IN ('listed', 'featured') OR auth.uid() = user_id OR admin` (authenticated only)
- The old **"Public profiles are viewable"** (`USING (true)`) was **dropped** during security hardening

So anonymous visitors get **zero rows** from the view because there is no `anon` SELECT policy on the base table.

For `books`, there IS an anon policy: **"Published books viewable by anon via view"** — so books should actually work already.

## The Safe Fix

We do **not** need to remove `security_invoker`. Instead, we add a narrow `anon` SELECT policy on the `author_profiles` base table that only exposes the same rows the view already filters:

```sql
CREATE POLICY "Anon can view listed profiles via view"
  ON public.author_profiles FOR SELECT
  TO anon
  USING (directory_status IN ('listed', 'featured', 'verified'));
```

This is secure because:
1. Anonymous users can only see profiles that are explicitly public (listed/featured/verified)
2. The view further restricts which **columns** are exposed — sensitive fields like Stripe keys, GHL keys, and promo codes are excluded from the view definition
3. `security_invoker = on` stays in place, so the view continues to enforce RLS
4. No sensitive data leaks — the anon policy only grants row-level access; the view controls column-level access

## Plan

### 1. Add anon SELECT policy on `author_profiles`

Single SQL migration adding a policy that allows anonymous users to read rows where `directory_status IN ('listed', 'featured', 'verified')`. This matches the view's WHERE clause exactly.

### 2. Verify `books` anon policy includes the right filter

The existing anon policy on `books` already allows `published_at IS NOT NULL`, which is correct. No change needed.

### 3. No frontend changes needed

The views and queries in `AuthorSite.tsx` and `BookSlugRedirect.tsx` already reference `author_profiles_public` and `books_public` correctly.

## Summary

One small migration with one policy. Security stays intact — sensitive columns remain hidden by the view, RLS stays enforced, and only public-status profiles are visible to anonymous visitors.

