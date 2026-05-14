# Veronica Tan — Account Health Check ✅

**Verdict: Fully functioning. No remediation required.**

## What was checked

| Area | Status | Detail |
|---|---|---|
| Author profile | ✅ | `dd5e638d-8680-49b8-9c9b-283f5985b5d6` · pen name "Veronica Tan" · slug `veronica-tan` |
| Auth (shared backend) | ✅ | Logs in via PublishNow user `96dd5490…` (email `veronicagogetter320@gmail.com`) |
| Subscription tier | ✅ | **Yield** — Stripe sub `sub_1TUep4Ck4r0emyO8SbpVsbli` active, customer `cus_UTc3jzj5tM1AK0`, synced to `author_profiles.subscription_tier` |
| `check-subscription` edge fn | ✅ | Multiple successful calls in last 5 min — resolves user, finds Stripe customer, syncs tier |
| CRM sync | ✅ | `sync-stripe-subscriber-to-crm` updating contact `fe25eb81…` cleanly |
| Directory | ✅ | `directory_status: verified` |
| Book | ✅ | "The 4AM Club For Mums" — `approval_status: approved`, `published_at: 2026-05-14` |
| Profile content | ✅ | Bio (long + short), photo, location, website, socials all populated |
| Ghost author flag | ✅ | Will be cleared by the new `admin-list-ghost-authors` edge fn (deployed last turn) — she's no longer flagged |

## The one "quirk" (by design, not a bug)

Her `user_id` (`96dd5490…`) is **not** in the Cloud `auth.users` table — it's a **shared-backend (PublishNow) user id**. Sprint 8 / Sprint 44 architecture: authors authenticate against the shared backend; Cloud reconciles by **email**, not raw user_id. That's exactly why the old `admin_list_ghost_authors` SQL RPC mis-flagged her, and why the replacement edge function (deployed last turn) reconciles against shared-backend emails.

## What's NOT set up (optional, not broken)

- **0 of 28 nodes are `live`** — she hasn't built/published any Brand/Build/Yield nodes yet. This is normal for a new Yield subscriber; nothing to fix on the platform side.
- `stripe_connected_account_id` is null — she hasn't connected Stripe Express for payouts. Only relevant if/when she sells products through her microsite.
- `onboarding_completed: false` and `has_seen_journey_onboarding: false` — she hasn't walked through the onboarding card yet, but this doesn't block anything.

## Recommendation

No code changes. If you want, I can:
1. **Spot-check her public microsite** (`/author/veronica-tan/...`) by hitting it in the browser to confirm rendering, or
2. **Trigger a one-off `check-subscription` + `sync-stripe-subscriber-to-crm`** to re-confirm the full chain end-to-end.

Otherwise this is a clean account.
