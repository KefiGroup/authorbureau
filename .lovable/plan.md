

## Verdict on Manus's Report

I cross-checked every claim against the live DB and edge function code. **3 of Manus's 4 critical claims are factually wrong.**

| Manus's Claim | Reality | Evidence |
|---|---|---|
| "Resilience fix NOT deployed" | ❌ **WRONG — already deployed** | `generate-yr19-coaching/index.ts` line 5 imports `failResponse, aiGatewayErrorMessage`; line 33 has `temperature: 0.3, max_completion_tokens: 16000`; line 35 returns `failResponse(aiGatewayErrorMessage(...))`; line 53 returns `failResponse(message)`. All 10 YR functions match. |
| "BA-12 at Introduction step, no content" | ❌ **WRONG** | DB row: `BA-12 status=content_ready, current_step=2, has_content=true`. Content exists; Pauline just hasn't published. |
| "BA-14/15/16/17/18 hub says Live but builder shows Introduction step" | ⚠️ **Partially right — but it's a UI restore bug, not data integrity** | DB confirms all 5 are `status=live, current_step=3, has_url=true, activated_at` set. The hub badges are correct. The builder UI is failing to restore to step 3 on revisit — this is the same `loadBuilderDraft` bug we fixed for BA-13/14 last sprint, but YR/older BA builders may have stale call sites. |
| "Zero YR rows; resilience fix never ran" | ⚠️ **DB part right, cause wrong** | Zero YR rows confirmed. But edge logs show **exactly one** YR-19 invocation: `200 OK, 2934 ms`. A real generation takes 15–40 s — 2.9 s means it returned `failResponse(...)` early (likely "No book found", AI gateway 429/402, or a context-shape error). The fix is shipped; we need to capture the actual error envelope. |

**One thing Manus is right about:** zero YR nodes have ever generated successfully. We need to drive that to root cause.

**Out of scope per project memory:** Sessions Engine, Commerce Engine wiring, Daily.co, application dashboards (Manus's "Actions 3–5") are **product epics**, not bug fixes. Skip until generation works for all 10 YR nodes.

---

## Plan

### Fix 1 — Capture the real YR-19 failure (root cause we can't see yet)

Single curl test against the deployed `generate-yr19-coaching` with Pauline's `author_id` to read the actual `failResponse` body. Three plausible causes:

- **(a)** `bookTitle` empty after `buildAuthorContext` → throws "No book found" → 200 with `success:false, error:"No book found"`. Fix: same fallback already in BA generators (try `books.owner_email`, lowercase match) — port to `buildAuthorContext` if missing.
- **(b)** AI gateway 429/402 → `failResponse(aiGatewayErrorMessage(...))` returns the friendly message. Fix: surface to Pauline + add a one-time retry with backoff in `handleGenerate`.
- **(c)** `parseAiJson` throws on truncated/non-JSON output → caught by outer try → returned via `failResponse(message)`. Fix: bump `max_completion_tokens` further or simplify the JSON shape.

After capturing the envelope, apply the matching one-line fix in `generate-yr19-coaching` and propagate identically to YR-20 through YR-28 (they share the same prompt/context plumbing).

### Fix 2 — BA-12 publish UI

BA-12 sits in `content_ready` with `has_url=false`. The hub correctly shows it as "Locked" only because of subscription gating (Pro tier). Add a small **Re-publish** button on the Review step of `BA12Builder.tsx` (mirrors the BA-13/14 banner already shipped) so when Pauline upgrades to Pro the publish path works in one click. **No DB change.**

### Fix 3 — Builder draft restoration for already-live BA nodes (BA-14, BA-15, BA-16, BA-17, BA-18)

Manus is right that the builder reopens at the Introduction step even though `status=live`. Audit each builder's `loadBuilderDraft` call:

- Confirm every BA1{4..8}Builder.tsx restores to `step=3` when `__draft.isLive === true` (the YR-19 file already does — `setStep(__draft.isLive ? 3 : ...)`).
- Where missing, port the same one-liner. ~5 lines per file, no logic change.

### Fix 4 — Update Manus's report record

Document the corrected verdicts (above) so future audits don't loop on the same false positives. Save as a memory entry: `mem://audits/manus-2026-04-23-corrections`.

### Out of scope (deferred)

- Sessions Engine / Daily.co booking calendars (product epic)
- Commerce Engine wiring per YR node (already exists generically via `BuyNowButton`; per-node UX is separate sprint)
- Application management dashboard for YR-20 (separate sprint)
- Reader test pass (do after generation is green for all 10)

---

## Files touched

- **Read-only test** `supabase/functions/generate-yr19-coaching` via `curl_edge_functions` to capture real error envelope
- **Update** `supabase/functions/_shared/builder-helpers.ts` (only if Fix 1a applies — port BA's owner_email fallback)
- **Update** all 10 `supabase/functions/generate-yr*` files (1-line fix matching the captured root cause; may be no-op if cause is environmental like 429)
- **Update** `src/components/dashboard/builders/ba12/BA12Builder.tsx` — add Re-publish button on Review
- **Update** `src/components/dashboard/builders/ba14/BA14Builder.tsx` through `ba18/BA18Builder.tsx` — restore to step 3 when `isLive`
- **Create** `mem://audits/manus-2026-04-23-corrections.md`

No DB migration. No router changes. No new edge functions. No engine wiring.

---

## Verification

1. `curl_edge_functions` against `generate-yr19-coaching` with Pauline's `author_id` returns `{success:false, error:"…"}` → real error captured.
2. After applying the matching 1-line fix, re-curl returns `{success:true, content:{practice_title, packages[3], …}}` in 15–30 s.
3. DB shows new row `node_id=YR-19, status=content_ready, current_step=2`.
4. Repeat curls for YR-20 through YR-28 — all return `success:true`.
5. Pauline reopens BA-14/15/16/17/18 builders → lands directly on the Review step (no Introduction loading screen).
6. BA-12 Review step shows a working Re-publish button.

## Scope

1 diagnostic curl + 1 line per YR file (10 files) + 1 button in BA12 + 5 lines across BA14–18 builders. No DB, no engine epics, no router changes.

