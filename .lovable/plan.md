
## Investigation Plan: Why "Be SUCKcessful" Isn't Propagating

### What I need to verify (read-only checks)

**Check 1 — Author/book data state**
Query `author_profiles`, `author_context`, and `books` for Pauline (`pl@paulineteo.com`, user_id `ef23c521-9cce-4d86-9128-dc687748b65b`, author_profile id `92326a2f-3ed0-4873-a8cf-7a0b1350995a`):
- Does `author_context` row exist? Is `book_title` populated or empty/null?
- Does `books` row exist with title "Be SUCKcessful"? What is its `author_id` value (user UUID vs author_profile UUID)?

**Check 2 — Hook resolution path**
Re-trace `useBookContext.ts`:
1. Resolves `author_profiles` → gets `id` (the profile id, NOT user_id) and stores as `authorId`
2. Queries `author_context` with `.eq("author_id", authorId)` — uses profile id
3. If empty, calls `get-author-book` edge function

**Check 3 — Edge function `get-author-book` response**
Test the live function with Pauline's token to see exactly what it returns. Confirms whether the fallback is producing `book.title = "Be SUCKcessful"` or returning null.

**Check 4 — Schema column mismatch suspicion**
Verify `author_context` actually has a `book_title` column (not `bookTitle`, `title`, or stored inside a `context` jsonb).

### Hypotheses (in priority order)

1. **`author_context.book_title` column doesn't exist or is named differently** → select returns row with `book_title = undefined` → falsy check passes → fallback fires → but ID mismatch in fallback below
2. **`books.author_id` stores `user_id` (ef23c521…) but hook passes `author_profiles.id` (92326a2f…) to the edge function context** → edge function still works because it builds idList from BOTH user_id AND profile.id → should succeed
3. **Edge function returns title correctly, but hook returns the fallback `"your book"` because of an early-return bug** — looking at the code, when `ctx?.book_title` is falsy and edge fallback succeeds, the hook returns `bookTitle: book?.title ?? "your book"`. If `book` is null (edge returned no book), we get "your book"
4. **Edge function call silently fails** (token expired, CORS, 500) → caught and returns `"your book"` fallback. The `console.error` would show in browser console — but user reported "your book" in UI, not an error

### Plan steps (after approval, in default mode)

**Step A — Verify schema and data**
- Read `author_context` schema and Pauline's row
- Read `books` row for Pauline (confirm title and `author_id` value)
- Test `get-author-book` edge function as Pauline → confirm returned `book.title`

**Step B — Identify the propagation break**
Based on findings, the bug is one of:
- **(i)** Edge function returns book correctly, but `useBookContext` doesn't actually use `book.title` (current code does — but verify there's no stale-cache issue keeping old data)
- **(ii)** Edge function returns null because of an ID/email mismatch
- **(iii)** `author_context` has the title in a different column the hook isn't reading

**Step C — Apply targeted fix**
- If (i): Add explicit logging + invalidate React Query cache key on hook upgrade (bump cache version)
- If (ii): Fix edge function ID resolution (add `author_profiles.id` to candidate set — already done per code review, but re-verify)
- If (iii): Add the correct column to the `author_context` select, or read from `books` table by `author_profiles.id` as a second-tier fallback before calling the edge function

**Step D — Add a third resolution tier inside `useBookContext`**
Per user's directive: between `author_context` (tier 1) and `get-author-book` edge fallback (tier 3), add **tier 2 = direct `books` query by both `author_profiles.id` AND `user_id`** so the title resolves even if edge function has any issue. This makes the hook self-healing.

**Step E — Bump version marker**
`x-hook-version: v3.1-2026-04-20-title-trace` so user can confirm new bundle live.

### What only the user can do
- Click **Publish → Update** in Lovable IDE
- Hard refresh (`Cmd/Ctrl+Shift+R`) to invalidate cached bundle
- Confirm intro reads "based on 'Be SUCKcessful'"

### Out of scope
- Onboarding flow changes
- Edge function rewrite (only ID-set adjustment if needed)
