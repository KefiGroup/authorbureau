# 01 · AB Master Architecture Reference

_Version 3.3 · 2026-05-01 · single source of truth_

**Source(s) of truth:**
- `src/components/dashboard/builders/builderNodeConfig.ts` (canonical node IDs + labels)
- `supabase/functions/_shared/node-readiness.ts` (`AUTHOR_LEVEL_NODES`, `COMMERCE_NODES`, `hasRequiredAssets`)
- `mem://project/master-architecture-constraints-v2`
- `mem://architecture/abby-7-engines-master-plan`

> Every other doc in `/docs/` MUST defer to this file for node IDs, canonical labels, scopes, edge function paths, and category names. If a downstream doc disagrees with this file, this file wins and the downstream doc is the bug.

---

## 1. What Authors Bureau Is

Authors Bureau (AB) is an **AI-driven platform that turns a single published book into up to 28 scalable revenue streams**. The book is the **hook**, never the business. Every product, programme, and audience-building tactic is sequenced through the **ABBY Framework**:

| Letter | Phase | Node count |
|---|---|---|
| **A** | Analyse Book & Develop Strategies | 0 nodes (pre-step only — see §3a) |
| **B** | Brand Products | 9 (BP-01 → BP-09) |
| **B** | Build Authority | 9 (BA-10 → BA-18) |
| **Y** | Yield Revenue | 10 (YR-19 → YR-28) |

| Type | Count |
|---|---|
| **Total nodes** | **28** (BP-01 → BP-09, BA-10 → BA-18, YR-19 → YR-28) |
| **Counted toward "X / 28 Live"** | **28** (every node) |
| Author-level | 16 |
| Book-level | 12 |

There are exactly **28 revenue nodes**, as defined by `src/components/dashboard/builders/builderNodeConfig.ts`. The "A" phase of ABBY is a one-time book-analysis pre-step (`generate-bp00-analysis`), not a node — it has no builder UI, no `author_nodes` row, no readiness gate, and no Live status. It is documented in §3a below.

The platform is single-tenant per author, multi-book per author, and all reader-facing purchases are processed by Authors Bureau as **Merchant of Record**.

## 2. Category names — code vs UI vs framework

`builderNodeConfig.ts` uses three short category strings; the UI and framework use longer labels:

| Code value | Framework label | UI accent colour |
|---|---|---|
| `build` | **Brand Products** (BP-01 → BP-09) | Teal |
| `bridge` | **Build Authority** (BA-10 → BA-18) | Indigo |
| `yield` | **Yield Revenue** (YR-19 → YR-28) | Amber |

> The code value `build` does **not** mean "Build Authority" — it means "Brand Products". This is a known historical mismatch; do NOT rename either side. Read the table above when in doubt.

## 3. Canonical Node Registry (the master table)

**Authority order, when sources disagree:**

1. `builderNodeConfig.ts` `label` (canonical UI label)
2. The category mapping in §2
3. The author-level / book-level set in `node-readiness.ts`
4. The edge function path on disk

Generator-internal `NODE_NAME` constants are centrally enforced via `supabase/functions/_shared/canonical-node-labels.ts` (Sprint 48). Each generator calls `getCanonicalNodeLabel(NODE_ID)`, and `upsertAuthorNode` overrides any non-canonical string at write time.

**Sprint 49 — DB-level node hardening (Half A):** A `public.node_registry` table now holds the 28 canonical nodes (id, label, category, archetype, microsite slug, display order) as a SQL source of truth. `author_nodes.node_id` and `crm_contacts.last_node_id` are now FK-constrained to it (unknown IDs are rejected at the DB layer). A `BEFORE INSERT/UPDATE` trigger on `author_nodes` forces `node_name` to `node_registry.canonical_label` on every write — a DB-level mirror of the TS guard rail. `compute_node_microsite_url` reads slugs from the registry instead of a hardcoded `CASE`.

