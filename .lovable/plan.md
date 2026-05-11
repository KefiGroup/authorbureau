## Goal

Stop Pauline (and every author) from activating BP-03 or hitting Post Now / Schedule before they've connected at least one social account in **Connect Settings**. Add a persistent dashboard nudge until they do.

## Single source of truth

A new hook `useSocialConnectionStatus()` reads `social_connections` for the logged-in user and returns:

```ts
{ loading, connectedPlatforms: string[], hasAnyConnection: boolean }
```

All three gate points consume this hook so behaviour can never drift.

---

## Gate 1 — BP-03 Builder Activate (hard block)

File: `src/components/dashboard/builders/bp03/BP03Builder.tsx`

- Replace the existing ad-hoc `connectedPlatforms` query with the new hook.
- On the **Review / Activate** step, when `hasAnyConnection === false`:
  - Render an amber warning card above the Activate button:
    > **Connect a social account to activate.** Your kit is ready, but Authors Bureau can't auto-publish or schedule posts until you connect LinkedIn, Facebook Page, or Instagram Business.
    >
    > [ Connect accounts → ] (navigates to `/connect-settings`)
  - Disable the Activate button (`disabled` + muted style + tooltip: "Connect at least one account first").
- `handleActivate()` adds a defensive guard: if `!hasAnyConnection`, toast the same message and `return` early — protects against any stale enabled state.

## Gate 2 — Marketing Hub Social Calendar (hard block per-action)

File: `src/components/marketing-hub/SocialCalendarTab.tsx` (and the row card subcomponent that renders Schedule / Post Now).

- Top of the tab: if `!hasAnyConnection`, render the same amber banner with a **Connect accounts** CTA. This sits above the calendar grid.
- Per-post buttons:
  - **Post Now** and **Schedule** become `disabled` when the post's `platform` is not in `connectedPlatforms`.
  - Hover tooltip: "Connect {Platform} in Connect Settings to enable this."
  - **Copy** stays enabled in all cases (manual fallback).
- No backend change — the existing `social-publish` 400 ("No connected …") becomes unreachable from the UI but stays as the server-side safety net.

## Gate 3 — Dashboard banner (persistent nudge)

File: `src/components/dashboard/DashboardOverview.tsx` (or the existing banner stack near `OnboardingBanner`/`AbbyNextStepCard`).

- New small component `ConnectSocialAccountsBanner` shown when:
  - User is an author, AND
  - `hasAnyConnection === false`, AND
  - At least one BP-03 node exists for the author with `status='live'` OR there are unscheduled posts in `social_media_content` (i.e. they actually have content waiting). This avoids nagging brand-new accounts.
- Copy:
  > **Your social posts are waiting.** Connect LinkedIn, Facebook Page, or Instagram Business to start auto-publishing. → **Connect accounts**
- Dismissible per session (sessionStorage flag), but reappears on next login until they connect.

## What we are NOT changing

- `social-publish` and `social-scheduler` edge functions stay as-is (already fail safely).
- `hasRequiredAssets()` / X-of-28 counter is **untouched** — connecting a social account is a publishing prerequisite, not a node-readiness gate (same separation rule we use for Stripe).
- No DB migration needed.

## Files touched

- New: `src/hooks/useSocialConnectionStatus.ts`
- New: `src/components/dashboard/ConnectSocialAccountsBanner.tsx`
- Edited: `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- Edited: `src/components/marketing-hub/SocialCalendarTab.tsx` (+ its post-row child component)
- Edited: `src/components/dashboard/DashboardOverview.tsx` (mount banner)

## Acceptance check

1. As Pauline with zero `social_connections`: open BP-03 → Review step shows amber banner, Activate is disabled.
2. Click "Connect accounts" → lands on Connect Settings.
3. After connecting LinkedIn only: BP-03 Activate enables; in Social Calendar, LinkedIn post buttons enable, Facebook/IG/X stay disabled with tooltip; Copy works for all.
4. Dashboard banner disappears once `hasAnyConnection` flips true.
