## Problem
After choosing the Facebook Page, the callback fails with `there is no unique or exclusion constraint matching the ON CONFLICT specification`.

The `social-connect-callback` edge function does:
```
.upsert(..., { onConflict: "author_id,platform,account_id" })
```
But the `social_connections` table only has this unique constraint:
```
UNIQUE (author_id, channel_id)
```
Postgres requires `onConflict` columns to match an actual unique/exclusion constraint, so the upsert blows up before any row is written.

## Fix
Change the `onConflict` target in `supabase/functions/social-connect-callback/index.ts` to match the existing unique constraint:

```ts
{ onConflict: "author_id,channel_id" }
```

`channel_id` is already set to `accountId` in the same upsert payload, so behavior stays identical (one row per author + page/IG account), and we don't need a DB migration.

## Files
- `supabase/functions/social-connect-callback/index.ts` — single-line change to the `onConflict` argument.

## Verification
1. Publish so the live site picks up the edge function change.
2. Reconnect Facebook → choose Pauline page → confirm:
   - Callback page shows "Connected facebook as …"
   - A row exists/updates in `social_connections` with `status='connected'`
   - Connect Settings shows Facebook as connected.

No database migration, no other code touched.