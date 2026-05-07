
# Sprint 10 — Slide Decks for Live-Delivery Nodes

## Findings (correcting the audit)

- **YR-21 is not a regression.** `author_nodes` has **zero** rows for `YR-21` (and `BP-03`) across the entire platform. The 404 is correct — the node never reached `live` for anyone. Sprint 9's backfill is not the cause.
- **Slide infrastructure already exists.** `supabase/functions/export-pro-slides/index.ts` is a universal PptxGenJS exporter (3 themes, 6 auto-picked layouts). `nodeAssetRegistry.ts` already declares `slides` assets for BP-05, BP-09, YR-21, YR-22, YR-26, YR-27 and the Library download button calls `export-pro-slides` — but the **generators don't write a `slides[]` array** into `content_json`, so the asset never lights up.
- **Real gap:** content-shape, not a new feature. Each generator just needs to emit a `slides: [{title, body, notes?}, ...]` array (or nested e.g. `weeks[i].slides`) alongside its existing output, and the registry needs to be expanded for BA-10, BA-13, YR-23, YR-25.

## Scope

### A. P0 bug fixes (publish-path, not data restore)

1. **YR-21 Keynote Speaking** — generator (`generate-yr21-speaking`) likely fails before write or the builder's publish step never invokes `publishNodeToSite`. Trace `generate-yr21-speaking` end-to-end against Pauline's account, fix the failing path (probably the same `delivery_type` / status flip class as Sprint 9's BP-01/BP-04).
2. **BP-03** — same diagnosis sweep; zero rows platform-wide.
3. **BA-13 builder shows Step 1 despite live page** — read `_currentStep` from `content_json` on resume in `BA13Builder.tsx` (Sprint 8 builder-resume pattern); currently it defaults to step 1 even when `status='live'`.

### B. P1 — Slide arrays in 5 priority generators

For each generator, extend the AI prompt + JSON schema to also emit a `slides[]` array using this shape:

```
slides: [
  { title: string, body: string, notes?: string, layout_hint?: "hero"|"stat"|"quote"|"divider"|"bullets"|"split" }
]
```

| Node | Generator | Slide source | Target count |
|---|---|---|---|
| YR-22 Corporate Training | `generate-yr22-training` | per-module → `modules[i].slides[]` + top-level `slides[]` digest | ~40–50 |
| BA-13 Group Coaching | `generate-ba13-group-coaching` | per-week → `weeks[i].slides[]` (10 each) | ~80 |
| BA-10 Online Course | `generate-ba10-course` | per-module → `modules[i].slides[]` | ~30–40 |
| YR-25 Certification | `generate-yr25-certification` | per-module trainer deck | ~40 |
| BP-05 Webinars | `generate-bp05-webinars` | per-topic webinar deck | ~25 each |

### C. P1 — Registry & UI

- Extend `src/lib/nodeAssetRegistry.ts`:
  - Add `slides` (and per-week/per-module nested keys where applicable) to BA-10, BA-13, YR-23, YR-25.
  - Add `sizeHint` returning `"N slides"` for each.
- `AssetRow.tsx` already calls `export-pro-slides` — confirm it handles nested `weeks[i].slides` paths via the existing `pluck()` helper (looks like it does; verify and extend if not).

### D. P2 — Pitch decks (lower volume, same mechanism)

Add a small `pitch_deck[]` (5–10 slides) to: BA-16 Affiliates, BA-18 JV, YR-27 Fundraising, YR-28 Sponsors. Registry already has `pitch_deck` on YR-27; mirror for the others.

### E. Tests

- Vitest fixtures in `src/lib/__tests__/node-readiness.test.ts` covering the new content shape (no readiness rule changes — slides are bonus assets, not part of the gate).
- One Deno test per modified edge function asserting `result.content_json.slides` is a non-empty array of `{title, body}`.

### F. QA

For Pauline's "Be SUCKcessful":
1. Re-run YR-21 + BP-03 generators end-to-end → confirm `live`, microsite returns 200.
2. Re-run YR-22, BA-13, BA-10, YR-25, BP-05 generators → open Library → download `.pptx` → render with LibreOffice headless → `pdftoppm` → visually confirm slides aren't placeholder/empty (per our PPTX QA rule).

## Files touched

- `supabase/functions/generate-yr22-training/index.ts`
- `supabase/functions/generate-ba13-group-coaching/index.ts`
- `supabase/functions/generate-ba10-course/index.ts`
- `supabase/functions/generate-yr25-certification/index.ts`
- `supabase/functions/generate-bp05-webinars/index.ts`
- `supabase/functions/generate-yr21-speaking/index.ts` *(bug fix only)*
- `supabase/functions/generate-bp03-*` *(bug fix only)*
- `supabase/functions/export-pro-slides/index.ts` *(only if nested-key resolution needs widening)*
- `src/lib/nodeAssetRegistry.ts`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` *(resume step bug)*
- `src/lib/__tests__/node-readiness.test.ts`
- `docs/04-node-frameworks/{YR-21,YR-22,BA-10,BA-13,YR-25,BP-05}.md` — add "Slide deck" to the deliverables list.

## Out of scope

- New PPTX template engine — we already have `export-pro-slides`.
- Author-branded theming beyond the 3 existing themes — defer to a future sprint once content quality is validated.
- Audit's BA-15/BA-14/BA-16/BA-18/YR-20/YR-27/YR-28 P3 items — covered partially by Section D, full pitch-deck polish deferred.

## Execution order

1. P0 bug fixes (YR-21, BP-03, BA-13 resume) — small, unblock the audit.
2. YR-22 first (highest content quality already → cleanest test of the slides path end-to-end).
3. Roll the same prompt pattern across BA-13, BA-10, YR-25, BP-05.
4. Registry + Library QA.
5. P2 pitch decks.
