
## Plan: Fix Buffer API host in both edge functions

**Scope:** 2 files, 1 URL change each (plus minor query/upsert additions in get-buffer-channels).

### File 1: `supabase/functions/get-buffer-channels/index.ts`
1. Change fetch URL: `https://api.bufferapp.com/graphql` → `https://api.buffer.com/graphql`
2. Extend GraphQL `channels` query to also return `serviceId`
3. `PLATFORM_MAP` already includes `youtube` → keep as-is
4. Skip writing `service_id` to DB (column may not exist in `social_connections`); keep `channel_id`/`platform`/`channel_name` upsert as today. If user wants `service_id` persisted, that's a follow-up migration.

### File 2: `supabase/functions/schedule-social-posts/index.ts`
1. Change fetch URL: `https://api.bufferapp.com/graphql` → `https://api.buffer.com/graphql` (single occurrence)
2. No other changes — mutation, scheduling, DB writes untouched.

### Out of scope
- `diagnose-buffer/index.ts` (still uses old host, but no longer needed once channels sync correctly)
- `ConnectSettings.tsx` (no UI change)
- Schema migration for `service_id`

### Test expectation after deploy
- Connect Settings → paste key → Sync → toast "Done! I found 7 connected accounts." with all 4 platforms green
- BP-03 → Activate → posts schedule successfully via Buffer
