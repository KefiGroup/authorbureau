---
name: Sprint 36b — Buffer Social Scheduling
description: Buffer GraphQL API integration for BP-03 post scheduling, surfaced as "Social Accounts" + "Social Calendar" in Marketing Hub
type: feature
---

Sprint 36b adds Buffer-backed social post scheduling to BP-03.

## Architecture
- **Buffer GraphQL endpoint:** `https://api.bufferapp.com/graphql`. Auth: `Bearer ${BUFFER_API_KEY}`.
- **Org ID:** stored in `BUFFER_ORG_ID` secret.
- **Authors never see "Buffer"** — UI uses "Social Accounts" and "Social Calendar".

## Edge functions (verify_jwt = false)
- `get-buffer-channels` — runs `channels(input: { organizationId })` GraphQL query, upserts results into `social_connections`.
- `schedule-social-posts` — extracts up to 20 posts from `author_nodes.content_json`, matches each post's platform to an active channel in `social_connections`, calls Buffer `createPost` mutation (mode: customScheduled, dueAt spaced 1.5 days apart starting tomorrow 13:00 UTC), and inserts each result into `social_posts`. Marks node as `live` when finished.

## Tables
- `social_connections (author_id, channel_id, platform, channel_name, status)` — unique on (author_id, channel_id).
- `social_posts (author_id, node_id, buffer_post_id, channel_id, platform, content, scheduled_at, status, error_message)`.

Both tables use author-scoped RLS via `author_profiles.user_id = auth.uid()`.

## BP-03 Activate flow
After successful Activate, BP-03 calls `schedule-social-posts` and shows the new ABBY message:
> "Done! I've scheduled [X] posts across your social channels. Your first post goes out tomorrow. View your Social Calendar in the Marketing Hub."

The old line "Your social media is now running automatically. Every new contact will receive your welcome sequence." is removed.

## Marketing Hub Social Calendar tab
New tab in `MarketingHub.tsx` rendering `SocialCalendarTab.tsx`:
- ABBY proactive card with last-scheduled date + "Want me to generate 20 more posts?"
- Stats: queued / published / connected accounts, plus "Sync Social Accounts" button (calls `get-buffer-channels`).
- Filter chips: All | LinkedIn | Instagram | Facebook | X.
- Post cards: platform icon, first 80 chars, status badge (Queued / Published / Failed), scheduled timestamp.
