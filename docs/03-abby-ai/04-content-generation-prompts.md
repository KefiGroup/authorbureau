# 04 · ABBY Content Generation Prompts

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `supabase/functions/generate-email-sequence/index.ts`
- `supabase/functions/generate-asset-pack/index.ts`
- `supabase/functions/generate-author-bio/index.ts`
- `supabase/functions/generate-consultation-promos/index.ts`
- `supabase/functions/compose-social-post/index.ts`
- `supabase/functions/generate-social-content/index.ts`
- `supabase/functions/generate-social-graphic/index.ts`
- `supabase/functions/generate-funnel/index.ts`
- `supabase/functions/generate-podcast-season/index.ts`
- `supabase/functions/generate-cover-image/index.ts`

---

Beyond the 28 node activation generators, ABBY runs a set of **content generators** that produce specific marketing assets. These are invoked by builders, the Marketing Hub, and ABBY herself in chat.

| Generator | Used by | Output | Model |
|---|---|---|---|
| `generate-email-sequence` | BP-01 builder, Marketing Hub | A 3–10 step email sequence with subject + body | `openai/gpt-5.2` |
| `generate-asset-pack` | Cross-builder push, BP-02 | Bundled asset pack (intro email, social post set, headline variants) | `openai/gpt-5.2` |
| `generate-author-bio` | BP-04 builder, BA-15 | Long + short bio variants in author voice | `openai/gpt-5.2` |
| `generate-consultation-promos` | YR-19, YR-20, YR-23 | Promo copy for consultation offers | `openai/gpt-5.2` |
| `compose-social-post` | BP-03 Social Designer | 2-step background + burn-in image, 6 templates × 5 platforms | `google/gemini-3-flash-image-preview` |
| `generate-social-content` | BP-03, Marketing Hub | 30-day calendar of posts | `openai/gpt-5.2` |
| `generate-social-graphic` | BP-03, lead magnets | Standalone social graphic | `google/gemini-3-flash-image-preview` |
| `generate-funnel` | BP-02, BP-04, lead-magnet builder | Quiz, opt-in flow, results-page copy | `openai/gpt-5.2` |
| `generate-podcast-season` | BA-14 | Season-arc proposal with episode topics | `openai/gpt-5.2` |
| `generate-cover-image` | BP-06, BP-07, lead magnets | Cover graphic for workbook / course / lead magnet | `google/gemini-3-flash-image-preview` |

## Common patterns

All content generators:

1. Use the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`).
2. Run with `verify_jwt = false` and validate the JWT in code via `getActiveToken()`.
3. Bypass RLS via the service role key and write to `generated_assets` with a typed `asset_type`.
4. Return `{ success, status, message, data }` per the platform contract.
5. Fetch author + book context (pen name, niche, framework, audience level) before composing the prompt.

## Forbidden phrases (universal)

These are stripped from every output by validators before persistence:

- "Next-step", "try this", "exercise" (lead-magnet copy rule)
- Em-dashes (`—`, `–`) and bracket placeholders (`[insert ...]`, `{{...}}`, `<<...>>`) in any microsite-bound content (`scrub_microsite_jsonb` DB trigger enforces this)
- "CLICK TO SELECT", "PICK ONE", "CHOOSE ONE", "SELECT ONE"
- Brand-restricted technical terms ("Stripe", "GHL", "Supabase", "deploy", "API", "CRM")

## Verbatim prompts

The **verbatim** body of each generator's prompt block is captured by `scripts/build-doc-03.mjs` (which scans every `generate-*` function, including the content generators above). See `03-node-activation-prompts.md` for the full extracted text.

> Future sprint: separate `build-doc-04-content.mjs` will split node-bound generators from content-bound generators into their own document. Until then, treat `03-node-activation-prompts.md` as the union.
