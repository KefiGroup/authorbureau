# Sprint 11 — Fix Sprint 10 verification gaps

I read Manus's report and cross-checked against the live DB. **He's right on all three counts.** Confirmation:

- YR-22 was regenerated today at 08:09 UTC (after Sprint 10 deploy) and `content_json` contains: `tagline, programme_title, training_formats, learning_outcomes, programme_outline, proposal_template, target_organisations, abby_summary`. **No `slides` key.** Same for the other 4 P1 nodes and the 4 P2 nodes — 0/9 have slide/pitch-deck arrays.
- Registry keys (`slides`, `pitch_deck`) are correct; the asset rows are hidden because the probe finds nothing — i.e. **Manus's "Cause A"**: gpt-5-mini is silently dropping the new optional field even though we added it to the prompt.
- BA-13 builder shows Step 1 even when `status='live'` — our Sprint 10 "verification" only checked that `_currentStep` is read, not that live status forces the completion view.
- YR-21 first-attempt timeout is consistent with YR-23 before its Sprint 4 token bump.

## P0 — Make slides[] / pitch_deck[] actually land in content_json

Root cause: we tacked `slides`/`pitch_deck` onto the existing prompt as one bullet at the end. With `response_format: json_object` (not strict schema) and `gpt-5-mini`, the model treats it as optional and frequently omits it, especially when the rest of the payload is already large.

Fix pattern (apply to all 9 generators):

1. **Promote slides/pitch_deck to a top-level required field in the JSON shape block** — listed first in the schema example, with a fully-rendered 2-slide sample so the model has a concrete pattern to copy.
2. **Add an explicit "REQUIRED FIELDS" line** after the schema: e.g. `REQUIRED top-level keys: programme_title, slides, learning_outcomes, ... — output that omits any of these will fail QA.`
3. **Post-parse validation + one retry inside the edge function**:
   ```ts
   if (!Array.isArray(content.slides) || content.slides.length < 6) {
     // re-call gateway with a follow-up: "Your previous response omitted the required `slides` array. Return ONLY a JSON object with a `slides` array of N {title, body, notes, layout_hint} objects, nothing else." then merge.
   }
   ```
   Same logic for `pitch_deck` on the 4 P2 generators.
4. Cap retry at 1 to stay within 180s timeout. If still missing after retry, log to `error_log` table and return success without slides (don't block the user).

Generators to update: `generate-yr22-corporate`, `generate-ba13-group-coaching`, `generate-ba10-online-course`, `generate-yr25-certification`, `generate-bp05-webinars`, `generate-ba16-affiliate`, `generate-ba18-jv-partnerships`, `generate-yr27-fundraising`, `generate-yr28-sponsors`.

## P1 — BA-13 builder shows live state correctly

In `BA13Builder.tsx` resume effect: change the precedence from `_currentStep || 1` to:

```ts
const initialStep = nodeStatus === 'live' ? COMPLETION_STEP : (content_json?._currentStep ?? 1);
```

Apply the same guard to the other multi-step builders that share this pattern (audit list while we're in there: BA-10, YR-22, YR-25, BP-05 — same builders we just touched for slides).

## P2 — YR-21 first-attempt timeout

In `generate-yr21-speaking/index.ts`:
- Bump `max_completion_tokens` to 24000 (matches YR-23 post-Sprint-4).
- Confirm it's already wrapped in `fetchAiGateway` with retry (Sprint 9 standard) — if not, wrap it.

## QA after deploy

Re-run YR-22 generator on Pauline's "Be SUCKcessful", then:
1. SQL check: `SELECT jsonb_array_length(content_json->'slides') FROM author_nodes WHERE node_id='YR-22' AND ...` should be ≥ 6.
2. Library: "Training slide deck" row visible with PPTX download.
3. Download PPTX, render with LibreOffice → pdftoppm → eyeball first 3 slides for placeholders / wrong author name.
4. Open BA-13 builder for Pauline → confirm completion view, not Step 1.
5. Re-run YR-21 generator cold (clear row first) → completes on first attempt.

## Out of scope

- The remaining 1/28 not-live node on Pauline's book (different from this sprint).
- Strict JSON schema mode (`response_format: { type: "json_schema" }`) — would solve this more cleanly but requires touching all generators and verifying gateway support; defer to a dedicated sprint.

## Files touched

- 9 × `supabase/functions/generate-*/index.ts` (prompt + retry)
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` (+ 4 sibling builders for the same fix)
- `supabase/functions/generate-yr21-speaking/index.ts` (token bump)
- No DB migration, no registry change.
