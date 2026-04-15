

# Fix: BP-02 Lead Magnet Generation — Empty Content

## Root Cause

The AI returns `{"error": "..."}` instead of valid lead magnet content. Three issues:

1. **Token budget too low**: `max_completion_tokens: 8000` is insufficient for the massive JSON output (lead magnets, quiz with 8 questions, 5 scoring tiers, opt-in page, thank-you page, 5 nurture emails, 4 social posts). Memory specifies 16k for complex structures.

2. **No book intelligence reaching the prompt**: The `author_context` table is empty for this author. The fallback to `books` table finds the book but only passes title/subtitle/description. Meanwhile, `generated_assets` has the full ABBY business plan and source manuscript — rich data that would make the lead magnets highly specific.

3. **No enrichment from ABBY consultation**: The `generated_assets` table contains a `business_plan` asset with the full 28-node revenue strategy and a `source_material` asset with the parsed manuscript. Neither is used.

## Fix — `supabase/functions/generate-bp02-lead-magnets/index.ts`

### Change 1: Increase token budget
- `max_completion_tokens: 8000` → `max_completion_tokens: 16000`
- Apply to both the main call and the retry call

### Change 2: Pull enrichment from `generated_assets`
After the existing book fallback (line 56), add queries for:
- `generated_assets` where `asset_type = 'business_plan'` — extract the ABBY strategy summary (first 3000 chars)
- `generated_assets` where `asset_type = 'source_material'` — extract key book content (first 2000 chars)

Use `author.user_id` (the `auth.users.id`) for querying `generated_assets.author_id`.

### Change 3: Enrich the user prompt
Add the business plan and source material excerpts to the user prompt so the AI has real book content and strategic context, not just "N/A" for every field.

### Change 4: Validate AI error responses
Before accepting `parsedContent`, check if it's an error object like `{"error": "..."}` and reject it — force a retry instead of saving garbage.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Token budget 16k, pull generated_assets for enrichment, add to prompt, reject error objects |

No UI changes needed — the Review step already renders the content correctly when valid data is present.

## Redeploy
Redeploy `generate-bp02-lead-magnets` after changes.

