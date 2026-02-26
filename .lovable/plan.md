

# PublishNow "My Books" Cross-Platform Integration Plan

This plan addresses all 8 checklist items from the PublishNow integration notes.

---

## Changes Overview

### 1. Add `/my-books` route (App.tsx)
- Add a new route `/my-books` that renders the AuthorDashboard with `my-books` as the active section
- This supports the SSO redirect from PublishNow: `/sso?token=...&redirect=%2Fmy-books`

### 2. SSO page honors `redirect` query parameter (SSO.tsx)
- Currently SSO always redirects to `/dashboard` after session establishment
- Change it to read `redirect` from URL search params and navigate there instead (default `/dashboard`)

### 3. AuthorDashboard accepts initial section from URL (AuthorDashboard.tsx)
- When navigated to `/my-books`, the dashboard should open with the "my-books" tab active
- Add logic to detect the `/my-books` path and set `activeSection` accordingly on mount

### 4. Update `save-book` edge function (save-book/index.ts)
Major changes to support cross-platform book push:

**New authentication path: `platform_secret`**
- If request body contains `platform_secret`, validate it against `CROSS_PLATFORM_SECRET` env var
- Resolve `author_id` by looking up user via `email` field in the shared backend
- Skip JWT auth entirely for this path

**Honor `entry_mode` from payload**
- Use `body.entry_mode` if provided, fall back to `"manual"`

**Honor `auto_publish`**
- If `body.auto_publish === true`, set `published_at = now()`

**Handle duplicate slugs for cross-platform**
- For `platform_secret` auth: if slug already exists for same author, return existing book ID instead of error 409
- For JWT auth: keep existing behavior (reject duplicates)

**Accept nested `book` object**
- PublishNow sends data nested under a `book` key; extract fields from `body.book` if present

### 5. MyBooks UI badge for PublishNow books (MyBooks.tsx)
- Already implemented: `getSourceLabel` returns "PublishNow.io" for `entry_mode === "publishnow"`
- Already implemented: `getSourceColor` returns secondary styling for publishnow/imported
- No changes needed here

---

## File Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/my-books` route pointing to AuthorDashboard |
| `src/pages/SSO.tsx` | Read `redirect` param, navigate to it after session success |
| `src/pages/AuthorDashboard.tsx` | Detect `/my-books` path and set initial active section |
| `supabase/functions/save-book/index.ts` | Add `platform_secret` auth path, honor `entry_mode`, `auto_publish`, handle nested `book` object, smart duplicate handling |

---

## Technical Details

### save-book authentication flow (updated)

```text
Request received
  ├─ body.platform_secret exists?
  │   ├─ YES → validate against CROSS_PLATFORM_SECRET
  │   │        → look up user by body.email in shared backend auth
  │   │        → use that user ID as author_id
  │   │        → extract book fields from body.book (nested)
  │   │        → use body.book.entry_mode (or "publishnow")
  │   │        → if body.book.auto_publish → set published_at = now()
  │   │        → duplicate slug + same author → return existing book
  │   │        → duplicate slug + different author → append random suffix
  │   └─ NO  → existing JWT dual-auth flow (unchanged)
  │           → entry_mode = body.entry_mode || "manual"
  │           → duplicate slug → reject 409
  └─ Insert book → return { id, slug }
```

### SSO redirect flow

```text
PublishNow sidebar → "My Books" click
  → SSO handoff generates token
  → Redirect to: /sso?token=XXX&from=publishnow&redirect=%2Fmy-books
  → SSO.tsx validates token, establishes session
  → Reads redirect param → navigates to /my-books
  → /my-books route renders AuthorDashboard
  → AuthorDashboard detects /my-books path → sets activeSection="my-books"
```

### Duplicate slug strategy for cross-platform push

When `platform_secret` auth is used:
- Query by slug AND author_id — if match found, return existing `{ id, slug }` (idempotent)
- Query by slug with different author — append `-2`, `-3` etc. to slug

