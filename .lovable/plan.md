# Fix the recurring "Abby can't read the book" bug at its root

## What the user spotted

The `save-book` bug Veronica just hit (`books.author_id` was being set to her **auth `user.id`** instead of her **`author_profiles.id`**) is the **same class of bug** that keeps making Abby fail to read books at the nodes:

> Across many edge functions, the code assumes `books.author_id === auth.users.id`. That was true for old accounts (where the two UUIDs happened to match) and false for every newer account (Veronica, and everyone created after the schema settled).

So when Abby tries to look up a book via `.eq("author_id", user.id)`, she gets **zero rows** for any newer author — even though the book is right there in the DB. From Abby's point of view, "the author has no book."

## The actual schema (confirmed)

- `auth.users.id` = the auth account UUID
- `author_profiles.id` = a *separate* UUID, with `author_profiles.user_id → auth.users.id`
- `books.author_id` = **FK to `author_profiles.id`** (NOT `auth.users.id`)
- `generated_assets.author_id`, `author_nodes.author_id`, `courses.author_id`, etc. = also `author_profiles.id`

The convention is: **everything in the `public` schema keyed off `author_id` means `author_profiles.id`**, never the auth user id.

## Where the bug is repeated today

Confirmed by code search — these edge functions use the wrong key (`user.id` where `author_profiles.id` is required):

- `supabase/functions/abby-builder-generate/index.ts` (~10 queries, lines 710–718)
- `supabase/functions/business-consultant/index.ts` (~15 queries, lines 3167–3378)
- `supabase/functions/abby-execute/index.ts`
- `supabase/functions/distribute-audiobook/index.ts`
- `supabase/functions/elevenlabs-tts-audiobook/index.ts`
- `supabase/functions/elevenlabs-tts-audiobook-v2/index.ts`
- `supabase/functions/extract-frameworks/index.ts`
- `supabase/functions/populate-assets/index.ts`
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/sync-subscribers/index.ts`

(`abby-chat` is already correct — it resolves `author_profiles.id` first into a local `authorId` variable, then queries with that.)

This is the single root cause of the long tail of "ABBY can't see my book / book context / frameworks / nodes" reports.

## The fix — one shared resolver, then a sweep

### Step 1 — Add a tiny shared helper

Create `supabase/functions/_shared/resolve-author-id.ts`:

```ts
// Returns the author_profiles.id for a given Cloud auth.users.id.
// Auto-creates a minimal profile row if one doesn't exist (mirrors what
// save-book now does), so older code paths never silently get null.
export async function resolveAuthorId(adminClient, userId, email): Promise<string | null>
```

It does:
1. `select id from author_profiles where user_id = $1`
2. If found → return that id.
3. If missing → insert minimal profile (`user_id`, `pen_name` from email), return new id.
4. Returns `null` only when `userId` itself is null.

This pairs with the existing `_shared/resolve-user.ts` — together they're the canonical "who is calling me, and what's their author_id?" pattern.

### Step 2 — Patch every offending edge function

For each file in the list above, the change is mechanical:

```ts
// BEFORE (wrong — silently returns nothing for newer authors)
.from("books").select("...").eq("author_id", user.id)

// AFTER (correct)
const authorId = await resolveAuthorId(adminClient, user.id, user.email);
.from("books").select("...").eq("author_id", authorId)
```

Resolve `authorId` **once** at the top of each handler, then reuse it for every `author_id`-keyed query in that function (books, generated_assets, author_nodes, courses, audiobooks, email_flows, social_media_content, etc.).

### Step 3 — Add a guard rail so this can't regress

Add a build-time grep test in `src/lib/__tests__/` (or a lightweight script in `scripts/`) that **fails the build** if any file under `supabase/functions/` contains the literal pattern:

```
.eq("author_id", user.id)
.eq('author_id', user.id)
```

Reviewers (and Lovable itself) get an immediate red flag on every regression instead of finding it months later when an author reports "Abby can't see my book."

### Step 4 — Memory rule

Add a Core memory entry:

> **Author ID Resolution**: `books.author_id`, `generated_assets.author_id`, `author_nodes.author_id`, and every other `public.*.author_id` column references `author_profiles.id`, NOT `auth.users.id`. Edge functions MUST resolve `authorId` via `_shared/resolve-author-id.ts` before any `.eq("author_id", …)` query. Never use `user.id` directly as `author_id`.

This makes the rule visible in every future task and prevents the next AI loop from re-introducing the same bug.

## What changes for the user

After this sweep:

- Veronica (and every other newer author) will have Abby actually see their book, frameworks, business plan, courses, audiobooks, and email flows at every node.
- The "ABBY hit a snag" / "set up your author profile first" / silent empty-content failures stop being a recurring class of bug.
- The next time someone wires up an edge function, the guard rail catches the mistake before it reaches production.

## Out of scope (intentionally)

- No DB schema changes. Foreign keys are already correct; the bug is purely in app code that ignores them.
- No data migration. Old rows that already have correct ids stay correct; newer accounts start working immediately once the queries use the right id.
- No UI changes — this is a pure backend correctness fix.