**Sprint 50 — Edge function folder rename (Half B):** All five legacy-named generator folders were renamed to match their canonical node labels (`generate-bp06-workbook`, `generate-bp07-home-study`, `generate-bp08-special-editions`, `generate-bp09-book-sales`, `generate-ba17-bundles`). The 5 client invoke/fetch sites in the BP-06/07/08/09 + BA-17 builders were updated in lockstep. Two-phase deploy: new function names deployed first, then old names deleted. All filename divergences are now resolved.

| ID | Canonical label | Framework category | Scope | Edge function (verified on disk) | Notes |
|---|---|---|---|---|---|
| BP-01 | Email Marketing | Brand Products | **Author** | `generate-bp01-email-marketing` | — |
| BP-02 | Lead Magnet | Brand Products | Book | `generate-bp02-lead-magnets` (+ `generate-bp02-social-pack`, `bp02-activate-funnel`) | Multi-function node |
| BP-03 | Social Media | Brand Products | **Author** | `generate-bp03-social-media` (+ `bp03-node-state`) | — |
| BP-04 | Author Website | Brand Products | Book | `generate-bp04-website` | — |
| BP-05 | Webinars | Brand Products | Book | `generate-bp05-webinars` | — |
| BP-06 | Workbook | Brand Products | Book | `generate-bp06-workbook` | Sprint 50 rename |
| BP-07 | Home Study Course | Brand Products | Book | `generate-bp07-home-study` | Sprint 50 rename |
| BP-08 | Special Editions | Brand Products | Book | `generate-bp08-special-editions` | Sprint 50 rename |
| BP-09 | Book Sales | Brand Products | Book | `generate-bp09-book-sales` | Sprint 50 rename |
| BA-10 | Online Course | Build Authority | Book | `generate-ba10-online-course` | — |
| BA-11 | Audiobook | Build Authority | Book | `generate-ba11-audiobook` (+ `ba11-audiobook-generate`, `ba11-publish-audiobook`, `ba11-voice-preview`) | Multi-function node (TTS pipeline) |
| BA-12 | Membership | Build Authority | Book | `generate-ba12-membership` | — |
| BA-13 | Group Coaching | Build Authority | Book | `generate-ba13-group-coaching` | Code comment in readiness gate says "BA-13 is a paid offer" but rule does not enforce a commerce signal. Documented in readiness spec. |
| BA-14 | Podcast Tour | Build Authority | **Author** | `generate-ba14-podcast` | — |
| BA-15 | Media & PR | Build Authority | **Author** | `generate-ba15-media-pr` | — |
| BA-16 | Affiliates | Build Authority | **Author** | `generate-ba16-affiliate` (singular) | — |
| BA-17 | Bundles | Build Authority | Book | `generate-ba17-bundles` | Sprint 50 rename |
| BA-18 | JV Partnerships | Build Authority | **Author** | `generate-ba18-jv-partnerships` | — |
| YR-19 | 1-on-1 Coaching | Yield Revenue | **Author** | `generate-yr19-coaching` | Session-style |
| YR-20 | Big Ticket Consulting | Yield Revenue | **Author** | `generate-yr20-big-ticket` | — |
| YR-21 | Speaking | Yield Revenue | **Author** | `generate-yr21-speaking` | — |
| YR-22 | Corporate Training | Yield Revenue | **Author** | `generate-yr22-corporate` | Session-style |
| YR-23 | Mastermind | Yield Revenue | **Author** | `generate-yr23-mastermind` | Session-style |
| YR-24 | Retreats | Yield Revenue | **Author** | `generate-yr24-retreats` | Session-style |
| YR-25 | Certification | Yield Revenue | **Author** | `generate-yr25-certification` | — |
| YR-26 | Conference | Yield Revenue | **Author** | `generate-yr26-conference` | — |
| YR-27 | Fundraising | Yield Revenue | **Author** | `generate-yr27-fundraising` | — |
| YR-28 | Sponsors | Yield Revenue | **Author** | `generate-yr28-sponsors` | — |

### Author-level vs Book-level (authoritative)

