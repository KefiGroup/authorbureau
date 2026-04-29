# Audit Re-verification & Fixes

I re-tested every finding against the live preview and database before planning. Result: **4 real bugs, 3 stale audit observations, 2 already-passed.**

## Verified working (audit was stale)

| # | Audit claim | Reality |
|---|---|---|
| BA-14 podcast 404 | `/pauline-teo/podcast` renders the full podcast microsite ("Be SUCKcessful with Pauline Teo", Notify-Me form). `get-microsite-page` returns 200. |
| BA-15 press 404 | `/pauline-teo/press` likewise returns 200 with full press kit. |
| BA-10 no Buy button | `/pauline-teo/online-course` shows **"Enrol Now $297"** button (verified). |
| BA-12 "Coming Soon" | `/pauline-teo/membership` shows **"Join Now $27/month"** button (verified). |

All four resolve through `SLUG_TO_NODE` → `MicrositePage` → `get-microsite-page` (status 200, content_json populated, `activated=true`). No code change needed; auditor likely tested before Sprint 6/41 deploy completed.

## Real bugs to fix

### 1. BA-11 Audiobook Studio — "No manuscript found" (Critical)
**Root cause:** `AudiobookStudio.tsx` queries `generated_assets` directly via the project Supabase client. RLS requires `author_id = auth.uid()`, but Pauline is signed in via the **shared backend** (PublishNow JWT), so `auth.uid()` resolves to NULL on Cloud Postgres → 0 rows. DB confirms her book has `source_material` (100k chars).

**Fix:** Add a new `get-book-manuscript` edge function (service-role + dual-token verification, mirroring `list-my-books`). `AudiobookStudio.loadManuscript()` calls it instead of querying the table.

### 2. "Could not load your books" on My Books Hub (Critical)
**Root cause:** Same auth-bridge race. `MyBooks.fetchBooks()` runs immediately on mount; if `getActiveToken()` returns null because the shared session hasn't restored yet, `list-my-books` 401s and the user sees the red error.

**Fix:** Gate `fetchBooks` on `useAuthReady().isReady && user` (the hook already exists). Show the loading skeleton until auth is ready instead of throwing the toast.

### 3. Stale onboarding banner for existing authors (Medium)
**Root cause:** `OnboardingBanner` at `AuthorDashboard.tsx:619` always renders for `activeSection === "my-books"` regardless of book count.

**Fix:** Wrap it in `{!hasBooks && <OnboardingBanner ... />}`. Same conditional for the profile banner using `stats.bookCount === 0 && !profileComplete`.

### 4. Session timeout shows onboarding screen instead of book hub (Medium)
**Root cause:** `useAuthorStats` returns `DEFAULT_STATS` (bookCount=0) when the token fetch fails or the session expires mid-session. This flips `hasBooks=false` → new-user gates appear.

**Fix:** In `useAuthorStats`, if `getActiveToken()` returns null OR the response is 401, **keep the cached stats** (`cachedStats`) instead of resetting; surface a `staleAuth` flag so `AuthorDashboard` renders the previous state, not the empty-state UI.

### 5. Payout schedule wording (Medium)
**Root cause:** Two strings in `ConnectStripePage.tsx` (lines 24 & 58) say "on Stripe's standard payout schedule" / "Stripe's standard schedule". Per business rule, Authors Bureau is Merchant of Record and pays out **monthly**.

**Fix:** Replace both with: *"…and your 92% share is paid out **monthly by Authors Bureau** to your connected Stripe account."* Also sweep `RevenueDashboard.tsx`, `SubscriptionPricing.tsx`, `generate-annual-statements/index.ts` for the same phrase.

## Already passing (no work)
- 8% / 92% fee messaging — verified across UI + edge functions.
- Connect Stripe page — verified.

## Technical detail

**New edge function** `supabase/functions/get-book-manuscript/index.ts`:
- POST `{ book_id }`
- Dual-token auth (Cloud → shared-backend fallback, copy pattern from `list-my-books`)
- Verify ownership: `books.author_id = userId` OR `books.owner_email = userEmail`
- Service-role read of `generated_assets` where `book_id = $1 AND asset_type = 'source_material'`, ordered by `updated_at DESC LIMIT 1`
- Returns `{ content: string | null }`

**Files to edit**
- `supabase/functions/get-book-manuscript/index.ts` (new)
- `src/components/dashboard/AudiobookStudio.tsx` — replace `loadManuscript` query with edge-function call
- `src/components/dashboard/MyBooks.tsx` — gate fetch on `useAuthReady`
- `src/pages/AuthorDashboard.tsx` — conditional onboarding banners
- `src/hooks/useAuthorStats.ts` — preserve cache on auth failure
- `src/components/dashboard/ConnectStripePage.tsx` — payout wording (lines 24, 58)
- Sweep + minor edits for "standard schedule" elsewhere.

No DB migrations required.
