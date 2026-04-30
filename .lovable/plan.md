## Goal

Scope the Marketing Hub by book — so Pauline's second (and Nth) book each get a clean, focused view, with an optional "All Books" rollup that matches today's behaviour.

## Why now

The Marketing Hub is currently the only major surface that's author-wide. Every other studio (Podcast, Social Media, Audiobook, Book Hub, Builders) is per-book. Once Pauline (or any author) ships a second book, the current hub mixes their sequences, posts, and stats into an undifferentiated list — making it impossible to manage per book.

## What changes (user-visible)

1. A **Book Selector** appears at the top of the Marketing Hub (same dark navy "Source Book" pill pattern used in `PodcastStudio` / `SocialMediaStudio`), with options:
   - All of {author}'s Books *(default for authors with 2+ books; matches today's view)*
   - Book #1 — *e.g. SUCKCESS*
   - Book #2 — *next title*
   - …
2. Switching books re-scopes **every** part of the hub:
   - Overview campaign cards (Email Marketing, Lead Magnets, Social Media, etc.) → status reflects only the selected book's nodes
   - Sequences tab → only sequences tied to that book
   - Social Calendar tab → only posts tied to that book
   - Contacts tab → only contacts attributed to that book's nodes
   - Settings tab → unchanged (author-level)
3. Authors with **only one book** see no selector (zero added clutter); the hub silently scopes to that single book.
4. Generation actions (e.g. "Generate sequences for all 28 nodes") respect the active book — they generate for the selected book, not blindly for all books.
5. The header subtitle updates: e.g. "Activate campaigns for *SUCKCESS*" or "Activate campaigns across all your books".

## Technical plan

### Data model — what's already book-aware vs what isn't

| Table | Has `book_id`? | Action |
|---|---|---|
| `author_nodes` | ✅ yes | Filter by `book_id` |
| `email_flows` | ✅ yes | Filter by `book_id` |
| `generated_assets` | ✅ yes | Filter by `book_id` |
| `social_posts` | ❌ no | **Add `book_id` column** (nullable, backfill from BP-03 author_node row) |
| `crm_contacts` | ❌ no | **Add `book_id` column** (nullable, backfill from `last_node_id` → `author_nodes.book_id`) |
| `email_flow_enrollments` | ❌ no (but joins via `flow_id` → `email_flows.book_id`) | No schema change; filter via join |
| `author_subscribers` | ❌ no | Stays author-wide (subscribers belong to the author, not a book) |

**Migration**:
- Add `book_id uuid` to `social_posts` and `crm_contacts` (nullable, FK to `books(id) on delete set null`)
- Backfill `social_posts.book_id` from the author's BP-03 `author_nodes.book_id`
- Backfill `crm_contacts.book_id` by joining `last_node_id` → `author_nodes.book_id`
- Add indexes `(author_id, book_id)` on both
- Update the `compose-social-post` and CRM lead-capture edge functions to write `book_id` on insert going forward

### Edge function — `marketing-hub-state`

- Accept an optional `book_id` parameter on the `snapshot`, `activate_node`, and `pause_node` actions
- When `book_id` is present:
  - `author_nodes` query → add `.eq("book_id", book_id)`
  - `social_posts` count → add `.eq("book_id", book_id)`
  - `crm_contacts` lead count → add `.eq("book_id", book_id)`
  - Sequences/steps query → join through `email_flows.book_id`
- When `book_id` is absent (All Books) → behave exactly as today

### Frontend

- New hook `useMarketingHubBookContext()` — reads `useMyBooks()`, persists the active book selection in `localStorage` (key `marketing-hub:active-book-id`) plus a URL param `?book=` for shareable deep links
- New component `<MarketingHubBookSelector>` — dropdown with book covers + titles, "All Books" option, hidden when author has ≤1 book
- `MarketingHub.tsx` — pass `bookId` into `callMarketingHubState("snapshot", { book_id })` and re-fetch on selector change
- `SequencesTab.tsx`, `SocialCalendarTab.tsx`, `ContactsTab.tsx` — each receives `bookId` prop and forwards it on every `callMarketingHubState` call and direct supabase query
- `ContactsTab` direct `crm_contacts` query → add `.eq("book_id", bookId)` when set
- The "Generate sequences for all 28 nodes" button → posts `{ book_id }` so the generator only fans out for the selected book

### Activation semantics

- Activating a campaign with a book selected → only activates that book's node row (e.g. `BP-01` for Book #2 only, leaving Book #1 untouched)
- "All Books" + Activate → activates the campaign across every book the author owns (current behaviour)
- BP-03 calendar repair → scopes to the selected book

## Out of scope (call out, don't build)

- Author-level Settings tab (sender domain, defaults) stays global — correct behaviour
- `author_subscribers` stays author-wide — a subscriber who opted in via Book #1 should still receive Book #2 launch emails if the author wishes
- We do **not** rename the hub or restructure tabs

## Acceptance test

1. Pauline (1 book today) → opens Marketing Hub → sees no selector, identical experience to today
2. Pauline adds Book #2 → selector appears, defaults to "All Books" → counts match today exactly
3. Pauline picks Book #2 → all four tabs empty (no content yet); clicking "Generate sequences for all 28 nodes" generates a clean set tied to Book #2 only
4. Pauline switches back to Book #1 → her existing 13 sequences and 17 enrollments reappear, untouched
5. Pauline picks "All Books" → sees the union (Book #1 + Book #2 sequences in one list with subtle book badges on each card)
