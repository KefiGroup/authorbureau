

# Sprint 26 Hotfix — Two Bug Fixes

## Bug 1: Add `description` column to `generated_assets`

The `generated_assets` table currently has: `id`, `book_id`, `author_id`, `asset_type`, `content`, `created_at`, `updated_at`. No `description` column exists, causing a 400 error when code references it.

**Fix:** Create a database migration adding `description TEXT` (nullable) to `generated_assets`. This is a non-breaking additive change.

```sql
ALTER TABLE public.generated_assets
ADD COLUMN IF NOT EXISTS description TEXT;
```

---

## Bug 2: Graceful fallback in `deploy-bp02-to-ghl` when `GHL_AGENCY_KEY` is missing

Currently the edge function proceeds to GHL deployment and when the key is missing, it either skips GHL silently but still marks the node as `"live"`, or crashes depending on the code path. The fix:

**File:** `supabase/functions/deploy-bp02-to-ghl/index.ts`

- After fetching BP-02 content, check `GHL_AGENCY_KEY` early
- If missing (or no sub-account): skip all GHL API calls, set status to `"published_pending_ghl"` instead of `"live"`, and return a 200 success response with the message: *"Lead magnet saved successfully. Connect GoHighLevel in Settings to activate your live opt-in page."*
- The existing GHL deployment block (lines 80-220) already has the `if (GHL_AGENCY_KEY && subAccountId)` guard — the change is in the `else` branch: update node status to `published_pending_ghl` and return a friendly success response instead of continuing to mark as `"live"`

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | `ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS description TEXT` |
| `supabase/functions/deploy-bp02-to-ghl/index.ts` | When GHL key missing: set status `published_pending_ghl`, return 200 with friendly message |

No other files or functionality affected.

