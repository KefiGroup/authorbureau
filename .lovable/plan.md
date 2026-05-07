# Authors Bureau — Bug Fix Sprint Brief (Revised)

**Prepared for:** Lovable Development Team
**Revised by:** Lovable, incorporating corrections to the Manus 7 May 2026 draft
**Account tested:** support@paulineteo.com — Book: *Be SUCKcessful*

---

## What changed vs. the Manus draft

1. Sprint 1: Option A (`library_asset` backfill) is the only correct long-term fix. Option B is downgraded to a temporary unblocker.
2. Sprint 1, Step 1: use the existing `scripts/audit-stuck-live.mjs` instead of adding fresh `console.log` instrumentation.
3. Sprint 1: verify `REQUIRED_KIND` map and canonical labels (esp. YR-26) before backfilling.
4. Sprint 2: heading renamed — uses canonical **Sponsors**, not the forbidden legacy "Exhibitors & Sponsors".
5. Sprint 4: do **not** split AI generation into two sequential calls. Use the existing `callAiGateway` auto-retry + raise `max_completion_tokens` first; splitting only as a last resort.
6. Sprint 4: replace "section-by-section streaming progress" with a simple elapsed-time spinner; streaming is descoped to its own future sprint.
7. OBS #2: completion copy follows the Strategic Rule ("the book is the HOOK") — point authors to next-stage actions, not a generic "you're done".
8. Additional Items: SQL query corrected to actually surface broken rows (`WHERE ap.id IS NULL`).
9. New regression check added: 4 microsite-less nodes (BP-01, BP-03, BP-08, BP-09) must NOT show a microsite URL chip.
10. New verification step: confirm dashboard book card, `useBookNodeProgress`, and MultiBookPicker all hit `author-stats.perBook` (single source of truth per memory).

---

## Sprint Order

| # | Bug | Severity | Effort |
|---|-----|----------|--------|
| 1 | BUG #5 — 7/28 counter | P0 Critical | Medium |
| 2 | BUG #3 + #4 — Raw JSON on live pages (YR-24, YR-28) | P1 High | Low |
| 3 | BUG #1 + Label drift sweep | P2 Medium | Low |
| 4 | BUG #2 — AI generation timeout (YR-23 etc.) | P2 Medium | Medium |
| 5 | OBS #2 + #3 — Stale "Next Steps" + Abby z-index | P3 Low | Low |

---

## Sprint 1 — P0: Fix the 7/28 Counter

**Symptom.** After publishing all 28 nodes, dashboard + Book Hub show 7/28. Abby Snapshot shows "28 of 28 unlocked, 7 built" — DB gate passes, content gate fails on 21 nodes.

**Root cause.** Sprint 54 introduced the uniform `library_asset.{url, kind}` contract as the primary readiness gate, with `legacyHasRequiredAssets()` as transitional fallback. Per the Library Asset Adoption memory, only **BP-01, BP-03, BP-04, BP-06, BP-09** currently write a real `library_asset` on publish. The other 23 builders rely on the legacy fallback, and the AI's `content_json` shape doesn't satisfy the per-node clauses for most of them.

### Step 1 — Diagnose using the existing audit script

Run `scripts/audit-stuck-live.mjs` (already in repo, designed for exactly this). It produces a JSON map of every `status='live'` row, classified as `using_uniform_contract` vs `using_legacy_fallback`, with per-node sample failures. No new code needed.

If per-author granularity is required, extend the script with an optional `--author-id` flag rather than adding `console.log` to the production readiness module.

### Step 2 — Pre-flight verification

Before backfilling, confirm:

- `REQUIRED_KIND[nodeId]` in both the audit script and `02-node-readiness-gates-full-spec.md` matches `builderNodeConfig.ts` canonical labels for all 28 nodes. Specifically verify YR-26's canonical name (the docs currently list "Licensing"; cross-check against `builderNodeConfig.ts`).
- `books.author_id` for `support@paulineteo.com` actually resolves to a row in `author_profiles.id` (see Additional Items below — this is the silent-fail trap).

### Step 3 — Fix path: backfill `library_asset` (Option A, the real fix)

For each of the 23 generators that don't yet stamp `library_asset`, update their `publishNode()` / publish handler so that on successful publish they write:

```ts
content_json.library_asset = {
  kind: REQUIRED_KIND[nodeId],
  url:  liveDeliverableUrl,
  pdf_url: pdfUrl ?? null,
  txt_url: txtUrl ?? null,
  title:  resolvedTitle,
  saved_at: new Date().toISOString(),
}
```

