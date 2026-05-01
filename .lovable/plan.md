## Goal

Rewrite every document in `/docs/` from scratch with high integrity, sourced directly from the **live code, the live Supabase schema, and the live ABBY edge-function prompts** — not from the existing doc text. Then deliver as **(a) updated repo files, (b) a ZIP archive, and (c) a single combined master PDF** for offline reading.

The existing 51 files map 1:1 to the framework's 6 categories, so structure stays. Content gets fully regenerated.

## Source-of-truth pinning (non-negotiable)

Every doc will be sourced from one of these — **never from the previous doc text**:

| Source | Pulled by |
|---|---|
| `src/components/dashboard/builders/builderNodeConfig.ts` | All node labels, categories, emojis |
| `supabase/functions/_shared/canonical-node-labels.ts` | Edge-side label parity |
| Live Supabase `information_schema` + `pg_catalog` | Database schema (110 tables, all columns, FKs, enums, RLS policies) |
| `supabase/functions/<name>/index.ts` | Every ABBY prompt verbatim, every NODE_NAME, NODE_ID |
| `src/components/dashboard/builders/<node>/` | What the author does in each builder |
| `src/pages/MicrositePage.tsx` + microsite components | What the reader experiences |
| `mem://index.md` Core rules | Strategic philosophy, forbidden phrases, business constraints |
| `git log` + `docs/05-sprint-records/` | Sprint history, decisions, bug registry |

If a doc says "X" but the code says "Y", the **code wins** and the doc is rewritten.

## Deliverables

```text
1. /docs/  — 51 fully rewritten markdown files (in repo)
2. /mnt/documents/authors-bureau-docs.zip  — same files, downloadable
3. /mnt/documents/AB_Master_Documentation.pdf  — all 51 docs combined, navigable
```

## Work plan (6 phases, ~51 files)

### Phase 1 — Foundation (Category 1: Architecture, 5 files)
1. **Master Architecture Reference** — 7 engines, 28 nodes, tech stack, sprint roadmap, competitive position. Pull engine list from edge function folders + memory.
2. **Database Schema — Complete** — auto-generated from live Supabase: every table, column, type, default, FK, enum, RLS policy. 110 tables.
3. **Engine Architecture Map** — one section per engine (Email, Funnel, Course, Commerce, Sessions, Podcast, CRM, plus Nurture). What it does, tables read/written, edge functions, external services.
4. **Node Connector Map** — 28 nodes × engine matrix. Native engines only.
5. **Technology Stack — Current** — React 18, Vite 5, Tailwind v3, TS 5, Supabase, Lovable AI Gateway (gpt-5.2 + gemini-3-flash-preview), Stripe Express only, Resend, ElevenLabs, Buffer (status: removed Apr 2026 per memory).

### Phase 2 — Business Rules (Category 2, 5 files)
1. **Count Business Rules v3** — 28-node universe, author vs book scoping, two-gate live rule, BP-00 exclusion clause.
2. **Node Readiness Gates — Full Spec** — for **all 28 nodes**: exact `hasRequiredAssets()` logic pulled from `src/lib/nodeRegistry.ts` and per-builder code.
3. **Product Lifecycle Rules** — `draft → ready_for_review → live → archived`, transitions, who triggers each.
4. **Stripe Connection Rules** — Express-only, 8% platform fee, payout-vs-commerce separation, BuyNowButton gate.
5. **Author-Level vs Book-Level Registry** — definitive 16/12 split with rationale per node.

### Phase 3 — ABBY AI (Category 3, 7 files) — **highest priority per framework**
1. **Master Prompt Architecture** — persona (warm, expert, encouraging), forbidden technical terms, book-context adaptation pattern.
2. **System Prompt — Current Version (v?)** — exact extraction from `business-consultant/index.ts` + `abby-help-chat/index.ts`, version-stamped.
3. **Node Activation Prompts — All 28** — exact prompt block extracted from each `generate-<node>/index.ts`. Verbatim, one section per node.
4. **Content Generation Prompts** — email sequences, social packs, media kits, JV emails, narration scripts, course outlines. Extracted from `generate-email-sequence`, `generate-social-content`, `compose-social-post`, `generate-podcast-season`, etc.
5. **CRM Intelligence Prompts** — Daily Intelligence Report, lead scoring, hot lead notifications. From `generate-daily-insight`, `generate-nudges`, `abby-daily-report`.
6. **ABBY Score Algorithm** — exact rules + pipeline stage thresholds, sourced from CRM scoring code.
7. **Autonomous Actions Registry** — every trigger → ABBY action pair, sourced from DB triggers + edge function callers.

