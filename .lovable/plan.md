
The user wants native direct integrations to LinkedIn / Facebook / Instagram / X — no Buffer. I need to be honest about what each platform actually allows in 2026, since several of them have hard policy/technical blockers that no amount of code can bypass.

Let me lay out the reality per network, then propose a concrete native build.

## Platform-by-Platform Reality Check (2026)

| Platform | Auto-publish from 3rd-party app? | What it costs / requires | Verdict |
|---|---|---|---|
| **LinkedIn** | ✅ Yes | OAuth 2.0 + `w_member_social` scope. Free. Posts to personal profile or Company Page. Stable API. | **Fully automatable** |
| **Facebook Pages** | ✅ Yes | Meta Graph API + `pages_manage_posts` + `pages_read_engagement`. App must pass Meta App Review (~1–3 weeks). Posts to **Pages only**, not personal profiles (Meta killed personal-profile posting in 2018). | **Automatable to Pages only** |
| **Instagram Business/Creator** | ✅ Yes (with caveats) | Instagram Graph API via a connected Facebook Page. Account must be **Business or Creator** (not personal). Image/video must be hosted at a public URL. Stories & Reels supported, carousels supported. Same Meta App Review required. | **Automatable for Business accounts only** |
| **Instagram Personal** | ❌ No | Meta blocks all third-party publishing to personal IG accounts. Period. | **Manual only** |
| **X / Twitter** | ⚠️ Yes but paid | X API v2 requires **Basic tier minimum = $200/month** as of 2024. Free tier allows ~17 posts/day total across the whole app, not per user. | **Automatable only if author or platform pays $200+/mo** |
| **TikTok** | ⚠️ Limited | Content Posting API exists but requires audit + only posts as drafts to user's inbox for personal accounts; full direct-post needs approval. | **Semi-automatable** |
| **Threads** | ✅ Yes | Threads API via Meta, similar review process. | **Automatable** |

### Bottom line
- **LinkedIn + Facebook Page + Instagram Business**: real native auto-posting is possible. This is the realistic MVP.
- **X/Twitter**: only viable if we accept the $200/mo X API cost OR keep it manual ("Copy & open X").
- **Personal Instagram, personal Facebook**: Meta forbids it. Will always be manual.

## Proposed Native Build (no Buffer)

### Scope
1. **LinkedIn** — full native OAuth + auto-publish to personal profile and/or Company Page.
2. **Facebook Pages** — full native OAuth + auto-publish to selected Page.
3. **Instagram Business** — auto-publish via the connected Facebook Page (Meta requires this pairing).
4. **X / Twitter** — keep manual ("Copy + Open X") for now, with a clear note explaining the $200/mo API cost. Can be upgraded later if you decide to pay.
5. **Personal IG/FB** — keep manual with a one-tap "Copy + Open app" button.

### Architecture

**New tables**
- `social_connections` (author_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, page_id, ig_business_id, scopes, status)
- `social_posts` already exists from earlier sprint — we'll add `published_post_url`, `published_post_id`, `publish_error`.

**New edge functions (all `verify_jwt = true`)**
- `social-connect-start` — generates OAuth URL per platform, returns it.
- `social-connect-callback` — receives code, exchanges for token, stores connection.
- `social-publish` — invoked by scheduler. Routes to the right platform handler.
- `social-scheduler` — pg_cron job runs every 5 min, finds `social_posts` with `scheduled_at <= now()` and `status='ready'`, calls `social-publish`.

**Frontend**
- New "Connect Accounts" panel inside Marketing Hub → Social Calendar. Shows each platform with Connect / Connected / Reconnect state, plus realistic capability badges (e.g. "LinkedIn — auto-post", "X — manual only").
- Calendar post cards get a status chip: `Scheduled` → `Published` (with link) or `Failed` (with retry).

### Required secrets (you'll need to create developer apps)
| Secret | Where to get it |
|---|---|
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | linkedin.com/developers — instant |
| `META_APP_ID` / `META_APP_SECRET` | developers.facebook.com — covers FB + IG. Requires App Review for production. |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` (optional) | developer.x.com — only if you decide to pay $200/mo |

I'll request these via the secret tool once you approve.

### Phasing
- **Phase 1 (this sprint)**: LinkedIn end-to-end. Fastest, no app review, immediate value.
- **Phase 2**: Meta (FB Page + IG Business). Code is ready immediately, but goes live after Meta App Review approval.
- **Phase 3 (optional)**: X paid tier if you greenlight the cost.

### Files to create / change
- `supabase/migrations/...` — `social_connections` table + columns on `social_posts`.
- `supabase/functions/social-connect-start/index.ts` (new)
- `supabase/functions/social-connect-callback/index.ts` (new)
- `supabase/functions/social-publish/index.ts` (new)
- `supabase/functions/social-scheduler/index.ts` (new) + pg_cron schedule
- `src/components/dashboard/marketing-hub/SocialConnectionsPanel.tsx` (new)
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — show publish status, auto vs manual badges
- `src/pages/ConnectSettings.tsx` — replace "Manual posting" badges with real connect buttons

### What I will NOT promise
- Auto-posting to personal Instagram or personal Facebook profiles (Meta forbids).
- Free X auto-posting at any meaningful volume (X charges).
- Skipping Meta App Review (required by Meta, not by us).

If you approve, I'll start with **Phase 1 (LinkedIn native)** end-to-end so you can see real auto-posts within this sprint, then queue Meta right after.