This aligns every node with the Sprint 54 architecture and removes reliance on per-node legacy clauses.

**Option B (loosen legacy clauses) is NOT preferred** and should only be used for any node where producing a uniform `library_asset` is genuinely blocked (e.g., a deliverable type that doesn't yet exist). Each such exception must be documented in the Library Asset Adoption memory.

### Step 4 — Counter consistency

Confirm all three surfaces read from `author-stats.perBook[bookId]` (Edge Function User Resolver memory: this is the single source of truth):

- Dashboard book card
- Book Hub category tab headers (`useBookNodeProgress`)
- MultiBookPicker chips

If any surface has its own counter logic, consolidate. Forking `node-readiness.ts` is forbidden.

### Step 5 — Vitest fixtures

Add a fixture per node in `src/lib/__tests__/node-readiness.test.ts` using a real AI-generated `content_json` payload. Each test asserts the uniform `library_asset` path passes; nodes still on the legacy fallback assert that path too, with a TODO marker.

### Step 6 — Verify

Login as support@paulineteo.com → dashboard reads **28/28** (Brand 9/9, Build 9/9, Yield 10/10). Book Hub reads "28 of 28 products built — 100% complete".

---

## Sprint 2 — P1: Fix Raw JSON Rendering (YR-24 Retreats, YR-28 Sponsors)

**Symptom.** Live microsite pages display raw JSON:
- `/pauline-teo/retreat` Transformation Arc: `{"stage":"...","shift_from":"...","shift_to":"...","proof_of_progress":"..."}`
- `/pauline-teo/sponsors` Audience: `{"demographics":"...","psychographics":"...","buying_triggers":"..."}`

**Root cause.** AI returns parsed objects via `parseAiJson`. The renderer is stringifying an already-parsed object (e.g., interpolating it directly into JSX). It is NOT a parse failure.

**Fix.** Renderer-side only. Do not add `JSON.parse()`.

Pattern to apply in the YR-24 and YR-28 microsite section components:

```tsx
{typeof transformationArc === 'object' && transformationArc !== null ? (
  <div>
    <p><strong>Stage:</strong> {transformationArc.stage}</p>
    <p><strong>From:</strong> {transformationArc.shift_from}</p>
    <p><strong>To:</strong> {transformationArc.shift_to}</p>
    <p><strong>Proof of Progress:</strong> {transformationArc.proof_of_progress}</p>
  </div>
) : (
  <p>{transformationArc}</p>
)}
```

Recommended: extract a shared `renderStructuredField(value, fieldMap)` utility in `src/lib/` for any future nested-object section.

**Verify.** Reload `/pauline-teo/retreat` and `/pauline-teo/sponsors` — no JSON braces visible.

---

## Sprint 3 — P2: Canonical Label Sweep

Per Canonical Node Labels memory (Sprints 48–52). Single source of truth: `src/components/dashboard/builders/builderNodeConfig.ts` via `getCanonicalNodeLabel(nodeId)`.

| Node | Drift found | Canonical |
|------|-------------|-----------|
| YR-20 | Toast says "Big Ticket Consulting" | Big Ticket Offers |
| BA-14 | Toast says "Podcast Tour" | Podcast |
| BA-18 | Builder header says "Revenue Sharing" | JV Partnerships |
| YR-28 | Builder header says "Exhibitors & Sponsors" (forbidden phrase) | Sponsors |

**Fix per node:**

1. Update `builderNodeConfig.ts` if the canonical entry is missing or wrong.
2. Replace any hardcoded label in toast templates / headers / slug generators with `getCanonicalNodeLabel(nodeId)`.
3. URL slug derived from canonical label (kebab-case).
4. `rg` sweep across `src/` and `supabase/functions/` for the legacy strings; replace remaining instances.
5. Confirm the existing build-time parity test (`canonical-labels-parity.test.ts`) still passes; add cases for the 4 nodes if absent.

---

## Sprint 4 — P2: AI Generation Reliability (YR-23 etc.)

**Symptom.** YR-23 Mastermind times out on first attempt; retry succeeds.

**Root cause.** Complex generators (4+ content sections) approach the AI gateway timeout window. The 90s client `invokeWithTimeout` is the client half only.

**Fix — in this order; only escalate if the prior step doesn't resolve:**

1. **Verify auto-retry is wired.** Per ABBY Error Resilience memory, `callAiGateway` already implements retry-with-backoff and `parseAiJsonResilient`. Confirm BA-13, YR-23, YR-24, YR-25, YR-28 generators all route through `callAiGateway` (not bare `fetch`/`invoke`).
2. **Raise `max_completion_tokens`** for those generators (within the 16k Complex Structure Generation budget). Do **NOT** add a `temperature` override — gpt-5.2 only accepts default temperature; passing one returns gateway 400.
3. **Client UX:** on the silent retry, show a single elapsed-time indicator: "Abby is still thinking… (this can take up to 90s for complex builders)". Only surface the manual "Try Again" CTA if both attempts fail, and include a coded-error reference per the resilience layer convention.
4. **Last resort only:** split a single generator into two sequential calls. This is discouraged because (a) it doubles failure surface, (b) it loses context between section N and section N+1, (c) per-call latency overhead adds up. If splitting is necessary, the second call must receive the first call's output as context.

**Streaming progress / per-section indicators are descoped** — that requires Lovable AI Gateway streaming wiring and belongs in its own sprint.

**Verify.** Trigger YR-23 on a fresh test account; first attempt completes within timeout.

---

## Sprint 5 — P3: Stale "Next Steps" + Abby Widget Z-Index

### OBS #2 — Stale "Next 3 Steps"

**Fix.** In the recommender, filter `status === 'live'` before selecting next 3. When `liveCount === 28`, replace the "Next 3 Steps" block with a completion state aligned to the Strategic Rule:

> "All 28 revenue streams are live. Your book has done its job as the hook — now let's grow the business it points to."
>
> CTAs: **Open Marketing Hub** (nurture flows) · **Open Revenue Dashboard** (optimise conversion).

No emoji confetti, no "you're done" framing — keep the focus on the next stage.

### OBS #3 — Abby widget covers Generate button

**Fix.** Preferred: delay Abby auto-open by 3s on `/dashboard?section=...` builder routes. Fallback: lower the widget's z-index below the primary CTA when the builder is in Step 1/2. Apply on BA-18, YR-23, YR-24 (and as a default for all builder pages).

---

## Additional Items

### Silent-fail trap — `books.author_id` → `author_profiles.id`

Run with the proper predicate to actually surface broken rows:

```sql
SELECT b.id, b.title, b.author_id
FROM   books b
LEFT   JOIN author_profiles ap ON ap.id = b.author_id
WHERE  ap.id IS NULL;
```

If any rows return, those books will silently report 0/28 regardless of node state. Backfill `books.author_id` from the corresponding `author_profiles.id` (matched by `owner_email` per the Book Ownership Lookup standard).

### Microsite URL chip — BP-01, BP-03, BP-08, BP-09

These 4 author-level / non-microsite nodes must NOT render a microsite URL chip on their dashboard cards. Add a render-time assertion or unit test confirming `compute_node_microsite_url()` returns null and the chip is suppressed.

---

## Acceptance Criteria

Verified using support@paulineteo.com:

- [ ] Dashboard shows **28/28 streams built** (Brand 9/9, Build 9/9, Yield 10/10).
- [ ] Book Hub shows "28 of 28 products built — 100% complete".
- [ ] `audit-stuck-live.mjs` reports `using_legacy_fallback: 0` (or only documented exceptions).
- [ ] `/pauline-teo/retreat` and `/pauline-teo/sponsors` render no raw JSON.
- [ ] YR-20 toast: "Your Big Ticket Offers is now live!"; BA-14 toast: "Your Podcast is now live!"; BA-18 + YR-28 use canonical labels everywhere.
- [ ] YR-23 generates within timeout on first attempt on a fresh account.
- [ ] When 28/28 live, Book Hub shows the "book is the hook" completion state — not "Next 3 Steps".
- [ ] Abby widget never overlaps the primary CTA on builder pages.
- [ ] All 28 nodes have Vitest fixtures in `node-readiness.test.ts`.
- [ ] `books.author_id → author_profiles.id` join verified for the test account; no orphan rows.
- [ ] BP-01, BP-03, BP-08, BP-09 dashboard cards do not render a microsite URL chip.
- [ ] `docs/02-business-rules/02-node-readiness-gates-full-spec.md` updated to reflect the post-Sprint-1 state (per Docs Sprint Maintenance memory).

---

*Revised by Lovable · 7 May 2026*
