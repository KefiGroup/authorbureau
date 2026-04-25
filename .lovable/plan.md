# Fix: "What's inside the book" still shows wrong book on /pauline-teo

## Root cause (verified)

The previous "anchor to `author_context.book_id`" fix is in `AuthorSite.tsx`, but it never runs for public visitors.

`AuthorSite.tsx` queries `public.author_context` directly from the browser. RLS on that table only allows the *owner* (`auth.uid() = author_profiles.user_id`) to SELECT. For everyone else — including anonymous visitors landing on `authorsbureau.com/pauline-teo` — the query returns no rows.

When `ctx` is null:
- `preferredBookId` is null
- `sourceBook` falls back to `enriched[0]`, the most recently created published book
- For Pauline, that is "Invest Like Buffett for Parents" (created 2026-04-24), not "Be SUCKcessful" (created 2026-04-11)
- `highlights` then come from that book's `description`, producing the "rich/poor dad/mum / Buffett formula" bullets the user is seeing

DB state confirms the data is correct — only the read path is broken:
- `author_context` row for Pauline has `book_id = e5b857ac...` (Be SUCKcessful)
- `key_frameworks` and `unique_insights` are both `[]` (so highlights will always come from the book's `description`)
- Be SUCKcessful's description starts with "Every Master Was Once a Disaster…" — exactly the content we want shown

## Fix

Add a small, read-only public surface for the curated book pointer, then use it.

### 1. New SQL migration

Create a SECURITY DEFINER function that returns just the curated `book_id` for a given `author_profile_id`. No other `author_context` columns are exposed (the curated frameworks/insights remain private until the team is ready to publish them).

```sql
create or replace function public.get_author_curated_book_id(_author_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select book_id
  from public.author_context
  where author_id = _author_id
    and book_id is not null
  order by created_at desc
  limit 1
$$;

grant execute on function public.get_author_curated_book_id(uuid) to anon, authenticated;
```

### 2. `src/pages/AuthorSite.tsx`

Replace the direct `author_context` SELECT with an RPC call that works for anonymous visitors:

- Drop `contextRes` from the `Promise.all` and instead call `supabase.rpc('get_author_curated_book_id', { _author_id: profile.id })` — keeps the public-vs-owner code path identical.
- Keep `preferredBookId` logic as-is. For owners we can still optionally read `key_frameworks` / `unique_insights` (currently empty for Pauline anyway), but to keep the change minimal and unblock the live bug, this plan only restores the `preferredBookId`. Highlights continue to come from `sourceBook.description`, which is the path actually rendering on Pauline's site today.
- Result: `sourceBook` resolves to Be SUCKcessful, the subtitle reads "From Be SUCKcessful", and the bullets come from the SUCKCESS description ("Every Master Was Once a Disaster…", "From a girl who didn't know how to cut her nails…", etc.).

### 3. Verify

After deploy, on `authorsbureau.com/pauline-teo` the "What's inside the book" section should show:
- Subtitle: *From Be SUCKcessful*
- 4–6 bullets sourced from the SUCKcessful description

No other sections / behaviour change.

## Files touched

- `supabase/migrations/<timestamp>_expose_curated_book_id.sql` (new)
- `src/pages/AuthorSite.tsx` (swap one query, ~10 lines)

## Out of scope (intentionally)

- Populating `key_frameworks` / `unique_insights` for Be SUCKcessful — those are empty in the DB; even if we exposed them publicly there would be nothing to render. Can be a follow-up once Abby analysis runs.
- Touching the `author_profiles_public` view, hero bio, CTAs, currency formatting, or any other previously-fixed area.
