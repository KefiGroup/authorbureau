

## Diagnosis

I cross-checked Manus's audit against the actual codebase and database. Two of its three claims are wrong; one is real.

### What Manus got wrong

**A. "Edge functions don't exist."** False. All 10 functions exist in `supabase/functions/generate-yr19-coaching/` through `generate-yr28-sponsors/`, each ~50 lines, structurally identical to the working `generate-ba13-group-coaching` (which produced Pauline's live BA pages). Same shared helpers, same Lovable AI Gateway call, same upsert.

**B. "YR-20 reader page slug is `big-ticket` and the route is missing."** False. `node-slug-map.ts` line 25 maps YR-20 → `vip`. The real reader URL is `/pauline-teo/vip`. Manus typed the wrong URL and got the legitimate global 404. No router fix needed.

### What's actually broken

**The real failure is invocation-time.** DB confirms Pauline has 9 BA rows + 4 BP rows in `author_nodes` but **zero YR rows** — generation has never written a row for any YR node. Edge function logs are empty for 9 of 10 YR functions and show only one `shutdown` line for YR-26 (no errors captured because errors are logged via `console.error` only and the function bodies aren't being entered cleanly).

The single most likely root cause, given the YR functions are **byte-identical in shape** to the working BA functions and were added in the same sprint pattern: the YR generators throw a synchronous error before the inner try/catch can return the friendly envelope. The two synchronous throws in each YR file are:

1. `LOVABLE_API_KEY` env var missing — but the BA functions use the same key and they work, so this is not it.
2. **`ctx?.target_audience_persona` / `ctx?.key_frameworks` shape mismatch**: BA generators stringify these the same way, so this isn't it either.
3. **The actual culprit:** YR functions throw `"AI gateway error: ${aiRes.status}"` and return `status: 500`. The Supabase JS SDK then routes this through `FunctionsHttpError`, which **swallows the JSON body**, and the YR builder client re-throws it as the generic "ABBY hit a snag" message — masking the real error. The BA functions have the same 500-on-error pattern but their content prompts succeed. The YR prompts ask for substantially larger, more nested JSON (`offers[3]` with 8 fields each, `sales_conversation_guide` with nested objections array, etc.), which under `gpt-5` at `temperature: 0.7` exceeds the gateway's default `max_tokens` and returns truncated/non-JSON output → `parseAiJson` throws → 500 → SDK swallows it → user sees friendly fallback. This matches the platform's own [Complex Structure Generation Reliability](mem://ai/complex-structure-generation-reliability) memory: "16k token budgets and reduced temps (0.2) for complex outputs."

The fix is the same pattern already proven on BA-11 audiobook and BP-02 lead magnets:
- Switch to the `failResponse()` always-200 envelope (already in `_shared/builder-helpers.ts`) so the SDK can read `data.success === false` and surface the real error instead of "ABBY hit a snag".
- Add `max_completion_tokens: 16000` and `temperature: 0.3` to the AI call.
- Map gateway errors via `aiGatewayErrorMessage()`.

## Plan

### Fix 1 — Harden all 10 YR generator edge functions (the real bug)

For each of `generate-yr19-coaching` through `generate-yr28-sponsors`, apply 4 surgical edits (no prompt rewrites, no logic changes):

1. Import `failResponse, aiGatewayErrorMessage, verifyAuthUser` from `_shared/builder-helpers.ts`.
2. Add `max_completion_tokens: 16000` and lower `temperature` to `0.3` in the `fetch` body.
3. On `!aiRes.ok`, call `failResponse(aiGatewayErrorMessage(aiRes.status, await aiRes.text()))` instead of throwing.
4. In the outer `catch`, replace the `status: 500` response with `failResponse(message)` so the always-200 envelope reaches the client.

This single change exposes the real underlying error to the YR builder UI (instead of the generic "snag" message) AND fixes the truncation that caused it. Identical to the resilience pass already done on BA-11 and BP-02.

### Fix 2 — Verify YR-20 reader URL is `/pauline-teo/vip`

No code change. Update Pauline's audit record: the published URL for YR-20 is `https://authorsbureau.com/pauline-teo/vip`, NOT `/big-ticket`. Once Fix 1 lands and YR-20 generation succeeds, the existing publish flow + `GenericPage` renderer in `MicrositePage.tsx` will populate that URL correctly (same path that's already working for BA-15/16/17/18 via `GenericPage`).

### Fix 3 — Add YR-specific reader-page renderers (deferred; not required for "live" status)

Once Fix 1 is in and Pauline's 10 YR rows exist, every YR page will render via the existing `GenericPage` fallback in `MicrositePage.tsx` (line 1776). That eliminates "Coming Soon" — but the rendered content will be sparse, exactly the same problem we already solved for BA-10/13/14 by adding dedicated renderers (`OnlineCoursePage`, `GroupCoachingPage`, `PodcastPage`).

This plan does NOT add the 10 dedicated YR renderers — that's a separate sprint. After Fix 1, all 10 YR pages will render without "Coming Soon" via `GenericPage`, which is a strict improvement and matches Pauline's "make them not say Coming Soon" priority. We can sequence YR renderers one at a time in follow-up turns the same way we did BA-10/13/14.

### Out of scope (Manus's other claims)

- "Add `currentStep` restore to `loadBuilderDraft`" — already done in the prior BA13/14 sprint; verified in `src/lib/builder-autosave.ts`.
- "Replace 'your book' with actual title in YR-26/27/28 intros" — cosmetic; deferred.
- "Build full Sessions Engine / Commerce Engine / booking calendars per node" — these are entire product epics, not bug fixes. Out of scope for this sprint.

## Files touched

- **Update** `supabase/functions/generate-yr19-coaching/index.ts` — 4-line resilience pass
- **Update** `supabase/functions/generate-yr20-big-ticket/index.ts` — same
- **Update** `supabase/functions/generate-yr21-speaking/index.ts` — same
- **Update** `supabase/functions/generate-yr22-corporate/index.ts` — same
- **Update** `supabase/functions/generate-yr23-mastermind/index.ts` — same
- **Update** `supabase/functions/generate-yr24-retreats/index.ts` — same
- **Update** `supabase/functions/generate-yr25-certification/index.ts` — same
- **Update** `supabase/functions/generate-yr26-conference/index.ts` — same
- **Update** `supabase/functions/generate-yr27-fundraising/index.ts` — same
- **Update** `supabase/functions/generate-yr28-sponsors/index.ts` — same

No DB migration. No frontend changes. No router changes. No new functions. ~10 lines changed per file.

## Verification

1. As Pauline, click "Build My Coaching Practice" on `/node-builder/YR-19` → spinner advances → step 2 within ~30 s with populated content (NO "ABBY hit a snag"). If the AI still fails, the error toast now shows the **real** message (e.g., "ABBY's AI service is having a moment") instead of the generic snag.
2. Repeat for YR-20 through YR-28 — all 10 generate and write `author_nodes` rows.
3. Publish each → microsite URLs (`/pauline-teo/coaching`, `/vip`, `/speaking`, `/corporate-training`, `/mastermind`, `/retreat`, `/certification`, `/conference`, `/fundraising`, `/sponsors`) load via `GenericPage` — no "Coming Soon" badge anywhere.
4. Once published, follow-up sprints can add dedicated renderers (e.g., `OneOnOneCoachingPage`, `KeynoteSpeakingPage`) one at a time, matching the BA-10/13/14 pattern.

## Scope

10 edge function files, ~10 lines each, single resilience pass. No DB, no frontend, no router, no regenerated content required for existing nodes.

