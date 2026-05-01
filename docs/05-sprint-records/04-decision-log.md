# 04 · AB Decision Log

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- Project memory + sprint summaries

---

Every architectural decision and the reason for it. Append-only.

## 2026-05 — Uniform `library_asset` readiness contract (Sprint 54)

**Decision:** Replace the per-node `hasRequiredAssets` switch with one rule: a node is 100% Live when `content_json.library_asset.url` is set AND `library_asset.kind === REQUIRED_KIND[nodeId]`. The 28-row REQUIRED_KIND table lives in `docs/02-business-rules/02-node-readiness-gates-full-spec.md`. Native files are DOCX (most nodes), PPTX (slide nodes), `audio_zip` (BA-11), `email_sequence` (BP-01), `podcast_pack` (BA-14), `external_url` (BP-04, BP-09).

**Reason:** "Live" was inconsistent across builders — some checked Stripe, some checked an external connector, some had no gate at all. Authors saw nodes flip 60% ↔ Live arbitrarily (BP-06 Workbook bug). Tying readiness to a saved end-state file makes "Live" mean the same thing for every node and decouples it from commerce wiring.

**Implication:** All 28 stuck-Live rows for the test author "Be SUCKcessful" were reset to `content_ready` in the same sprint. Going forward, the `save-author-node` publish action synthesises a `library_asset` from existing evidence (pdf_url, course_id, sections, etc.) and falls back to legacy gates for rows published before Sprint 54. Per-builder writes of `library_asset` will land in subsequent sprints.

---


## 2026-04 — Stripe Express only for author payouts

**Decision:** Permanently remove PayPal and Wise as payout rails. Stripe Express is the only supported rail.

**Reason:** Stripe Express now covers all four target markets (US, SG, AU, NZ). Maintaining three rails tripled the auth-edge-case surface for a single integration. One rail = simpler ops + better author experience.

**Implication:** Authors in unsupported regions must wait for Stripe Express expansion. Admin manual payout (bank transfer) handles edge cases.

---

## 2026-04 — GoHighLevel fully removed (Sprint 45)

**Decision:** Strip all GHL OAuth, calls, references, and copy from code, DB, and UI.

**Reason:** ABBY Nurture Engine (Sprint 28) replicated GHL's marketing-automation surface natively. Maintaining GHL OAuth + the manual reconnect ritual cost more than the integration delivered. Native flow is faster, cheaper, and on-brand.

**Implication:** Marketing Hub is now fully native. Authors no longer connect GHL.

---

## 2026-04-23 — Temperature ban on `openai/gpt-5*`

**Decision:** Never pass a `temperature` override on `openai/gpt-5*` Lovable AI Gateway calls.

**Reason:** Gateway returns 400 for any value other than the default (1). Audit (`mem://audits/manus-2026-04-23-corrections`) found multiple generators silently failing.

**Implication:** Complex-structure generators that wanted lower temperature (0.2) had to switch to non-gpt-5 models or accept default temperature.

---

## 2026-Q1 — Commerce Engine v1: Authors Bureau as Merchant of Record

**Decision:** All reader payments flow into platform Stripe account; author Stripe Express is back-office payout only.

**Reason:** (a) Authors don't need Stripe to start selling. (b) Single tax + invoice surface for buyers. (c) Eliminates the "Stripe disconnected → reader gets error" failure mode.

**Implication:** Platform fee = 8 % covers all gateway processing. Author always gets 92 %. Author Stripe state must NEVER appear in `hasRequiredAssets`.

---

## 2026-Q1 — Buffer removed (Sprint 37)

**Decision:** Drop Buffer integration; ABBY generates a 30-day calendar; author posts manually.

**Reason:** Buffer GraphQL was unreliable; many authors preferred manual control over auto-posting.

**Implication:** BP-03 is now content-only. The Social Designer (`compose-social-post`) renders graphics on demand.

---

## 2025-Q4 — ABBY Nurture Engine native (Sprint 28)

**Decision:** Replace GHL-driven marketing automation with a native flow: generate → review → go live → continuous AI nurture.

**Reason:** Faster, cheaper, no third-party OAuth fragility, brand-controlled UI.

**Implication:** Builders write `status='live'` directly to `author_nodes`. Marketing Hub watcher picks up live nodes and starts campaigns.

