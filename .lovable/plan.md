
## One-Line Fix — Book Gate Fallback in `useAuthorBook.ts`

### Problem
Lines 84-93 of `src/hooks/useAuthorBook.ts` only fire the fallback when `profile.user_id !== authUserId`. For Pauline, those values match, so the fallback never runs and her book (linked via `author_profiles.id`) is never found → false hard gate.

### Fix
In `src/hooks/useAuthorBook.ts`, replace the fallback block so it:
1. Always runs when the primary `books.author_id = authUserId` query returns zero rows
2. Queries `books.author_id = profile.id` (the `author_profiles` PK), not `profile.user_id`

### Change

**Before** (lines ~84-93):
```ts
if (profile?.user_id && profile.user_id !== authUserId) {
  const { data: fallback } = await supabase
    .from("books")
    .select("id, title, author_name, genre, description, cover_image_url")
    .eq("author_id", profile.user_id)
    .order("created_at", { ascending: false })
    .limit(1);
  row = fallback?.[0] ?? null;
}
```

**After**:
```ts
if (profile?.id) {
  const { data: fallback } = await supabase
    .from("books")
    .select("id, title, author_name, genre, description, cover_image_url")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);
  row = fallback?.[0] ?? null;
  if (row) console.log("[useAuthorBook] resolved via author_profiles.id fallback");
}
```

No other code changes. The final `author_context` fallback below remains unchanged.

### Verification
- Open BA-10 builder as Pauline → "Let's build your Online Course based on 'Be SUCKcessful'", no gate, "Build My Course" CTA active.
- Open BA-12 builder as Pauline → "Design My Membership" CTA active, no gate.
- Author with no books at all → still sees hard gate (unchanged).
- Author with book missing description → still sees soft gate listing missing fields (unchanged).
