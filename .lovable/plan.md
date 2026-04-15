

# Sprint 29 QA Fix Plan

## Root Causes Found

**BP-02 (generate-bp02-lead-magnets)**: Fails with `"Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."` — the `openai/gpt-5` model requires `max_completion_tokens`, not `max_tokens`.

**BP-03 (generate-bp03-social-media)**: Two issues:
1. Same `max_tokens` parameter error (uses `max_tokens: 32000`)
2. Hard-fails with "No book context found" because it requires `author_context` table data and has no fallback to the `books` table

## Fixes

### Fix 1 — Replace `max_tokens` with `max_completion_tokens` in both edge functions

**File**: `supabase/functions/generate-bp02-lead-magnets/index.ts` (line 262)
- Change `max_tokens: 8000` to `max_completion_tokens: 8000`

**File**: `supabase/functions/generate-bp03-social-media/index.ts` (line 146)
- Change `max_tokens: 32000` to `max_completion_tokens: 32000`

### Fix 2 — Add books table fallback in BP-03 edge function

BP-03 currently throws if no `author_context` row exists. Add a fallback:
- If no `author_context`, query `books` table using `author_profiles.user_id`
- Build context from the book record (title, description as thesis)
- Only throw if neither `author_context` nor `books` has data

### Fix 3 — Return detailed error messages from edge functions

Both functions already return `{ success: false, error: err.message }` with status 500. The issue is Supabase SDK swallows non-2xx responses. Change both functions to always return HTTP 200 with `success: false` in the body so the client can read the actual error message.

### Fix 4 — Book title in UI ("your book" vs actual title)

BP-02's edge function line 39: `const bookTitle = context?.book_title || "your book"` — after the fallback fix, this will use the actual book title from the `books` table.

### Fix 5 — Loading state on Generate button

Both builders already have loading states (step 1 with `GENERATING_MESSAGES` spinner). The issue is that the error causes an immediate crash back to step 0. With the edge function fixes, the loading state will be visible during the actual generation time. No UI changes needed — the loading state already exists.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | `max_tokens` → `max_completion_tokens`, return HTTP 200 always |
| `supabase/functions/generate-bp03-social-media/index.ts` | `max_tokens` → `max_completion_tokens`, add books fallback, return HTTP 200 always |

## What Does NOT Change
- No UI component changes needed
- No database migrations
- No new edge functions
- Brand Products, sidebar, dashboard untouched

## Deploy
Both edge functions need redeployment after changes.

