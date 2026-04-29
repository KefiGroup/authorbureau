# Audit #2 (Revised) — Live 28-Node Build Test on "Invest Like Buffett for Parents"

## Why this book

Pauline's account has two books:

| Book | Nodes built | Live | Use |
|------|------------|------|-----|
| Be SUCKcessful | 28 | 25 | Reference / regression check |
| **Invest Like Buffett for Parents** | **0** | **0** | **Greenfield test bed** |

The Buffett book is `published_at`-approved, has its `author_context` row from BP-00 analysis, and zero `author_nodes`. This means I can actually exercise every builder end-to-end (Open → Build → Review → Activate → Live) instead of just probing existing data.

## What I will do

### Phase 1 — Pre-flight (10 min)

Verify the launching pad before generating anything:

1. Confirm `author_context` row for the Buffett book has all 5 frameworks populated (no half-baked analysis).
2. Confirm `BookHub` opens at `/dashboard/book/3c65a5f1-...` and the three tabs (Brand / Build / Yield) render with all 28 cards in the "Build Now" state.
3. Confirm `bookId` propagates through the URL into each builder route.

If any pre-flight item fails, fix before proceeding (likely a 5-line fix in `BookHub.tsx` or `useBookNodeProgress.ts`).

### Phase 2 — Build all 28 nodes against the Buffett book (the real audit)

For each node ID in this exact order (cheap → complex), invoke the generator edge function with `{ author_id: <Pauline>, book_id: <Buffett> }`, then the deploy function, then read back `author_nodes` to confirm `status='live'`:

```text
Brand   BP-01 BP-02 BP-03 BP-04 BP-05 BP-06 BP-07 BP-08 BP-09
Build   BA-10 BA-11 BA-12 BA-13 BA-14 BA-15 BA-16 BA-17 BA-18
Yield   YR-19 YR-20 YR-21 YR-22 YR-23 YR-24 YR-25 YR-26 YR-27 YR-28
```

For every node, the 6 audit checks are recorded as PASS/FAIL:

1. Builder route mounts with bookId ✓
2. Generator returns `success:true` and writes `content_json` ✓
3. Review step would render (verified by reading `content_json` keys against the builder's expected schema) ✓
4. Deploy function flips `status='live'` ✓
5. `author_nodes` row visible to `useBookNodeProgress` (so Live badge will show) ✓
6. Back button target route exists in router ✓

I'll run these sequentially (not in parallel) to avoid AI gateway rate limits and to keep one failure from cascading.

### Phase 3 — Targeted fixes for the 6 known issues

Re-test with the Buffett book; fix only what fails:

- **BA-11 Audiobook**: if generator returns 0 chapters, patch chapter detection. Check ElevenLabs voice list endpoint.
- **BA-13 Group Coaching**: if it times out, downgrade model to `gpt-5-mini` and shrink JSON schema (matching the working BA-17 pattern).
- **BA-14 Podcast / BA-15 Media & PR**: if `/pauline-teo/podcast` and `/pauline-teo/press` 404, add the missing slug entries in `node-slug-map.ts` and section components in `AuthorSubpageResolver.tsx`.
- **My Books Hub "Could not load your books"**: locate the literal string, replace with the cache-preserving fallback already used in `useMyBooks`.
- **Dashboard "Meet Abby" onboarding for returning users**: gate on a persisted profile field, not a session flag.

Each fix is verified by re-running the affected node's generate→deploy cycle on the Buffett book.

### Phase 4 — Eight-level QA

- L1 Console / L4 Data flow / L6 Auth / L7 Error handling / L8 Navigation: covered by code review + DB queries + edge-function logs (no manual click-through needed).
- L2 Every button / L3 Empty states / L5 Mobile: code-review only, since browser tool can't share your authenticated session. I'll flag any I cannot fully verify.

### Phase 5 — Deliverable

`.lovable/audit-2-report.md` containing:

- 28-row scorecard for the Buffett book (node × 6 checks)
- 8-level QA summary
- Comparison row: Buffett (greenfield) vs SUCKcessful (existing) — flags any node that worked once but fails now
- Every fix applied with file paths and line numbers
- Any node still failing → marked as **BLOCKER** with root cause

## What I will NOT do

- Touch the existing 28 `Be SUCKcessful` rows — those are the regression baseline.
- Run real Stripe charges or send real GHL emails (deploy functions in this codebase only flip status + write microsite URLs; they don't push real campaigns).
- Modify `src/integrations/supabase/{client,types}.ts`, `.env`, or migration tables unless a fix demands it.

## Estimated cost

~28 generator calls + ~28 deploy calls against Lovable AI Gateway. Most use `gpt-5-mini`; a few use `gpt-5`. Within normal session budget.

Approve and I switch to default mode and execute Phases 1 → 5 in order.