- **Author-level (16)** — set in `node-readiness.ts → AUTHOR_LEVEL_NODES`: BP-01, BP-03, BA-14, BA-15, BA-16, BA-18, YR-19 through YR-28.
- **Book-level (12)** — every other node (BP-02, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09, BA-10, BA-11, BA-12, BA-13, BA-17).

### Commerce nodes (informational only — does NOT gate Live)

Set in `node-readiness.ts → COMMERCE_NODES`: BP-06, BP-07, BP-09, BA-10, BA-12, BA-13, BA-17, YR-19 through YR-28.

### Session-style YR nodes (require `session_type` OR `booking_url`)

YR-19, YR-22, YR-23, YR-24.

## 3a. Pre-step: Initial Book Analysis (NOT a node)

**Edge function:** `generate-bp00-analysis`
**Status:** Internal pre-step. Not in `builderNodeConfig.ts`. No builder UI. No `author_nodes` row. No readiness gate. No Live counter.

**What it does:** Runs ABBY's book analysis for a specific book and writes an `author_context` row keyed on `(author_id, book_id)`. This row is the prerequisite for every framework-heavy generator (BP-01..05, BA-10..18, YR-19..28). When a generator finds no context row for the active book it returns `contextBlocked` and the UI prompts the author to run this step via `AnalyseBookGate.tsx`.

**Why the `BP-00` ID exists:** The function and gate component were named `bp00` for ordering / sort consistency with the Brand Products family. The `BP-00` string is an internal function identifier only — it is NOT a node ID and must never be counted, listed in the registry table, or rendered to authors as a revenue stream.

## 4. The 7 Native Engines

| # | Engine | Powers | Owner tables |
|---|--------|--------|---------------|
| 1 | **Email Engine** | All transactional + marketing email | `email_lists`, `email_flows`, `email_send_log`, `email_templates` |
| 2 | **Funnel Engine** | Lead magnets, quizzes, microsite forms, opt-ins | `funnels`, `funnel_submissions`, `leads` |
| 3 | **Course Engine** | Workbooks, home study, online courses, memberships | `courses`, `course_modules`, `course_lessons`, `course_enrollments` |
| 4 | **Commerce Engine** | All paid offers (one-time + recurring) | `author_nodes` (registry), `purchases`, `platform_config` |
| 5 | **Sessions Engine** | 1:1 coaching, group cohorts, webinars, retreats | `coaching_packages`, `consultation_sessions` |
| 6 | **Podcast Engine** | Author podcast tour (BA-14) | `podcasts`, `podcast_episodes` |
| 7 | **CRM Engine** | Contact pipeline, scoring, daily report, nudges | `crm_contacts`, `crm_activity_log`, `crm_contact_tags`, `abby_nudges` |

## 5. External services (5 total — locked)

| Service | Used for | Notes |
|---|---|---|
| **Stripe** | Reader checkout (platform Merchant of Record) + author payouts (Express only) | Sprint 44: PayPal/Wise permanently removed. |
| **Resend** | Transactional + marketing email send | Single sender domain `notify.authorsbureau.com`. |
| **Thinkific** | Optional course delivery for BA-10 / YR-22 / YR-25 | Per-author subdomain. |
| **Transistor.fm** | Podcast hosting + RSS for BA-14 | One show per author. |
| **ElevenLabs** | Audiobook TTS (BA-11) | V2 pipeline. |
| **Lovable AI Gateway** | All LLM + image generation | Models: `openai/gpt-5.2`, `google/gemini-3-flash-preview`, `google/gemini-3-flash-image-preview`. |

Removed (do NOT reintroduce): GoHighLevel (Sprint 45), Buffer (Sprint 37), PayPal & Wise (Sprint 44), Daily.co (Sprint 30).

## 6. Two-Gate Live Rule

A node is "Live" on a dashboard counter ONLY if BOTH:

1. `author_nodes.status = 'live'`, AND
2. `hasRequiredAssets(nodeId, content_json)` returns `true` from the **single** module `supabase/functions/_shared/node-readiness.ts` (re-exported via `src/lib/node-readiness.ts`).

