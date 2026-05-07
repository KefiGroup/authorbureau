## Manus Audit – Lovable Fix Plan

Five bugs were called out. I've verified each against the codebase and live data for `pauline-teo` / Be SUCKcessful. Pauline's actual DB state confirms the diagnoses below.

---

### BUG #5 — Counter shows 7/28 (P0)

**Verified.** Most live rows have no `library_asset` and don't satisfy the legacy fallback either. Examples from her data:

| Node | status | content_json keys (excerpt) | Why it fails the gate |
|---|---|---|---|
| BP-01 Email | `content_ready` (not `live`) | welcome_sequence, lead_magnet_offer | DB gate fails (status ≠ live), AND no `email_sequence_id`+`steps[]` / `sequence_steps[]` |
| BP-04 Microsite | `content_ready` | `personalised_name`, `nurture_sequence`, `_currentStep` | Status ≠ live, AND no `hero_headline`/`sections[]` |
| BA-12 Membership | live | tiers, welcome_emails, content_calendar… | OK (passes via `hasSubstantiveBuild` + title) – should already count |
| BA-13 Group Coaching | live | `weeks`, `programme_title`, `session_frequency` | Fails – legacy gate looks for `sessions[]` or `schedule`, not `weeks[]` |
| BA-15 Press | live | `press_release` (string), `target_media_outlets` | Should pass; verify |
| BA-16 Affiliates | live | activated, commission_structure, payout_schedule | Should pass; verify |
| YR-19/20/21/etc | live | varied builder shapes | Several use builder-specific arrays not in `SUBSTANCE_ARRAYS` (e.g. `weeks`, `study_weeks` is in, but `programme_outline_weeks` etc. may not be) |

So the counter is correctly enforcing the contract; the **builders are not writing what the gate expects**, and a few categories (BP-01, BP-04) never reached `status='live'` at all.

**Fix (incremental, safe):**

1. **Add temporary diagnostic logging** to `hasRequiredAssets()` in `supabase/functions/_shared/node-readiness.ts` — log `{ nodeId, status, contentKeys, passedBy: "library_asset"|"legacy"|"none" }`. Mirror in the frontend `useBookNodeProgress` hook (gated by `import.meta.env.DEV`). Run for Pauline's account, capture which nodes fail and why.
2. **Patch the legacy gate alignments** identified by the diagnostic (no schema changes; pure rule expansion):
   - `BA-13` Group Coaching — accept `weeks[]` (already used by the builder) in addition to `sessions[]` / `schedule`.
   - `BP-04` Microsite — also pass when `nurture_sequence[]` is non-empty *plus* `personalised_name` (current builder shape after BP-04 changes).
   - `BA-14` Podcast — confirm `episodes[]` length and `activated` semantics match Sprint-50 builder; relax to also accept `library_asset.kind === "podcast_pack"` (already enforced via uniform contract — verify `BA-14` row has it; the audit confirms `library_asset:object` is present, so it should already pass).
   - Sweep YR-19→YR-28 against actual live rows; add any builder-specific built-content arrays to `SUBSTANCE_ARRAYS` (no rule loosening for nodes lacking title or commerce).
3. **Promote BP-01 and BP-04 from `content_ready` → `live`** in their builders' Publish step. Currently the audit shows them stuck in `content_ready`. The publish call (`publishNodeToSite`) must be invoked at the end of step 3 — patch where missing.
4. **Add Vitest fixtures** in `src/lib/__tests__/node-readiness.test.ts` — one fixture per node, using the *actual* `content_json` shapes saved by Pauline's run. Lock the contract going forward. Per the architecture rule: any new readiness rule requires a fixture.
5. **Remove diagnostic logging** once tests pass.

**Outcome:** Pauline's counter goes from 7/28 → 28/28; the gate stays strict (no node can lie about being Live).

---

### BUG #3 + BUG #4 — Raw JSON shown in YR-24 Retreats and YR-28 Sponsors

**Verified.** Pauline's `YR-24.transformation_arc` is a JSON **array** in DB; `YR-28.audience_profile` is an **object**. Both render via `<SafeBlock value={...} />` from `src/components/dashboard/builders/shared/YRSafeBoundary.tsx`. SafeBlock handles objects/arrays correctly — but when the AI returns the same field as a *stringified* JSON (which the audit screenshot proves it sometimes does), `SafeBlock` falls through to `SafeText`, which prints the raw `{"stage":"…"}` string.

**Fix (single shared change, fixes both nodes):**

1. **Add `parseJsonField()` helper** in `YRSafeBoundary.tsx`:
   ```
   if value is a string starting with '{' or '[' → try JSON.parse → on success, recurse with the parsed value
   ```