---

## 2026-05-01 — Master Architecture Registry as single source for node metadata (Sprint 47)

**Decision:** All node IDs, canonical labels, scopes, edge function paths, and category mappings live in a single registry table at `01-architecture/01-master-architecture-reference.md` §3. Every other doc derives from it; downstream divergences are bugs.

**Reason:** Sprint 46 produced 56 docs in parallel and several inherited stale facts (legacy generator paths, divergent NODE_NAME constants, BP-00 placement inconsistencies). A single authoritative table prevents drift.

**Implication:** When adding or renaming a node generator, the registry row MUST be updated first; `scripts/build-node-framework-docs.mjs` regenerates all 28 node docs from a mirrored TypeScript NODES array.

---

## 2026-05-01 — Defer generator file-path renames

**Decision:** Do NOT rename legacy generator file paths (`generate-bp06-online-course`, `generate-bp07-coaching`, `generate-bp08-mastermind`, `generate-bp09-speaking`, `generate-ba17-upsells`) in Sprint 47.

**Reason:** Edge function URLs are baked into deployed clients and cron jobs. A rename requires a coordinated client update + dual-deploy window. The internal `NODE_ID` constants are already correct, so functionality is unaffected.

**Implication:** Documentation flags the divergence (Master Architecture §3, bug #11). Rename can be scheduled when a deploy window opens.

---

## Adding new decisions

When making an architectural decision:

1. Append a section to this file with **Decision / Reason / Implication**.
2. Cross-link from the relevant sprint row in `01-sprint-log-master.md`.
3. Update affected docs in 01–04 same sprint.

## 2026-05-01 — `BP-00` is a pre-step, not a node (Sprint 47 follow-up)

**Decision:** There are exactly **28 nodes**. `BP-00` (`generate-bp00-analysis`) is an internal per-book book-analysis pre-step and MUST NOT be counted, listed in the node registry table, or surfaced to authors as a revenue stream.

**Reason:** The function and its `AnalyseBookGate.tsx` consumer were named `bp00` for sort consistency with the Brand Products family. Sprint 46 misread the `BP-` prefix and elevated the pre-step to "node #29", introducing a "29 IDs / 28 counted" framing that contradicted the canonical source `src/components/dashboard/builders/builderNodeConfig.ts` (which contains 28 entries) and core memory (ABBY 9-9-10 = 28).

**Implication:** Master reference §3a now documents BP-00 as a pre-step. All counters and registry tables across `/docs/` and the build scripts state 28 nodes. The stale `// Single source of truth for all 30 nodes` comment in `builderNodeConfig.ts` was also corrected to 28.

## Sprint 54 — Uniform `library_asset` readiness contract (2026-05-01)

**Decision**: Replace per-node readiness rules with a single uniform gate: `library_asset.url` + `library_asset.kind === REQUIRED_KIND[nodeId]`. Three-format output (DOCX + PDF + TXT) for every `docx` kind.

**Why**: BP-06 Workbook showed 60% on the dashboard despite being marked Live, because the per-node legacy rule expected `title` while the builder writes `workbook_title`. The drift was likely to repeat across other nodes. A single contract removes the drift class.

**Scope landed this sprint**:
- New `REQUIRED_KIND` map + uniform gate in `supabase/functions/_shared/node-readiness.ts` (legacy switch retained as fallback).
- BP-06 legacy rule relaxed to accept `workbook_title` + `activated`/`sections` (fixes the immediate bug).
- Storage buckets `library-assets` (private) and `library-assets-public` (public) with author-folder RLS.
- Scaffold edge function `render-library-asset` (modes: `register`, `txt_only`).
- 84 new readiness test cases (152 total, all green).
- Audit script `scripts/audit-stuck-live.mjs`.
- Doc 02 + BP-06 framework updated; new memory `mem://business/uniform-readiness-contract`; governance rule added to `mem://process/docs-sprint-maintenance`.

**Deferred to follow-up sprints**: per-builder publish-step writes for the 28 nodes (BP first, then BA, then YR), full DOCX/PPTX/PDF rendering inside `render-library-asset`, Library UI consolidation, `library_asset_history[]` versioning.

**Stripe**: still excluded from readiness (Merchant-of-Record principle preserved).
