

# Fix: BP-02 and BP-03 book fallback query uses wrong ID

## Problem
The edge function receives `author_id` which is `author_profiles.id` (`92326a2f...`). But `books.author_id` stores `auth.users.id` (`ef23c521...`). So the fallback query `.eq("author_id", author_id)` on the books table never finds a match.

## Fix
In both edge functions, the `author` variable already contains `user_id` (the auth user ID) from the `author_profiles` select on line 26. Use `author.user_id` instead of `author_id` when querying the books table.

### File 1: `supabase/functions/generate-bp02-lead-magnets/index.ts`
- Line 47: Change `.eq("author_id", author_id)` to `.eq("author_id", author.user_id)`

### File 2: `supabase/functions/generate-bp03-social-media/index.ts`
- Same fix: use `author.user_id` (or equivalent) in the books table fallback query

Both functions already fetch `user_id` from `author_profiles` — it just needs to be used in the right place. Redeploy both functions after the fix.

## Files Changed
| File | Change |
|---|---|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Line 47: use `author.user_id` for books query |
| `supabase/functions/generate-bp03-social-media/index.ts` | Same fix in books fallback query |