### Phase 4 — 28 Node Frameworks (Category 4, 28 files) — **deep technical spec**
Each node doc gets the **7 framework sections + 5 technical sections**:

```text
1. What it is (plain English, 1 paragraph)
2. What ABBY builds (engine + generated artifacts)
3. What the author does (step-by-step in the builder)
4. What the reader experiences (microsite/email journey)
5. Readiness gate (exact hasRequiredAssets code block)
6. Revenue model (one-time / recurring / high-ticket)
7. Dependencies (prerequisite nodes, engine connections)
--- Technical appendix ---
8. content_json schema (TypeScript interface)
9. Edge functions (generate-*, exporters, webhooks)
10. Database tables read/written
11. ABBY prompt (verbatim, collapsed)
12. UI source files (builder + microsite components)
```

Each node doc estimated at 4–6 pages. Source: `src/components/dashboard/builders/<node>/`, `supabase/functions/generate-<node>/`, microsite components.

### Phase 5 — Sprint Records (Category 5, 4 files)
1. **Sprint Log Master** — backfilled from existing log + `git log` for sprints 1–52.
2. **Sprint Prompt Archive** — preserve existing entries, add structure for future sprints.
3. **Bug Registry** — preserved + reorganized by status (open/resolved).
4. **Decision Log** — every architectural decision (GHL removal, Buffer removal, Stripe-only, 8% fee, etc.) with date + rationale, sourced from `mem://` Core rules.

### Phase 6 — User Experience (Category 6, 4 files)
1. **Design Rules** — dark navy + gold, category colors (Brand=Teal, Build=Indigo, Yield=Amber), banned UI terms, ABBY tone.
2. **Author Journey Map** — sign-up → book upload → BP-00 analysis → 28-node activation → first revenue.
3. **Reader Journey Map** — microsite discovery → quiz → email list → purchase → upsell, mapped across nodes.
4. **Test Account Credentials** — pointer doc only (real creds stay out of repo).

### Phase 7 — Bundle + PDF (deliverables)
1. Update `/docs/README.md` as the master index with links to all 51 files.
2. Build `/mnt/documents/authors-bureau-docs.zip` containing the entire `/docs/` tree.
3. Concatenate all markdown into one file with a TOC, render via `pandoc → PDF` (or reportlab if pandoc/LaTeX unavailable). Output `/mnt/documents/AB_Master_Documentation.pdf`.
4. **Mandatory PDF QA**: convert PDF to images, inspect every page for clipping/overlap, fix and re-render until clean.

## Integrity guard rails (run at the end)

```text
- rg sweep: zero forbidden phrases ("Live Audience Conversion Toolkit", "Sponsors & Exhibitors",
  "29 nodes", "GHL", "PayPal", etc.) anywhere in /docs/
- rg sweep: every node referenced uses canonical labels from builderNodeConfig.ts
- node scripts/check-slug-parity.mjs — must stay green
- vitest run canonical-labels-parity.test.ts — must stay green
- Every "Edge function:" path in node docs must resolve to a real folder in supabase/functions/
- Every table named in Database Schema doc must exist in information_schema
```

## What I will NOT do (per memory rules)

- Will not edit `src/integrations/supabase/{client,types}.ts`, `.env`, or `supabase/config.toml` project-level settings.
- Will not invent prompts — if a generator's prompt is not in code, the doc says "(no AI generation step)".
- Will not include emdashes in any author/reader-facing copy referenced (memory rule).
- Will not use the term "GHL", "Buffer" (except in decision-log historical entries), "PayPal", or "Wise" anywhere in current-state docs.
- Will not store real test credentials in the repo — only references.

## Estimated scope

- **51 markdown files** (5 + 5 + 7 + 28 + 4 + 4 + README + bundle index) ~ 18,000–25,000 lines total.
- **1 ZIP** + **1 PDF** in `/mnt/documents/`.
- Multi-step execution; I'll work category-by-category and pause if something material is unclear.

## Approval

Once approved, I switch to build mode and begin with **Phase 1 (Architecture)** since every later doc references the engines and schema established there. ABBY (Phase 3) gets extra care because the framework rates it as the most perishable.