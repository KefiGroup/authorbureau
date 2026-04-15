

# Sprint 29 QA — 3 Fixes

## Fix 1: BP-02 JSON parsing error

**Root cause**: The edge function calls `openai/gpt-5` without `response_format: { type: "json_object" }`, so the model sometimes wraps JSON in prose/markdown that fails parsing.

**Fix in `supabase/functions/generate-bp02-lead-magnets/index.ts`**:
1. Add `response_format: { type: "json_object" }` to the AI gateway request body (line 272)
2. Add a retry mechanism: if JSON parsing fails after the first attempt, call the AI again with a simplified prompt ("Fix this into valid JSON: [raw content]") and parse that response
3. Redeploy the function

## Fix 2: BP-01 not linked in Marketing Hub

**Root cause**: BP-01 (Email Marketing / Website) has no row in `author_nodes` at all, so `deriveNodeStatus` returns `not_built`. The user's live site at `authorsbureau.com/pauline-teo` isn't tracked. There is no `author_websites` table — the microsite URL is stored on `author_nodes.microsite_url`.

**Fix in `src/components/dashboard/MarketingHub.tsx`**:
1. In `fetchNodes`, also query `author_profiles` for the author's `author_slug` and `microsite_url` fields
2. If `author_slug` exists (meaning the author has a public profile page), synthesize a virtual `NodeRow` for BP-01 with `status: "live"` and the microsite URL
3. Add this virtual row to `nodeRows` so BP-01 shows as "Ready to Activate" (or "Active" if `marketing_activated_at` is set)

Additionally, `deriveNodeStatus` must handle `content_ready` status — currently it falls through to `not_built`. Map `content_ready` → `"ready"`.

## Fix 3: Content persistence for BP-02

**Root cause**: The edge function already saves to `author_nodes` (lines 311-321), and the BP02Builder already loads from `author_nodes` on mount (lines 91-105). However, the status check on line 98 only recognizes `content_ready` or `live`. The edge function sets status to `content_ready` — this path should work.

Looking more carefully: the edge function's update on line 311 does an `update` with `.eq("author_id", author_id).eq("node_id", "BP-02")`, but there may be no existing row to update (it was only inserted during `handlePublish`). The upsert logic is split: edge function does `update`, client does `insert` on publish.

**Fix**: The edge function should upsert (insert if no row exists, update if it does). Change the edge function to:
1. First check if a row exists for this author_id + BP-02
2. If yes, update it
3. If no, insert a new row with status `content_ready`

This ensures the generated content is persisted even before the author clicks "Publish". On return visits, the existing load logic (line 98) will find `content_ready` and skip to step 2 (Review).

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Add `response_format`, retry on JSON failure, upsert logic |
| `src/components/dashboard/MarketingHub.tsx` | Handle `content_ready` status, synthesize BP-01 row from author profile |

No new tables, routes, or edge functions.

