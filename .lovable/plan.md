# Sprint 48 — Canonical Node Label Alignment

Closes the label-drift bug class with a single source of truth, a guard rail, and a one-shot DB backfill. Does NOT touch filenames, archetype triggers, or DB-level enforcement (those are Sprint 49).

## Files touched

**New (1)**
- `supabase/functions/_shared/canonical-node-labels.ts` — frozen `Record<string, string>` of all 28 canonical labels + `getCanonicalNodeLabel(id)` helper.

**Edited (6)**
- `supabase/functions/generate-bp09-speaking/index.ts` — replace `NODE_NAME = "Live Audience Conversion Toolkit"` with `getCanonicalNodeLabel("BP-09")` (= "Book Sales").
- `supabase/functions/generate-ba16-affiliate/index.ts` — same pattern → "Affiliates".
- `supabase/functions/generate-ba17-upsells/index.ts` — same pattern → "Bundles".
- `supabase/functions/generate-yr20-big-ticket/index.ts` — same pattern → "Big Ticket Consulting".
- `supabase/functions/_shared/builder-helpers.ts` — at top of `upsertAuthorNode`, force `nodeName = getCanonicalNodeLabel(nodeId)` whenever a canonical entry exists; if the caller passed a different string, log a `console.warn` (silent guard rail — never blocks the write).
- `src/lib/assetPackRegistry.ts` — rewrite all 28 `node_name` strings to canonical labels AND swap the BA-15 ↔ BA-16 `bonus_*` payloads (Press Kit prompt belongs on BA-15 Media & PR; Affiliate Swipe Pack belongs on BA-16 Affiliates).

**Migration (1 — data-only, 4 rows)**
```sql
UPDATE author_nodes SET node_name = 'Book Sales'            WHERE node_id = 'BP-09' AND node_name <> 'Book Sales';
UPDATE author_nodes SET node_name = 'Affiliates'            WHERE node_id = 'BA-16' AND node_name <> 'Affiliates';
UPDATE author_nodes SET node_name = 'Bundles'               WHERE node_id = 'BA-17' AND node_name <> 'Bundles';
UPDATE author_nodes SET node_name = 'Big Ticket Consulting' WHERE node_id = 'YR-20' AND node_name <> 'Big Ticket Consulting';
```

**Doc (1)**
- `docs/01-architecture/01-master-architecture-reference.md` — remove the four "diverges from canonical" notes from §3 (bug fixed). Add Sprint 48 row to §9.

**Memory (1)**
- New `mem://architecture/canonical-node-labels` — enforces shared module + forbids hardcoded `NODE_NAME` strings in future generators.

## What stays unchanged

- All edge function URLs / filenames (no `supabase.functions.invoke()` callers break).
- All `node_id` values everywhere (gating, readiness, commerce, payouts, ABBY chat, microsite routing).
- Every author's `personalised_name` (Stripe titles + microsite cards keep author overrides).
- No Stripe products recreated; only the fallback display string changes for 4 products.

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Stripe Checkout shows new title for unpersonalised BP-09 / BA-16 / BA-17 / YR-20 | Low (1 row each) | Acceptable — new title is canonical UX label. |
| Microsite "Collector's Edition" / Subscribe card text changes | Low | Only when `personalised_name` is null. |
| Future generator copy-paste re-introduces drift | Medium | Guard rail in `upsertAuthorNode` auto-corrects + memory rule blocks it in AI sessions. |
| Hidden consumer of `node_name` somewhere | Low | Full repo grep confirmed only 2 read sites (`create-checkout-session`, two microsite cards). Both already prefer `personalised_name`. |

## Deploy order

1. Ship the 6 file edits + new shared module (one commit).
2. Run the 4-row UPDATE migration.
3. Edge functions auto-deploy; smoke-test by running BP-09 / BA-16 / BA-17 / YR-20 generators on a test book and verifying `author_nodes.node_name` matches canonical.
4. Update master reference doc + regenerate `authors-bureau-docs-v3.3.zip`.
5. Save memory `mem://architecture/canonical-node-labels`.

## Rollback plan

If anything goes wrong, the canonical-label module is additive and the guard rail is a no-op for any node_id not in the map. Revert the 6 file edits and the 4 UPDATEs (replace with old strings) — fully reversible in <2 minutes.

---

# Sprint 49 — Single-Source-of-Truth Hardening (tracked, NOT shipping in 48)

Logged here so the deeper root causes are not forgotten. This is a separate ~2-day sprint that requires its own approval before execution.

**Scope:**
1. New `node_registry` DB table (id PK, label, slug, archetype, scope, category) — populated from `builderNodeConfig.ts` once.
2. Add CHECK constraint `author_nodes.node_id IN (SELECT id FROM node_registry)`.
3. Replace hardcoded slug list in `compute_node_microsite_url` with a `SELECT slug FROM node_registry WHERE id = p_node_id`.
4. Replace hardcoded archetype map in `author_nodes_autofill_delivery_url` and `crm_contacts_autofill_archetype` with the same lookup.
5. DB trigger on `author_nodes` INSERT/UPDATE that auto-fills `node_name` from `node_registry.label` (DB-side equivalent of the Sprint 48 app-side guard rail).
6. Rename the 6 legacy edge function directories to match their canonical IDs, with backward-compat redirect functions for any in-flight callers.
7. Full grep sweep of ABBY system prompts, email templates, and microsite copy for stale labels — fix any survivors.

I will write Sprint 49 as a standalone plan when you're ready to tackle it.
