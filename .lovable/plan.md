
## Plan: Standardize Book Context + Hard-Gate Only on Subscription/Onboarding

### Approved gating rule
`shouldGate = true` ONLY when:
- Subscription is inactive, OR
- `author_context` row does not exist (ABBY analysis never run)

Missing individual book fields (title, ISBN, cover) are NEVER hard gates for subscribed+onboarded authors. They become optional soft prompts only.

### Step 1 — New hook `src/hooks/useBookContext.ts`
Single source of truth for all node builders. Returns:
```
{ bookTitle, bookId, book, authorId, hasSubscription, hasContext, isLoading, shouldGate, missingFields }
```

Resolution order:
1. Resolve `author_profiles` for current user (id + subscription_status)
2. Read `author_context` row (book_title, book_id) — primary source
3. If `author_context.book_title` empty AND user is onboarded, fall back to `get-author-book` edge function
4. Compute `shouldGate = !hasActiveSubscription || !hasContextRow`
5. React Query cache, 5 min stale time

### Step 2 — Update `BookProfileGate`
Accept `shouldGate` prop. If `false`, return `null` unconditionally (no soft gate, no missing-field warning, no "Add Your Book" CTA). The component only renders when subscription inactive OR no `author_context` row.

### Step 3 — Migrate the 4 named builders
Swap `useAuthorBook` → `useBookContext` in:
- `BA10Builder.tsx`
- `BA12Builder.tsx`
- `BP06Builder.tsx`
- `BP07Builder.tsx`

Remove all direct `supabase.from("books")` and `supabase.from("author_context")` reads. Pass `shouldGate` to `BookProfileGate`.

### Step 4 — Sweep remaining builders
Grep all other node builders using `useAuthorBook` or direct `books`/`author_context` queries. Swap to `useBookContext` for consistency.

### Step 5 — Bundle freshness marker
Bump fetch header in `useBookContext` to `x-hook-version: v3-2026-04-20-context-first` so network trace proves new bundle is live.

### Step 6 — Memory update
Update `mem://architecture/book-ownership-lookup-standard.md`:
> Read `author_context` first; `get-author-book` is fallback only. Hard-gate ONLY on inactive subscription or missing `author_context` row. Never gate on missing book fields.

### What only the user can do (cannot be automated)
- Click **Publish → Update** in Lovable IDE (no programmatic trigger exists)
- Hard refresh `authorsbureau.com` (Cmd/Ctrl+Shift+R) to invalidate `index-BGGoaZWD.js`
- Verify network trace: `x-hook-version: v3-2026-04-20-context-first` header present, no `rest/v1/books?author_id=eq...` calls

### Out of scope
- Changes to onboarding flow, subscription billing, or `get-author-book` edge function (already correct)
- Re-running owner_email backfill (already 100%)
