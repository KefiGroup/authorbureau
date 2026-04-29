# Why the portal feels slow

Looking at your live console logs, the same warning is repeating every few seconds:

```
@supabase/gotrue-js: Lock "lock:authorsbureau-shared-auth"
acquisition timed out after 10000ms.
```

This is the real cause of the slowness — not the network, not the database, not your AI generators. Here's what's happening in plain English:

1. Your app uses a **shared login session** with PublishNow (so users only log in once across both products).
2. To keep that session safe across multiple browser tabs, the auth library puts a **lock** around every read of the session.
3. When you click a button (Open My Funnels, Open BA-10, Save, Publish, etc.), the page tries to read the session **multiple times in parallel** — for the page itself, for each widget, for each data fetch.
4. Those reads pile up behind the lock. The first one succeeds quickly, but the rest **wait up to 10 seconds each** before timing out and falling back.
5. The result: every click feels like it freezes for 3–10 seconds before anything happens.

We already partially fixed this in `getActiveToken()` (it races a 2-second timeout against the lock and falls back to the cached token). But **41 other files still call `supabase.auth.getSession()` or `auth.getUser()` directly** — those calls all hit the lock with no timeout, which is what produces the 10s warnings you see in the logs.

# The plan — make the portal snappy

## Section 1 — What you'll notice as a user

- Clicking any button in the dashboard, Marketing Hub, Book Hub, My Funnels, BA/BP/YR builders feels **instant** instead of waiting 3–10 seconds.
- The "Lock acquisition timed out" warnings disappear from the console.
- No change to how login, security, or your data works — only how fast things respond.

## Section 2 — What we'll change (technical)

### Fix 1 — Stop bypassing the timeout-protected token helper (biggest win)

Replace every direct `supabase.auth.getSession()` / `supabase.auth.getUser()` call across the 41 files with the existing safe helper `getActiveToken()` (which already times out at 2s and falls back to the cached token).

Files to update include the high-traffic ones:
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/dashboard/BuildMyBusiness.tsx`, `BusinessPlanActions.tsx`, `SavedBusinessPlan.tsx`, `FullPlanDialog.tsx`
- `src/components/dashboard/social-media/*` (4 files)
- `src/components/dashboard/podcast/*` (3 files)
- `src/components/dashboard/EmailMarketing.tsx`, `ManuscriptUpload.tsx`, `ProfileEditor.tsx`, `AudiobookStudio.tsx`, `SocialMediaManager.tsx`, `PodcastManager.tsx`, `FrameworkInterviewModal.tsx`
- `src/pages/AuthorBookPage.tsx`, `AuthorProductPage.tsx`, `AuthorSite.tsx`, `AuthorSubpageResolver.tsx`, `AbbyCoachPage.tsx`, `ConnectSettings.tsx`, `PurchaseSuccess.tsx`, `ReaderPortal.tsx`, `ReaderContentViewer.tsx`, `ReadersBureau.tsx`, `OnlineCourseViewer.tsx`, `SocialAuthCallback.tsx`
- `src/hooks/useAbbyPlan.ts`, `useBuilderGeneration.ts`, `useMarketResearch.ts`
- `src/lib/admin-api.ts`, `src/lib/publishnow-redirect.ts`
- `src/components/AbbyHelpChatbot.tsx`, `src/components/DualModeBookForm.tsx`

### Fix 2 — Add a tiny in-memory user cache to the auth context

Today, components that need the current `user.id` often re-call `auth.getUser()` even though `useAuth()` already has it. We'll expose a `getCurrentUserId()` helper that reads from the existing `AuthContext` without touching the lock at all.

### Fix 3 — Coalesce duplicate session reads

When 5 widgets mount simultaneously and each calls `getActiveToken()`, the lock contention spikes. We'll add a 250ms in-flight de-duplicator inside `getActiveToken()` so 5 concurrent callers share **one** session lookup instead of 5.

### Fix 4 — Reduce the gotrue lock timeout from 10s → 2s

In `src/lib/shared-backend.ts`, pass `lockAcquireTimeout: 2000` to the auth client config. If the lock can't be acquired in 2s, the call fails fast and our fallback kicks in immediately. (Worst-case wait drops from 10s to 2s.)

### Fix 5 — Cache `has_role` admin check

`useAuth` calls `supabase.rpc("has_role")` on every page load. We'll cache the result in `localStorage` with a 5-minute TTL (same pattern already used for the subscription tier), so admin status is resolved instantly on subsequent navigations.

## Section 3 — How we'll verify the fix

1. Open DevTools console, watch for `Lock ... acquisition timed out` warnings — should drop to **zero**.
2. Click through: Dashboard → My Funnels → STEP 3 Checkout → Marketing Hub → Social Calendar → Book Hub → BA-10 builder. Each transition should feel **immediate** (<300ms perceived).
3. Confirm login still works on a fresh browser (no cached session) and on a returning visit (cached session restored).
4. Confirm the existing PublishNow ↔ Authors Bureau single-sign-on still flows both ways.

## Section 4 — Out of scope (for this round)

- No changes to how AI generation works (those are slow because the AI itself takes 30–90s — that's separate).
- No changes to your database, edge functions, or Stripe flow.
- No visual/UI changes.

## Risk

Low. Every change is a drop-in replacement of one auth call with a safer version of the same call. The fallback path (cached token) is already exercised today whenever the lock times out — we're just making it the fast path instead of the 10s-later path.
