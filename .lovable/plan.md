## Per-Book Context (A) + Finish 5 BP Builders (C)

### What this fixes
- New books can't generate any framework-heavy node because there's no per-book `author_context` and no way to create one → "context blocked" deadlock.
- BP-01, BP-02, BP-03, BP-04, BP-05 still write to `author_nodes` without `book_id`, so they overwrite each other across an author's books.

### A. Per-book context

**Migration**
- Add `book_id uuid REFERENCES books(id) ON DELETE CASCADE` to `author_context`.
- Backfill: set `book_id` on each existing row to that author's oldest book (`books.created_at ASC LIMIT 1`).
- Drop any old "latest by author" uniqueness; add unique index `(author_id, book_id)`.

**`supabase/functions/_shared/builder-helpers.ts`**
- `buildAuthorContext(supabase, author_id, user_id, book_id, node_id)` looks up `author_context` by `(author_id, book_id)` only. No `book_title` heuristic, no fallback to other books.
- If no context row exists for that `book_id`, return `{ contextBlocked: true, reason: "no_book_context" }`.

**`supabase/functions/generate-bp00-analysis/index.ts`**
- Accept `book_id` in payload (required).
- Upsert `author_context` row with `(author_id, book_id)` as the conflict key. Each book ends up with its own context row.

**Frontend "Analyse this book" CTA**
- New small component `AnalyseBookGate.tsx` rendered inside any builder when the generator returns `contextBlocked`.
- One button → invokes `generate-bp00-analysis` with current `bookId` → on success, retries the original generator.
- Wired into the existing builder error/empty states (no new routes).

### C. Finish BP-01..BP-05 builders + generators

For each of BP-01 (Email), BP-02 (Lead Magnet), BP-03 (Social), BP-04 (Website), BP-05 (Webinar):

**Builder UI** (`src/components/dashboard/builders/bp0X/BP0XBuilder.tsx`)
- Accept `bookId` prop (already passed by parent dashboard).
- Thread `bookId` into `loadBuilderDraft`, `autosaveBuilderDraft`, `publishNode`, and the generator invoke payload.

**Generator edge function** (`supabase/functions/generate-bp0X-*/index.ts`)
- Accept `book_id` in payload.
- Replace ad-hoc `author_context` / `books` lookups with `buildAuthorContext(..., book_id, "BP-0X")`.
- Pass `book_id` to `upsertAuthorNode` and `snapshotAuthorNode` (matching the pattern used in the 19 already-converted generators).
- Honour `contextBlocked` by returning `{ success: false, status: "context_blocked", message: "Run book analysis first" }`.

Redeploy: `generate-bp00-analysis`, `generate-bp01-email-sequence`, `generate-bp02-lead-magnet` (and any sub-functions), `generate-bp03-social-*`, `generate-bp04-website`, `generate-bp05-webinars`.

### Validation
1. Pauline → "Invest Like Buffett for Parents" → open any node → see "Analyse this book" → click → BP-00 runs → context row created with that `book_id` → re-run generator → content is Buffett-specific.
2. Re-run BP-02 / BP-04 / BP-05 on the new book → each writes a separate `author_nodes` row scoped to the Buffett `book_id`. Be SUCKcessful's existing rows are untouched.
3. New author with one book: BP-00 already runs in onboarding → zero extra clicks.
4. Microsite: each book page only shows nodes whose `book_id` matches (or `null` legacy rows pinned to oldest book).

### Files touched
- 1 migration (`author_context.book_id` + backfill + unique index)
- `supabase/functions/_shared/builder-helpers.ts`
- `supabase/functions/generate-bp00-analysis/index.ts`
- `supabase/functions/generate-bp01-email-sequence/index.ts`
- `supabase/functions/generate-bp02-lead-magnet/index.ts` (+ any BP-02 sub-generators)
- `supabase/functions/generate-bp03-social-*/index.ts` (orchestrator + 3 sub-functions)
- `supabase/functions/generate-bp04-website/index.ts`
- `supabase/functions/generate-bp05-webinars/index.ts`
- `src/components/dashboard/builders/bp01/BP01Builder.tsx`
- `src/components/dashboard/builders/bp02/BP02Builder.tsx`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- `src/components/dashboard/builders/bp04/BP04Builder.tsx`
- `src/components/dashboard/builders/bp05/BP05Builder.tsx`
- `src/components/dashboard/builders/_shared/AnalyseBookGate.tsx` (new)

### Out of scope
- No changes to the 19 generators / 23 builders already converted.
- No UI redesign — only the new gate component and book_id threading.
