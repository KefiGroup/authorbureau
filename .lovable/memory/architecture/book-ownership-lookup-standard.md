---
name: book-ownership-lookup-standard
description: All node builders must use useBookContext hook (author_context first, get-author-book edge function as fallback). Hard-gate ONLY on inactive subscription or missing author_context row.
type: constraint
---

## Standard
All node builders MUST use the `useBookContext` hook (`src/hooks/useBookContext.ts`) for resolving the current book.

### Resolution order (handled by useBookContext)
1. Resolve `author_profiles` for current user → id + `subscription_tier`
2. Read `author_context` row → primary source for `book_title` (always populated post-onboarding)
3. Fallback to `get-author-book` edge function only if `author_context.book_title` is empty (covers data migration / early test accounts)

### Hard-gate rule (shouldGate)
`shouldGate = true` ONLY when:
- Subscription is inactive (tier not in `brand|build|yield`), OR
- `author_context` row does not exist (ABBY analysis never run)

Missing individual book fields (title, ISBN, cover, description, genre) are NEVER hard gates for subscribed + onboarded authors. They render as soft prompts inside `BookProfileGate` only when `shouldGate=true` AND a book row is incomplete.

### Forbidden patterns
- Direct browser queries: `supabase.from("books").select(...).eq("author_id", ...)`
- Direct browser queries to `author_context` for book_title in builders (use the hook)
- Gating subscribed authors based on missing book fields
- Using `useAuthorBook` directly in new builders (it remains as the underlying edge-function client only)

### Bundle freshness marker
The hook sends `x-hook-version: v3-2026-04-20-context-first` header on the edge fallback so the network trace can confirm the latest bundle is live.

### Migrated builders
BA-10, BA-12, BP-06, BP-07 use `useBookContext` directly. Other builders that don't gate (read book_title for display only) may continue with their existing local context+books pattern until refactored.
