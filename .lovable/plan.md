# Marketing Asset Pack — Auto-Generation on Node Completion

## Goal
The moment any of the 28 nodes (BP-01…BP-09, BA-10…BA-18, YR-19…YR-28) is marked `live`, the platform automatically generates a complete Marketing Asset Pack for that node + book, files it in **My Library** under a node-specific folder, and pings the author.

## What's in every Pack

1. **Sales page copy** — long-form, 11-section framework already used elsewhere
2. **3 social media posts** — tailored to the node type (LinkedIn long-form, Instagram caption, X/Twitter thread starter)
3. **Email announcement** — ready-to-send broadcast to the author's list
4. **Node-specific bonus asset** — e.g.:
   - BA-15 (Affiliate) → affiliate swipe copy (3 emails + 5 social posts for partners)
   - YR-20 (Big-Ticket / B2B) → B2B one-pager (PDF brief)
   - BA-16 (Speaking PR) → speaker one-pager
   - BA-11 (Audiobook) → audiogram brief (60s script + cover art prompt)
   - BP-06 (Workbook) → "5-day challenge" mini-sequence
   - YR-22 (Corporate Training) → procurement/RFP brief
   - YR-21 (Speaking) → speaker reel storyboard
   - …one bonus per node, defined in a registry

All four pieces are personalized to the author's book, methodology, and tone of voice (pulled from `author_context` / `books` / `author_profiles`).

---

## Architecture

### 1. New edge function: `generate-asset-pack`
Single entry point. Input: `{ author_id, node_id, book_id }`.

Flow:
1. Load author context, book, node `content_json`.
2. Look up the node in a new `ASSET_PACK_REGISTRY` to know the bonus type + tailored prompts.
3. Single Lovable AI call (`google/gemini-2.5-flash`) returning structured JSON: `{ sales_copy, social_posts: [3], email_announcement, bonus_asset }`.
4. Persist 4 rows in `marketing_assets` tagged with `node_id` and `book_id`:
   - `asset_type = "sales_copy:<NODE_ID>"`
   - `asset_type = "social_pack:<NODE_ID>"`
   - `asset_type = "email_announcement:<NODE_ID>"`
   - `asset_type = "bonus:<NODE_ID>"`
   `content` jsonb stores the rendered text + metadata (`{ node_id, node_name, book_title, generated_at }`).
5. Insert a `notifications` row: "Your <Node Name> Marketing Pack is ready" → links to `/library?node=<NODE_ID>`.
6. Return summary.

Idempotent: re-running for the same `(author_id, node_id, book_id)` upserts (uses existing `idx_marketing_assets_unique_type` style key, extended to include node).

### 2. Triggering — when a node flips to `live`
Two complementary triggers so nothing slips through:

a. **In-code call** from every place that writes `status: "live"` to `author_nodes`. There are ~30 deploy functions (`deploy-bp*-to-ghl`, `deploy-ba*`, `deploy-yr*`, plus `save-author-node` activate path). Each will fire a non-blocking `supabase.functions.invoke("generate-asset-pack", { body: ... })` after the status update. We add a tiny shared helper in `supabase/functions/_shared/asset-pack-trigger.ts` so it's a one-line call.

b. **Safety-net DB trigger** — a `SECURITY DEFINER` Postgres function on `author_nodes` that, when `OLD.status IS DISTINCT FROM 'live' AND NEW.status = 'live'`, calls `generate-asset-pack` via `pg_net.http_post`. This catches manual SQL updates, GHL-side flips, and anything we forget.

### 3. Asset Pack Registry
New file `supabase/functions/_shared/assetPackRegistry.ts` (mirrored to `src/lib/assetPackRegistry.ts` for the UI). For each of the 28 nodes:
```ts
{
  node_id: "BA-15",
  node_name: "Affiliate Program",
  bonus_type: "affiliate_swipe",
  bonus_prompt: "Generate 3 affiliate recruitment emails + 5 partner social posts...",
  social_tone: "partnership, revenue-share focused"
}
```

### 4. My Library UI
Update `src/pages/AuthorLibrary.tsx` and `get-author-library`:
- Edge function additionally returns `marketing_assets` for the author, grouped by `node_id`.
- Library gets a new top-level tab **"Marketing Packs"** that lists every node with a generated pack and shows the 4 (or 5) assets per node in a collapsible card.
- Each asset has Copy / Download (.txt or .pdf for the bonus one-pagers) / "Send to BP-01 email queue" actions.
- Folder metaphor: nodes are the folders, assets are the files inside.

### 5. Notifications
Reuses existing `notifications` table (already realtime-enabled). The dashboard bell icon will show "<Book Title> — <Node Name> Marketing Pack ready" with deep link to `/library?node=BA-15`.

### 6. Backfill
One-time call on deploy: for every existing `author_nodes` row where `status = 'live'` and no matching pack exists in `marketing_assets`, enqueue `generate-asset-pack`. Done via a small admin script invoked once.

---

## Files to create
- `supabase/functions/generate-asset-pack/index.ts`
- `supabase/functions/_shared/asset-pack-trigger.ts`
- `supabase/functions/_shared/assetPackRegistry.ts`
- `src/lib/assetPackRegistry.ts`
- `src/components/library/MarketingPackCard.tsx`
- Migration: DB trigger on `author_nodes` + extending `marketing_assets` unique index to include node identifier in `asset_type`.

## Files to edit
- `supabase/functions/get-author-library/index.ts` — return marketing assets too.
- `src/pages/AuthorLibrary.tsx` — add "Marketing Packs" tab.
- All `deploy-*-to-ghl` and `deploy-*-to-thinkific` / `deploy-*-to-stripe` / `deploy-*-to-transistor` functions (~30) — add the one-line trigger after `status: "live"` update.
- `supabase/functions/save-author-node/index.ts` — add trigger on the `activate` action path.

## Out of scope (can come later)
- Auto-publishing the email broadcast to subscribers (we only generate it; author clicks "send" from Library).
- Auto-posting the social posts (requires social-publish wiring per channel).
- Editable AI re-generation per asset (we'll add a "Regenerate" button now; richer editing is a follow-up).