Forking this logic into a second file caused the 22 → 26 → 24 counter drift fixed in Sprint 33. Never duplicate.

## 7. Commerce model (locked)

- Authors Bureau is **Merchant of Record** on every reader transaction.
- Platform fee = **8 %** (`platform_config.platform_fee_percent`, default `0.08`).
- The 8 % covers ALL Stripe processing fees (checkout + Connect transfer). Author always receives **92 %** of gross — gateway fees are NEVER deducted from the author's share.
- Author's Stripe Express connection is **payout-only**. It does NOT gate Live status. Authors without Stripe still publish; only the reader `<BuyNowButton>` shows a graceful "coming soon" modal.
- Reader checkout always flows through `create-checkout-session` to the platform Stripe account.
- Dual webhook: `verify-purchase` (sync) + `process-purchase` (async).

## 8. Tech Stack (top-level)

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, Radix, framer-motion, react-router-dom (query-param routing), @tanstack/react-query, recharts.
- **Backend**: Lovable Cloud (Supabase Postgres + Edge Functions on Deno).
- **Auth**: Supabase Auth (email + Google), `getActiveToken()` + `fetchWithTimeout()` standard.
- **AI**: Lovable AI Gateway (no API keys in client).
- **Hosting / CDN**: Lovable.

See `05-technology-stack-current.md` for the full table.

## 9. Sprint Roadmap (recent)

| Sprint | Focus | Doc impact |
|---|---|---|
| 28 | ABBY Nurture Engine — GHL replaced | engines, business rules |
| 30 | Daily.co removed | tech stack |
| 33 | Counter-drift fix — single readiness module | business rules |
| 34 | ABBY Email Engine + 4-tab Marketing Hub | engine 1, BP-01/02/05 |
| 36b | Buffer integration → rolled back in 37 | (rolled back) |
| 37 | ABBY Social Designer (`compose-social-post`) | BP-03 framework |
| 39 | Commerce Engine v1 + 8 % fee + dual webhook | engine 4, business rules |
| 43 | Cross-platform email sync (`sync-author-email`) | architecture |
| 44 | Stripe Express only — PayPal/Wise removed | payouts |
| 45 | GHL fully removed from code, DB, copy | terminology |
| 46 | Documentation Sprint v3 — 6-category /docs | every category |
| 47 | Documentation corrections — canonical registry | this file + every other doc |
| 48 | Canonical node-label alignment — `canonical-node-labels.ts` shared module + `upsertAuthorNode` guard rail + 4-row backfill + BA-15/BA-16 asset-pack swap | this file (§3 divergence flags cleared) |
| 49 | DB-level node hardening — `node_registry` table, FKs, BEFORE trigger forcing canonical labels, `compute_node_microsite_url` reads from registry | this file (§3 hardening note) |
| 50 | Edge function folder rename — 5 mismatched generators (`bp06-online-course→workbook`, `bp07-coaching→home-study`, `bp08-mastermind→special-editions`, `bp09-speaking→book-sales`, `ba17-upsells→bundles`) renamed; 5 client invoke sites updated; old functions deleted | this file (§3 filenames now canonical) |
| 51 | Final root-cause cleanup — 18 generators converted from hardcoded `NODE_NAME` to `getCanonicalNodeLabel(NODE_ID)`; BA-10 local `upsertAuthorNode` removed in favour of shared helper; `get-microsite-page` now resolves slugs via `node_registry`; vitest parity test (`canonical-labels-parity`) + `scripts/check-slug-parity.mjs` lock TS↔edge↔DB agreement at build time | this file (v3.3) |

## 10. Competitive Position

AB is the only platform that combines:

1. AI-driven **strategic consulting** (ABBY) tailored to one author's book.
2. Native **content generation** for 28 specific revenue streams.
3. **Merchant of Record** commerce so authors don't need to set up Stripe to publish.
4. End-to-end **deployment** (microsite, course host, RSS, payout) without developer intervention.

---

_For the full memory inventory powering this document, see `mem://index.md`._
