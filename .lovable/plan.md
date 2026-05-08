## Bug

Token now resolves correctly, but `set-active-product-cover` returns 403 "Not your author_node".

## Root cause

My previous fix added `email` to the ownership query:

```ts
.from("author_profiles").select("user_id, email")
```

But `author_profiles` has no `email` column (it lives on `auth.users` / `books.owner_email`). The query errors → `authorRow` is null → 403.

The actual ownership data shows the by-id check would have worked: profile_user_id (`ef23c521-…`) matches the resolved user id. The email fallback was unnecessary for this row anyway.

## Fix

Edit `supabase/functions/set-active-product-cover/index.ts`:

1. Drop the non-existent `email` column from the `author_profiles` select.
2. Replace the email fallback with a `books.owner_email` fallback (the canonical pattern used by `get-author-book` and other resolvers): when `resolved.id` doesn't match `author_profiles.user_id`, look up `books.owner_email` for `node.book_id` and compare to `resolved.email`.

```ts
const { data: authorRow } = await admin
  .from("author_profiles")
  .select("user_id")
  .eq("id", node.author_id)
  .maybeSingle();

let owns = !!(authorRow && resolved.id && authorRow.user_id === resolved.id);

if (!owns && resolved.email && node.book_id) {
  const { data: book } = await admin
    .from("books")
    .select("owner_email")
    .eq("id", node.book_id)
    .maybeSingle();
  owns = !!(
    book?.owner_email &&
    book.owner_email.toLowerCase() === resolved.email.toLowerCase()
  );
}

if (!owns) return 403 "Not your author_node";
```

3. Add `book_id` to the `author_nodes` select so the fallback has it.

Then redeploy.

## Verification

1. Reload BP-08 cover designs.
2. Click an inactive design → toast "Active design updated", gold ring moves, network shows 200.
3. Edge function logs show no 403 errors.
