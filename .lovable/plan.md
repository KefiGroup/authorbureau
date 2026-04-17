
Plan approved previously. Implement the 3 fixes, then after deploy I'll pull logs.

## Implementation

### 1. `supabase/functions/schedule-social-posts/index.ts`
Add structured logging with `[schedule]` prefix at every step:
- Start: `author_id`, `node_id`
- Posts extracted count
- Connections fetched: count + platform list
- Platform→channel map contents
- Per post: index, platform, channelId, dueAt
- Buffer HTTP status + raw body (when non-200 or no postId)
- Full GraphQL response when `bufferPostId` is null
- `social_posts` insert errors logged with PG error
Return `errors: string[]` in response payload.
Keep URL, mutation, mapping, and table writes unchanged.

### 2. `src/pages/ConnectSettings.tsx`
After existing `loadConnections(authorId)` in `handleSync`, add 600ms delayed second `loadConnections` call to catch DB read-replica lag.

### 3. `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- Update success toast/ABBY message at the activate handler (~line 317):
  - Success: `"Done! I've scheduled ${scheduledCount} posts across your connected social accounts. Your first post goes out tomorrow. View your Social Calendar in the Marketing Hub to see the full schedule."`
  - 0 channels / failure: `"Your kit is saved. Connect your social accounts in Connect Settings first, then come back and click Activate to schedule your posts."`
- Update fallback at line ~472 to the same "kit saved, connect first" copy.

## Post-deploy diagnostics
After implementation deploys, I will:
1. Deploy `schedule-social-posts` explicitly.
2. Wait for user's Activate click.
3. Pull `supabase--edge_function_logs` for `schedule-social-posts`.
4. Report: connection count, per-post Buffer responses, insert success/failure — all proactively in the same turn.

## Out of scope
No DB migrations. No changes to `get-buffer-channels`, sidebar, or other builders.
