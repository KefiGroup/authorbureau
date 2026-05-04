## Why this happens (and why BP-02 is unaffected)

On Safari, when you refresh a deep link, the shared-backend session cookie/localStorage takes longer than the React tree's first render. Every component that does:

```ts
const { user } = useAuth();
useEffect(() => {
  if (!user) return;
  // …query data…
}, [user]);
```

…fires its data effect with `user = null` once, gets back nothing, and renders the empty / fallback / "go set up your profile" UI. By the time the session resolves, the effect doesn't re-run because `user` is now stable. The page **looks** like the dashboard reset, but really it's just every individual page resolving to its empty state.

`BP-02` is the only screen that already gates on `useAuthReady().isReady` (which waits for the shared session restore to fire `INITIAL_SESSION`), which is why it survives the refresh.

## Fix — make `useAuthReady` the universal mount gate

Apply one mechanical pattern to every page that loads user-scoped data:

```ts
const { user, isReady } = useAuthReady();   // ← was useAuth()
useEffect(() => {
  if (!isReady) return;     // wait for Safari to finish session restore
  if (!user) return;        // truly signed out
  // …existing query…
}, [user, isReady, /* other deps */]);
```

And while loading, render the existing skeleton instead of the empty / "no data" state. Specifically: if `!isReady`, return the page's loading skeleton; only render "no data" when `isReady && !data`.

For pages that gate on a fetched profile id (CRM, Funnels, Library, Marketing Hub), keep the local `loading` state initialized to `true` and only set it to `false` once the actual fetch resolves — never inside an early `if (!user) return` branch.

## Files to update

### Builders (28 — same as previously approved)

```text
src/components/dashboard/builders/bp01/BP01Builder.tsx
src/components/dashboard/builders/bp03/BP03Builder.tsx   (extend dep array w/ activeBookId)
src/components/dashboard/builders/bp04/BP04Builder.tsx
src/components/dashboard/builders/bp05/BP05Builder.tsx
src/components/dashboard/builders/bp06/BP06Builder.tsx
src/components/dashboard/builders/bp07/BP07Builder.tsx
src/components/dashboard/builders/bp08/BP08Builder.tsx
src/components/dashboard/builders/bp09/BP09Builder.tsx
src/components/dashboard/builders/ba10..ba18/*Builder.tsx
src/components/dashboard/builders/yr19..yr28/*Builder.tsx
```

For each:
1. `useAuthReady` gate before the resume effect.
2. Add `isAuthReady` and `activeBookId` to the dep array.
3. Initial `step = -1` and render skeleton while `step === -1`.
4. Prefer `loadBuilderDraft()` first; direct `author_nodes` read only as fallback.
5. Never `setStep(0)` on a thrown error — only on a confirmed empty draft + empty fallback.

### Dashboard pages

Same `useAuthReady` swap + skeleton-while-`!isReady` pattern:

```text
src/components/dashboard/AuthorCRMPage.tsx
src/components/dashboard/AuthorMessagesPage.tsx
src/components/dashboard/FunnelsHub.tsx
src/components/dashboard/MarketingHub.tsx
src/components/dashboard/MyBooks.tsx
src/components/dashboard/ReviewProductsPage.tsx
src/components/dashboard/PayoutSettingsPage.tsx
src/components/dashboard/RevenueDashboard.tsx
src/components/dashboard/MicrositeManager.tsx
src/components/dashboard/EmailMarketing.tsx
src/components/dashboard/SocialMediaManager.tsx
src/components/dashboard/AudiobookStudio.tsx
src/components/dashboard/CoachingCRM.tsx
src/components/dashboard/ProfileEditor.tsx
src/components/dashboard/AuthorReadingClub.tsx
```

### Standalone pages

```text
src/pages/AuthorLibrary.tsx        (currently uses [] dep array — add user/isReady)
src/pages/BookHub.tsx              (already gates on authLoading; add isReady to fetchBook deps)
src/pages/AbbyCoachPage.tsx
src/pages/AccountSettings.tsx
src/pages/ConnectSettings.tsx
src/pages/EarningsDashboard.tsx
src/pages/AdminPayouts.tsx
src/pages/admin/ContentQualityLog.tsx
```

### One supporting helper

`src/hooks/useAuth.tsx` exposes `loading` but not `isReady`. The fix uses `useAuthReady()` (already in the codebase, already correctly listens to `INITIAL_SESSION`). No edit needed there.

## Out of scope

- No DB migrations.
- No edge function changes.
- The earlier `App.tsx ProtectedRoute` redirect-preservation fix and the `useAuth` 8s timeout stay as-is.
- Public pages (microsites, directory, reading club guest views) are unaffected — they don't read user-scoped data on mount.

## Verification (Safari, published site)

Sign in, navigate into each of these, then hit Cmd-R:

1. Builder: `/node-builder/BP-01?bookId=…` (and a BA + a YR node)
2. CRM: `/dashboard?section=author-crm`
3. Funnels: `/dashboard?section=my-funnels`
4. Library: `/dashboard?section=library`
5. Marketing Hub: `/marketing-hub`
6. Messages: `/dashboard?section=messages`
7. Revenue Dashboard: `/revenue-dashboard`
8. Book Hub: `/dashboard/book/<id>?tab=revenue-streams`

Each page must stay on its own URL with its data populated, never flash to "no data" or bounce to `/dashboard`.
