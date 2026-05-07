## Goal

Every node — including all 10 YR services — becomes per-book. You can build *Be SUCKcessful* coaching/training/mastermind separately from *Invest Like Buffett* coaching/training/mastermind, with their own pricing, sales pages, curricula, and microsite URLs.

Email and Social are also per-book at the *content* layer (sequences, posts, microsite copy), but they ship through your single mailing list and single social account in the background.

## How it works for you (author flow)

```text
Book Hub → pick "Invest Like Buffett for Parents" → ?bookId=…
   └─ All 28 nodes show 0/28 until you build inside this book
       └─ YR-19 builder generates "Family Investing Coaching"
           pricing, packages, sales page, microsite slug
              /pauline-teo/invest-like-buffett-for-parents/coaching

Book Hub → switch to "Be SUCKcessful" → ?bookId=…
   └─ YR-19 already built → "Mindset & Resilience Coaching"
       /pauline-teo/be-suckcessful/coaching
```

A reader buying coaching from one book's funnel sees only that book's offer, pricing, and curriculum. Two distinct microsites, two distinct Stripe SKUs.

## Code changes

### 1. `supabase/functions/_shared/node-readiness.ts`
Empty `AUTHOR_LEVEL_NODES`:
```text
export const AUTHOR_LEVEL_NODES = new Set<string>([]);
```
Fan-out is gone. Every node scopes to its own `book_id` in `author-stats` and frontend gating.

### 2. `supabase/functions/author-stats/index.ts`
With `AUTHOR_LEVEL_NODES` empty, the existing `fanOutToAllBooks` branch becomes unreachable; counter naturally becomes per-book. No structural change to the function.

### 3. Microsite slug uniqueness — `compute_node_microsite_url` (DB function)
Today it returns `/{author_slug}/{node_slug}`. With per-book YR rows, two books would collide on `/coaching`. Update to:
```text
/{author_slug}/{book_slug}/{node_slug}   ← when book_id present
/{author_slug}/{node_slug}                ← legacy fallback
```
Migration adds the new resolver; routing in `MicrositePage.tsx` already supports book-scoped paths (verified during Sprint earlier — book slug routing exists for BA nodes).

### 4. BP-01 Email & BP-03 Social — per-book content, shared channel
- Email: `email_sequences` and `email_flows` already have `book_id`. The dispatcher (`process-email-queue`) sends from the same domain regardless. No infra change — just stop fan-out so each book's sequences are tracked independently.
- Social: `social_posts` already has `book_id`. Buffer publishes to the same connected accounts regardless of which book scheduled the post. Marketing Hub Social Calendar already filters by `book_id`.

So readers see book-specific content; you operate one inbox and one Buffer account. Nothing to build — only the counter and the gating treat them as per-book now.

### 5. Generators — verified, **no change**
All 28 generators already pass `book_id` to `upsertAuthorNode` and gate generation via `buildAuthorContext` (which blocks if BP-00 hasn't been run for that book). Cross-book contamination of AI content is already impossible.

### 6. Tests + docs
- `src/lib/__tests__/node-readiness.test.ts` — assert `AUTHOR_LEVEL_NODES.size === 0`.
- `docs/02-business-rules/05-author-vs-book-level-registry.md` — rewrite: "All 28 nodes are book-scoped. No author-level fan-out. Email + Social share the underlying channel but content is per-book."
- `docs/05-sprint-records/03-bug-registry.md` — Sprint 8 entry.
- `mem://index.md` — replace prior "one email list / one podcast per author" memory with the new per-book rule.

## Effect after deploy

| Book | Now | After |
|---|---|---|
| Be SUCKcessful | 26/28 | 26/28 (unchanged — already book-stamped) |
| Invest Like Buffett for Parents | 14/28 | **0/28** |

Invest Like Buffett honestly resets to 0 and you build it independently. Be SUCKcessful is unaffected.

## Out of scope
- No data migration (rows already carry correct `book_id`).
- No commerce, payout, or AI prompt changes.
- No change to Buffer / Resend infrastructure.

## Verification
1. Reload dashboard → counters as table above.
2. Open Invest Like Buffett → all 28 streams show "Build" (none Live).
3. Build YR-19 inside Invest Like Buffett → only that book's counter ticks; Be SUCKcessful's YR-19 stays its own separate Live row pointing to its own microsite.
4. Buy-flow test: visit each book's coaching microsite → distinct sales page, distinct Stripe checkout SKU.
