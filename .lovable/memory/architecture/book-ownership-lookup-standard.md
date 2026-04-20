---
name: book-ownership-lookup-standard
description: All node builders must use useBookContext, which calls the get-author-book edge function. The edge function resolves both author_context.book_title (curated ABBY title) and books row server-side via service role.
type: constraint
---

## Standard
All node builders MUST use the `useBookContext` hook (`src/hooks/useBookContext.ts`) for resolving the current book.

The hook is a thin wrapper around the `get-author-book` edge function — no direct browser queries to `author_profiles`, `author_context`, or `books`.

### Why edge-function-only
There are two Supabase projects in this app:
- **Project-local** (`tubpbslfrxyfhldkcyyq`) — holds `author_profiles`, `author_context`, `books`
- **Shared backend** (`wuftdpnekscrsghqtssd`) — holds the auth session

Direct browser queries from either client hit the wrong target (data missing or RLS-blocked). The edge function runs with project-local service role and dual-token reconciliation, eliminating the entire class of "wrong client" bugs.

### Resolution order (handled by get-author-book edge function)
1. Resolve user via Cloud token, fall back to shared-backend token + email reconciliation
2. Build candidate `author_id` set: `userId` + all `author_profiles.id` where `user_id = userId`
3. Read `author_context.book_title` for those author_ids → **curated ABBY title (preferred)**
4. Read `books` row by `author_id IN (...)` OR `owner_email = userEmail`
5. Return `{ bookTitle, book, missingFields, isComplete }` — `bookTitle` prefers `author_context`, falls back to `books.title`

### Hard-gate rule (shouldGate)
`shouldGate = true` ONLY when `author_context` row does not exist (ABBY analysis never run). Missing individual book fields are NEVER hard gates.

### Forbidden patterns
- Direct browser queries: `supabase.from("books")`, `supabase.from("author_context")`, `supabase.from("author_profiles")` for book lookup in builders
- Using `useAuthorBook` directly in new builders (it remains as a lower-level edge-function client)

### Bundle freshness marker
The hook sends `x-hook-version: v3.4-2026-04-20-edge-primary` header so the network trace can confirm the latest bundle is live.
