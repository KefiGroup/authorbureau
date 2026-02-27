

# Revised `save-book` Fix Plan — IMPLEMENTED

Based on PublishNow's feedback, the plan has two parts:

## 1. PublishNow Side (separate project, not this workspace)
PublishNow will fix `pull-shared-profile` to use paginated user lookup instead of `listUsers()` without pagination. This is the root cause — the auth user exists but gets missed when not on page 1.

## 2. AB Side: Defense-in-depth null guard (this project) ✅ DONE

**File:** `supabase/functions/save-book/index.ts`

The fallback logic keys on `email` (stable, unique) instead of `author_name`:

1. If `resolved?.userId` exists → use it (happy path)
2. If null → look up existing books WHERE `owner_email = body.email` → reuse that `author_id`
3. If still null → `crypto.randomUUID()` + create `author_profiles` entry with `directory_status: "unlisted"`

**Changes made:**

- ✅ Added `owner_email` column to `books` table with index
- ✅ Updated platform-push resolution block with 3-tier fallback (shared profile → existing book by email → new local identity)
- ✅ Populated `owner_email` on every platform-push insert
- ✅ Added explicit `if (!userId)` guard before insert returning 400
- ✅ Added debug logging throughout cross-platform push path

**Migration applied:**
```sql
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS owner_email text;
CREATE INDEX IF NOT EXISTS idx_books_owner_email ON public.books(owner_email);
```
