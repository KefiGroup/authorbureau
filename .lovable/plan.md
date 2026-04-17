

The user wants per-author Buffer API keys. Currently `get-buffer-channels` uses a global `BUFFER_API_KEY` env var. Need to accept a per-author key, store it, and surface it in Connect Settings UI.

## Plan: Social Accounts card + per-author Buffer API key

### 1. Database — add column
Migration: `ALTER TABLE social_connections ADD COLUMN buffer_api_key text;`

### 2. Edge function — `supabase/functions/get-buffer-channels/index.ts`
- Accept `{ author_id, buffer_api_key }` in body.
- If `buffer_api_key` provided: use it as the bearer token; otherwise fall back to `BUFFER_API_KEY` env (keeps Pauline working).
- After successful Buffer GraphQL fetch, include `buffer_api_key` on every upserted row so it persists per author.
- Return `{ success, channels, count }` (existing shape) plus `platforms` list (e.g. `["linkedin","instagram"]`) so UI can show which were found.

### 3. UI — `src/pages/ConnectSettings.tsx`
Add a new "Social Accounts" Card below Email Marketing.

**State additions**
- `authorId`, `connectedPlatforms: Set<string>`, `apiKey: string`, `savedKeyMask: string | null`, `syncing: boolean`

**On mount** — extend existing fetch to also load:
- `author_profiles.id` → `authorId`
- `social_connections` rows for this author → derive `connectedPlatforms` and pull `buffer_api_key` (mask all but last 4 chars → `savedKeyMask`)

**Card contents**
1. Header: "Social Accounts" + 1-line description.
2. Buffer API Key field:
   - `<Label>Buffer API Key</Label>`
   - `<Input>` — placeholder `"Paste your Buffer API key here"`, value bound to `apiKey`. If `savedKeyMask` exists and `apiKey` is empty, show mask as placeholder so user knows it's stored.
   - Helper text: `"Get your key from Buffer → Settings → API → New Key"`
   - Link: `"Don't have Buffer? Set it up free →"` opens `https://buffer.com` in new tab (`target="_blank" rel="noopener noreferrer"`).
3. 4 platform rows (LinkedIn, Instagram, Facebook, X) using lucide `Linkedin`, `Instagram`, `Facebook`, `Twitter`:
   - Icon + name + Badge (`"Connected via Buffer"` green if in `connectedPlatforms`, else `"Not Connected"` neutral).
4. `<Button>` "Sync from Buffer":
   - Disabled when `apiKey.trim() === "" && !savedKeyMask` (allow re-sync with stored key when input empty).
   - On click → `handleSync()`.

**`handleSync()`**
- `setSyncing(true)`
- `supabase.functions.invoke("get-buffer-channels", { body: { author_id: authorId, buffer_api_key: apiKey || undefined } })`
- On success:
  - Re-query `social_connections`, refresh `connectedPlatforms` + `savedKeyMask`, clear input.
  - Toast: `"Done! I found {count} connected accounts. Go back to Social Media and click Activate to schedule your posts."`
- On error: toast with the function's error message.
- `setSyncing(false)`

### Out of scope
No changes to BP-03, Marketing Hub, or other settings pages.

### Files touched
- DB migration (add `buffer_api_key` column)
- `supabase/functions/get-buffer-channels/index.ts`
- `src/pages/ConnectSettings.tsx`