2. Wire it into both `SafeText` and `SafeBlock` *before* the string/primitive branch.
3. Apply the same parse-then-render to `MicrositePage.tsx` `RetreatPage` (`arcRaw`) and `SponsorsPage` (`audience_profile`) — currently they do `typeof === "object"` checks that miss the string-shaped case.
4. **Vitest** in `src/lib/__tests__/safe-block.test.tsx`: feed a stringified object/array, expect rendered key/value rows (not raw JSON text).
5. **Backfill existing rows once.** Add a one-shot SQL data fix that JSON-parses any string-typed `transformation_arc` / `audience_profile` on `author_nodes` so the live page stops showing raw JSON immediately, even before re-publish.

---

### BUG #1 — YR-20 naming inconsistency

**Verified.** `YR20Builder.tsx` autosaves once as `"Consulting"` (line 102) and once as `"Big Ticket Consulting"` (line 112); the StepHeader says `"Big Ticket Consulting"`; the canonical label registry has its own value; the slug map produces `/vip`.

**Fix:**
1. Look up YR-20's canonical label in `src/components/dashboard/builders/builderNodeConfig.ts` — that file is the documented single source of truth (per memory: "Canonical Node Names").
2. Replace every YR-20 string in `YR20Builder.tsx` (autosave name, StepHeader, success toast, navigate label) with the canonical label.
3. Update `src/lib/node-slug-map.ts` so YR-20 resolves to `/big-ticket-offers` (or whichever slug matches the canonical label). Add a 301-style redirect from `/vip` → new slug in the public route layer to preserve any existing inbound links.
4. Update `node_registry.microsite_slug` (DB) so `compute_node_microsite_url` produces the new path. Backfill any existing live YR-20 `delivery_url` rows.
5. Run the canonical-labels parity test (`canonical-node-labels.ts` enforcement layer per memory).

---

### BUG #2 — YR-23 Mastermind generation timeout

**Verified.** `generate-yr23-mastermind` produces 4 sections; under load the Lovable AI Gateway sometimes exceeds the client timeout. The error path already shows Abby's "Try Again" message, but the user has to click manually.

**Fix:**
1. Wrap the YR-23 generator call in `callAiGateway` with the existing 1-retry resilience helper (per memory: "ABBY Error Resilience Layer"). No timeout extension on the edge function — server runtime is already 180s.
2. In `YR23Builder.tsx`, when the first attempt errors with the timeout coded-error, **silent retry once** before surfacing the toast.
3. Add a step-level loading indicator showing "Generating Concept… Tiers… Benefits… Application…" — purely cosmetic (the gateway returns one JSON; we just rotate copy on the existing `LoadingStep`).
4. Same pattern then applied as defensive sweep to other 4-section YR generators (YR-22, YR-24, YR-25) — the audit calls these out as the same risk class.

---

### Out of scope (addressed elsewhere or low priority)

- **OBS #3** (Abby chat widget covering Generate buttons) — already partially fixed by the route-section suppression list in `AbbyHelpChatbot.tsx` line 390. Audit lists it P3; I'll add YR-23/YR-24/BA-18 sections to the existing `["builder=", section==="..."]` suppression array as a one-line addition under this same sprint.
- Server-side timeout extension is **not** needed; resilience layer already exists.

---

### Execution order

1. P0 — counter (BUG #5), one-shot diagnostics + rule alignment + fixtures + promote-to-live for BP-01/BP-04.
2. P1 — raw-JSON renderer (BUGs #3 + #4): single shared `parseJsonField` + DB backfill.
3. P1 — YR-20 naming (BUG #1).
4. P2 — YR-23 silent retry (BUG #2) + chatbot suppression (OBS #3).

Each step ships with a Vitest covering the new contract so the bug class can't recur.

---

### Files touched (preview)

- `supabase/functions/_shared/node-readiness.ts`
- `src/lib/__tests__/node-readiness.test.ts`
- `src/lib/__tests__/safe-block.test.tsx` (new)
- `src/components/dashboard/builders/shared/YRSafeBoundary.tsx`
- `src/components/dashboard/builders/yr20/YR20Builder.tsx`
- `src/components/dashboard/builders/yr23/YR23Builder.tsx`
- `src/components/dashboard/builders/bp01/…` and `bp04/…` (publish-step wiring)
- `src/lib/node-slug-map.ts`
- `src/pages/MicrositePage.tsx` (RetreatPage + SponsorsPage parse-then-render)
- `src/components/AbbyHelpChatbot.tsx` (suppression list)
- One DB migration: `node_registry` slug update + `author_nodes` backfill (delivery_url, transformation_arc, audience_profile).
