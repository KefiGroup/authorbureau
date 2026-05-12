## Goal
Two related fixes so authors never feel lost in the social posting flow:

1. **Pick which Facebook Page to connect** (instead of silently grabbing the first one).
2. **Make the whole "connect → schedule → publish" journey visible** with status, next-step prompts, and clear feedback at every stage.

---

## Part 1 — Facebook Page picker

Today, when an author connects Facebook, the callback grabs `pagesJson.data[0]` automatically. If they admin multiple Pages (or the wrong one is first), they get the wrong account silently.

**What changes**
- `social-connect-callback` (Facebook + Instagram path):
  - If `pagesJson.data.length > 1` AND no `page_id` was supplied in the request, return `{ success: false, needs_page_selection: true, pages: [{id,name,picture}], temp_token }` instead of saving.
  - Cache the user-access-token + state under a short-lived row keyed by `temp_token` (5 min TTL) so the next call can complete without a second OAuth round trip.
  - When called again with `{ temp_token, page_id }`, look up the cached token, fetch that page's access token + IG business account, and upsert as today.
- `SocialAuthCallback.tsx`:
  - When the response is `needs_page_selection`, navigate to `/connect-settings?social=pick-page&platform=...&token=...` with the page list passed via `sessionStorage` (avoids long URLs).
- `ConnectSettings.tsx`:
  - New "Choose your Facebook Page" modal (radio list with page name + thumbnail + Confirm button).
  - On confirm, POST `{ temp_token, page_id }` back to `social-connect-callback`, then show the existing green success banner with the chosen page name.
- Single-page authors keep the current zero-click flow (no modal shown).

---

## Part 2 — End-to-end feedback loop

The author journey today:

```
BP-03 builder → "Activate" → Connect Settings → OAuth → ??? → Marketing Hub → ??? → Posted?
```

After OAuth they land back on Connect Settings with no signpost to the Calendar, no proof a scheduled post will actually fire, and no record of what was posted. We will close every gap.

### 2a. After successful connect
- Replace the static green banner with a **two-step "What's next" card**:
  - Step 1 ✓ "Connected as {Page Name}"
  - Step 2 → "Open your Social Calendar to review and schedule your posts" with a primary `Open Social Calendar` button (deep-links to `/dashboard?section=marketing-hub&tab=social-calendar`).
- If the author arrived from BP-03, also show a "Return to BP-03" link.

### 2b. In the Social Calendar (`SocialCalendarTab.tsx`)
- Add a **status legend + per-post status pill** with five states sourced from `social_posts.status`:
  - `draft` (grey), `scheduled` (blue + scheduled time), `posting` (amber spinner), `posted` (green + "Posted {time}" + external-link to live URL when `external_url` exists), `failed` (red + tooltip with `last_error`).
- New top-of-tab **summary strip**: `X scheduled · Y posted this week · Z failed (Retry all)`.
- Each calendar day cell shows a small dot per post colored by status so the author sees at-a-glance progress without opening a day.
- "Schedule" and "Post now" buttons disabled with a clear tooltip when the relevant platform is not connected, plus an inline "Connect {platform}" link.

### 2c. Publishing pipeline transparency
- `social-publish` / `social-scheduler` already write `status`, `posted_at`, `external_url`, `last_error`. Surface those:
  - On a successful publish, fire a Sonner toast "Posted to {platform}" with a "View post" action (opens `external_url`).
  - On failure, toast red "Couldn't post to {platform}" + "Open Calendar" action that scrolls to the failed post.
- New **"Recent activity" panel** in the Calendar sidebar: last 10 social_posts events (posted/failed/scheduled) with timestamp, platform icon, and link.

### 2d. Notifications (lightweight)
- Reuse the existing `notifications` table (already used for book.approved etc.):
  - On `posted`: insert a notification "{platform} post is live" linking to `external_url`.
  - On `failed`: "{platform} post failed — tap to retry" linking to the Calendar with the post highlighted.
- This means the bell icon in the dashboard becomes the global feedback channel even when the author is on another tab.

### 2e. Dashboard at-a-glance card
- Add a small "Social posting" tile to the dashboard overview showing: connected platforms, next scheduled post (date + platform), and any failed posts needing attention. Click → Calendar.

---

## Expected result
- Multi-Page authors pick the right Facebook Page during connect.
- After connecting, the author sees exactly what to do next and one click takes them there.
- In the Calendar they always know which posts are draft / scheduled / posted / failed, with timestamps and links to the live post.
- Failures and successes generate toasts + bell notifications so the author is never wondering "did it actually post?"
- A dashboard tile gives a global pulse on social posting without opening the Calendar.

## Files to change
- `supabase/functions/social-connect-callback/index.ts` (page-selection branch + temp-token cache)
- `supabase/migrations/*` — new `social_connect_pending` table (`temp_token`, `user_id`, `user_access_token`, `pages_json`, `expires_at`) with RLS limited to service role
- `src/pages/SocialAuthCallback.tsx` (handle `needs_page_selection`)
- `src/pages/ConnectSettings.tsx` (page-picker modal + new "What's next" card)
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` (status pills, summary strip, day-cell dots, Recent activity panel, disabled-state tooltips)
- `supabase/functions/social-publish/index.ts` and `social-scheduler/index.ts` (insert into `notifications` on success/failure; ensure `external_url` + `last_error` always written)
- `src/components/dashboard/OverviewTab` (or equivalent) — new Social posting tile

## Out of scope
- Adding new platforms.
- Changing the BP-03 generation flow itself.
- Any visual redesign of the Calendar grid beyond the status affordances above.
