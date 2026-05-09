## Bug

Opening **My Business Plan → View Plan** for "Invest Like Buffett for Parents" shows **"No plan found"**, even though a saved plan exists in the database.

## Root cause

`generated_assets` for this book has `author_id = ef23c521…` (Pauline's `auth.users.id`, saved by an older version of the function). Pauline's real `author_profiles.id` is `92326a2f…`.

In `supabase/functions/business-consultant/index.ts`, the `get-plan` action now resolves the canonical `author_profiles.id` via `resolveAuthorId(...)` and filters on it:

```ts
.eq("book_id", getPlanBookId)
.eq("author_id", authorId)        // ← 92326a2f… (profile id)
.eq("asset_type", "business_plan")
```

The stored row's `author_id` is the legacy `user.id`, so the query returns `null` and the dialog renders the empty state. The same drift would silently break `save-plan` (it would insert a second row… except the unique constraint is `(book_id, asset_type)`, so the upsert overwrites — but `get-plan` still won't find it on the next read because the new row's `author_id` is now the profile id while older code paths may still write `user.id`).

## Fix (single file)

`supabase/functions/business-consultant/index.ts` — `get-plan` action (~lines 3150–3178):

1. The unique key on `generated_assets` is `(book_id, asset_type)`, so `author_id` is **redundant** in the lookup. Drop the `author_id` filter from `get-plan` so the row is found regardless of which id (user_id vs author_profiles.id) historical writes used.
2. Verify ownership instead via the existing book context: confirm the book belongs to this user (already implicit — books are filtered by `owner_email`/owner elsewhere; here we additionally check `books.owner_email = user.email OR books.owner_user_id = user.id` via a quick lookup) and only then return the content. This keeps the endpoint safe without depending on the drifted `author_id`.
3. While we're here, normalise the historical row by updating its `author_id` to the resolved `authorId` (best-effort, non-blocking) so future writes/reads are consistent.

No client changes, no schema changes, no other endpoints touched.

## Out of scope

- Backfill migration for every drifted `generated_assets` row (we self-heal on read instead).
- `save-plan` / `expand-plan` logic (they already write the resolved `authorId`; the read fix is sufficient to unblock the user).
- Any UI changes to `FullPlanDialog.tsx`.

## Verification

After deploy, refresh the dialog for "Invest Like Buffett for Parents" — the saved plan (1,867 chars) should render with sections instead of the empty state.
