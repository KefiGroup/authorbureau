#!/usr/bin/env node
/**
 * Manus Master Documentation Framework — v3 builder.
 * Writes all docs that are not produced by build-docs.mjs / build-doc-03.mjs.
 *
 * Layout:
 *   docs/
 *     README.md
 *     01-architecture/{01,04,05}*.md
 *     02-business-rules/*.md
 *     03-abby-ai/{04,05,06,07}*.md
 *     04-node-frameworks/{README + 28 nodes}.md
 *     05-sprint-records/*.md
 *     06-user-experience/*.md
 *
 * Source-of-truth pointers are included in each file's header so that
 * future sprints know where to refresh content from.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const VERSION = "3.0";
const DATE = "2026-05-01";

const w = (rel, body) => {
  const full = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
};
const header = (title, sources = []) =>
  `# ${title}\n\n_Version ${VERSION} · ${DATE}_\n\n` +
  (sources.length
    ? `**Source(s) of truth:**\n${sources.map((s) => `- ${s}`).join("\n")}\n\n---\n\n`
    : `---\n\n`);

// ───────────────────────────────────────────────────────────────────────────
// docs/README.md  (top-level index, replaces old)
// ───────────────────────────────────────────────────────────────────────────
w(
  "README.md",
  `# Authors Bureau — Engineering Documentation

_Version ${VERSION} · ${DATE}_

This folder is the **single source of truth** for the Authors Bureau platform's architecture, business rules, AI prompts, schema, node behaviour, and process. It is committed to GitHub alongside the code so every sprint can reference and update it.

The folder structure mirrors the **Authors Bureau Master Documentation Framework** by Manus AI (May 1, 2026).

## Categories

| # | Category | Purpose |
|---|----------|---------|
| 01 | [Architecture](./01-architecture/) | What is built and why — the system at the highest level |
| 02 | [Business Rules](./02-business-rules/) | How the system counts and decides — the rules that prevent bugs |
| 03 | [ABBY AI](./03-abby-ai/) | What ABBY says and does — the most fragile and most valuable IP |
| 04 | [Node Frameworks](./04-node-frameworks/) | One document per node (28 total) |
| 05 | [Sprint Records](./05-sprint-records/) | What was built, when, and why — the audit trail |
| 06 | [User Experience](./06-user-experience/) | What the author and reader actually see |

## Quick links

- [Master Architecture Reference](./01-architecture/01-master-architecture-reference.md)
- [Database Schema (live)](./01-architecture/02-database-schema-current.md)
- [Engine Architecture Map](./01-architecture/03-engine-architecture-map.md)
- [Node Readiness Gates — Full Spec](./02-business-rules/02-node-readiness-gates-full-spec.md)
- [ABBY System Prompt — Current](./03-abby-ai/02-system-prompt-current.md)
- [ABBY Node Activation Prompts](./03-abby-ai/03-node-activation-prompts.md)
- [28 Node Frameworks Index](./04-node-frameworks/README.md)
- [Be SUCKcessful walkthrough](./06-be-suckcessful-test.md)

## Maintenance rule (locked)

> Every sprint must update the relevant doc(s) under \`/docs/\` **before** the sprint is marked complete.

| Change shipped | Docs that must be touched |
|---|---|
| Database migration | \`01-architecture/02-database-schema-current.md\` + relevant entries in \`02-business-rules/\` |
| New node generator or builder | \`04-node-frameworks/<id>.md\` + \`03-abby-ai/03-node-activation-prompts.md\` + sprint log |
| New engine / table / external service | \`01-architecture/03-engine-architecture-map.md\` + \`01-architecture/04-node-connector-map.md\` |
| Tech stack swap | \`01-architecture/05-technology-stack-current.md\` + decision log |
| Change to ABBY system prompt | bump version in \`03-abby-ai/02-system-prompt-current.md\` + add Changelog row |
| Persona / philosophy / forbidden term | \`03-abby-ai/01-master-prompt-architecture.md\` |
| Readiness gate change | \`02-business-rules/02-node-readiness-gates-full-spec.md\` |
| Pricing / fee / payout / Stripe behaviour | \`02-business-rules/04-stripe-connection-rules.md\` + decision log |
| New bug found / fixed | \`05-sprint-records/03-bug-registry.md\` |
| Architectural decision | \`05-sprint-records/04-decision-log.md\` |

This rule is also stored in project memory at \`mem://process/docs-sprint-maintenance\` so future AI sessions enforce it automatically.

## Regeneration

\`\`\`bash
node scripts/build-docs.mjs        # 03-abby-ai/01–02 + database schema
node scripts/build-doc-03.mjs      # 03-abby-ai/03 (node activation prompts)
node scripts/build-docs-v3.mjs     # everything else (this manifest)
node scripts/package-docs.mjs      # zips /docs to /mnt/documents/authors-bureau-docs-v3.zip
\`\`\`

The scripts read directly from \`supabase/functions/\`, \`src/\`, and the live database, so docs always reflect what is actually in production.

---
_Last regenerated: ${DATE}_
`,
);

// ───────────────────────────────────────────────────────────────────────────
// 01 — ARCHITECTURE
// ───────────────────────────────────────────────────────────────────────────

w(
  "01-architecture/01-master-architecture-reference.md",
  header("01 · AB Master Architecture Reference", [
    "`mem://project/master-architecture-constraints-v2`",
    "`mem://architecture/abby-7-engines-master-plan`",
    "`src/components/dashboard/builders/builderNodeConfig.ts`",
    "`supabase/functions/_shared/node-readiness.ts`",
  ]) +
    `## 1. What Authors Bureau Is

Authors Bureau (AB) is an **AI-driven platform that turns a single published book into up to 28 scalable revenue streams**. The book is the **hook**, never the business. Every product, programme, and audience-building tactic is sequenced through the **ABBY Framework**:

| Letter | Phase | # Nodes |
|---|---|---|
| **A** | Analyse Book & Develop Strategies | 0 (pre-step only) |
| **B** | Brand Products | 9 |
| **B** | Build Authority | 9 |
| **Y** | Yield Revenue | 10 |

Total: **28 nodes** (BP-01 → BP-09, BA-10 → BA-18, YR-19 → YR-28). The "A" phase is a one-time book-analysis pre-step (\`generate-bp00-analysis\`), not a node — no builder UI, no \`author_nodes\` row, no Live status.

The platform is **single-tenant per author**, multi-book per author, and all reader-facing purchases are processed by Authors Bureau as **Merchant of Record**.

## 2. The 7 Native Engines

| # | Engine | Powers | Owner tables |
|---|--------|--------|---------------|
| 1 | **Email Engine** | All transactional + marketing email | \`email_lists\`, \`email_flows\`, \`email_send_log\`, \`email_templates\` |
| 2 | **Funnel Engine** | Lead magnets, quizzes, microsite forms, opt-ins | \`funnels\`, \`funnel_submissions\`, \`leads\` |
| 3 | **Course Engine** | Workbooks, home study, online courses, memberships | \`courses\`, \`course_modules\`, \`course_lessons\`, \`course_enrollments\` |
| 4 | **Commerce Engine** | All paid offers (one-time + recurring) | \`author_nodes\` (registry), \`purchases\`, \`platform_config\` |
| 5 | **Sessions Engine** | 1:1 coaching, group cohorts, webinars, retreats | \`coaching_packages\`, \`consultation_sessions\` |
| 6 | **Podcast Engine** | Author podcast tour (BA-14) | \`podcasts\`, \`podcast_episodes\` |
| 7 | **CRM Engine** | Contact pipeline, scoring, daily report, nudges | \`crm_contacts\`, \`crm_activity_log\`, \`crm_contact_tags\`, \`abby_nudges\` |

External services used (and their role):

| Service | Used for | Notes |
|---|---|---|
| **Stripe** | Reader checkout + author payouts (Express) | AB is Merchant of Record. Express only — never PayPal/Wise. |
| **Resend** | Transactional + marketing email send | Single sender domain \`notify.authorsbureau.com\`. |
| **Thinkific** | Optional course delivery for BA-10 / YR-25 | Per-author subdomain. |
| **Transistor.fm** | Podcast hosting + RSS for BA-14 | One show per author. |
| **ElevenLabs** | Audiobook TTS (BA-11) | V2 pipeline. |
| **Lovable AI Gateway** | All LLM + image generation | Models: \`openai/gpt-5.2\`, \`google/gemini-3-flash-preview\`, \`google/gemini-3-flash-image-preview\`. |

## 3. The 28 Nodes (canonical labels)

| ID | Label | Category | Author / Book scope |
|---|---|---|---|
| BP-01 | Email Marketing | Brand | **Author** |
| BP-02 | Lead Magnet | Brand | Book |
| BP-03 | Social Media | Brand | **Author** |
| BP-04 | Author Website | Brand | Book |
| BP-05 | Webinars | Brand | Book |
| BP-06 | Workbook | Brand | Book |
| BP-07 | Home Study Course | Brand | Book |
| BP-08 | Special Editions | Brand | Book |
| BP-09 | Book Sales | Brand | Book |
| BA-10 | Online Course | Build | Book |
| BA-11 | Audiobook | Build | Book |
| BA-12 | Membership | Build | Book |
| BA-13 | Group Coaching | Build | Book |
| BA-14 | Podcast Tour | Build | **Author** |
| BA-15 | Media & PR | Build | **Author** |
| BA-16 | Affiliates | Build | **Author** |
| BA-17 | Bundles | Build | Book |
| BA-18 | JV Partnerships | Build | **Author** |
| YR-19 | 1-on-1 Coaching | Yield | **Author** |
| YR-20 | Big Ticket Consulting | Yield | **Author** |
| YR-21 | Speaking | Yield | **Author** |
| YR-22 | Corporate Training | Yield | **Author** |
| YR-23 | Mastermind | Yield | **Author** |
| YR-24 | Retreats | Yield | **Author** |
| YR-25 | Certification | Yield | **Author** |
| YR-26 | Conference | Yield | **Author** |
| YR-27 | Fundraising | Yield | **Author** |
| YR-28 | Sponsors | Yield | **Author** |

Source of truth: \`src/components/dashboard/builders/builderNodeConfig.ts\` and \`supabase/functions/_shared/node-readiness.ts\` (\`AUTHOR_LEVEL_NODES\` set).

## 4. Tech Stack (top-level)

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, Radix, framer-motion, react-router-dom, @tanstack/react-query, recharts.
- **Backend**: Lovable Cloud (Supabase Postgres + Edge Functions on Deno).
- **Auth**: Supabase Auth (email + Google), \`getActiveToken()\` + \`fetchWithTimeout()\` standard.
- **AI**: Lovable AI Gateway (no API keys in client).
- **Hosting / CDN**: Lovable.

See \`05-technology-stack-current.md\` for the full table including versions.

## 5. Two-Gate Live Rule

A node is "Live" on a dashboard counter ONLY if BOTH:

1. \`author_nodes.status = 'live'\` in the database, AND
2. \`hasRequiredAssets(nodeId, content_json)\` returns \`true\` (single source of truth: \`supabase/functions/_shared/node-readiness.ts\`).

This prevents the "X / 28 Live" counter from drifting when an author clicks Activate without producing any content. See \`02-business-rules/02-node-readiness-gates-full-spec.md\` for every rule.

## 6. Commerce model (locked)

- Authors Bureau is **Merchant of Record** on every reader transaction.
- Platform fee = **8 %** (\`platform_config.platform_fee_percent\`, default \`0.08\`).
- The 8 % covers ALL Stripe processing fees (checkout + Connect transfer). Author always receives **92 %** of gross — gateway fees are NEVER deducted from the author's share.
- Author's Stripe Express connection is **payout-only**. It does NOT gate Live status. Authors without Stripe still publish; only the reader \`<BuyNowButton>\` shows a graceful "coming soon" modal.
- Reader checkout always flows through \`create-checkout-session\` to the platform Stripe account.

## 7. Sprint Roadmap (recent)

| Sprint | Focus | Doc impact |
|---|---|---|
| 28 | ABBY Nurture Engine — GHL replaced | engines, business rules |
| 34 | ABBY Email Engine + Marketing Hub | engine 1, BP-01/02/05 |
| 36b | Buffer integration → later removed | engine map (rolled back) |
| 37 | ABBY Social Designer (compose-social-post) | BP-03 framework |
| 39 | Commerce Engine v1 + 8% fee + dual webhook | engine 4, business rules |
| 44 | Stripe Express only — PayPal/Wise removed | payouts |
| 45 | GHL fully removed from code, DB, copy | terminology |
| 46 | Documentation Sprint v3 (this) | every category |

## 8. Competitive Position

AB is the only platform that combines:

1. AI-driven **strategic consulting** (ABBY) tailored to one author's book.
2. Native **content generation** for 28 specific revenue streams.
3. **Merchant of Record** commerce so authors don't need to set up Stripe to publish.
4. End-to-end **deployment** (microsite, course host, RSS, payout) without developer intervention.

---

_For the full memory inventory powering this document, see \`mem://index.md\`._
`,
);

// 02 — database schema is auto-generated by build-docs.mjs (kept).

// 03 — engine architecture map already exists at 01-architecture/03 (kept).

w(
  "01-architecture/04-node-connector-map.md",
  header("04 · AB Node Connector Map", [
    "`mem://architecture/third-party-connector-registry-v2`",
    "`supabase/functions/_shared/node-readiness.ts`",
  ]) +
    `Every node is powered by one or more of the **7 native engines**. External connectors are intentionally minimal — five total — and are only used where the engine itself can't deliver.

## Native engine ↔ node mapping

| Node | Primary engine(s) | External connector |
|---|---|---|
| BP-00 Initial Analysis | (no engine — AI only) | — |
| BP-01 Email Marketing | Email | Resend (send) |
| BP-02 Lead Magnet | Funnel + Email | Resend |
| BP-03 Social Media | (content store only) | — (Buffer removed Apr 2026) |
| BP-04 Author Website | (microsite renderer) | — |
| BP-05 Webinars | Sessions + Email | — |
| BP-06 Workbook | Course + Commerce | Stripe |
| BP-07 Home Study Course | Course + Commerce | Stripe (+ optional Thinkific) |
| BP-08 Special Editions | Commerce | Stripe |
| BP-09 Book Sales | Commerce | Stripe + (Amazon link only) |
| BA-10 Online Course | Course + Commerce | Stripe + Thinkific |
| BA-11 Audiobook | (TTS pipeline) | ElevenLabs (TTS), ACX (manual) |
| BA-12 Membership | Commerce (recurring) | Stripe |
| BA-13 Group Coaching | Sessions + Commerce | Stripe + Zoom (link only) |
| BA-14 Podcast Tour | Podcast | Transistor.fm |
| BA-15 Media & PR | (asset store) | — |
| BA-16 Affiliates | CRM + Commerce | Stripe (payout) |
| BA-17 Bundles | Commerce | Stripe |
| BA-18 JV Partnerships | CRM | — |
| YR-19 1-on-1 Coaching | Sessions + Commerce | Stripe + Zoom (link) |
| YR-20 Big Ticket Consulting | Commerce | Stripe |
| YR-21 Speaking | (asset store) | — |
| YR-22 Corporate Training | Sessions + Commerce | Stripe (+ optional Thinkific) |
| YR-23 Mastermind | Sessions + Commerce | Stripe |
| YR-24 Retreats | Sessions + Commerce | Stripe |
| YR-25 Certification | Course + Commerce | Stripe + Thinkific |
| YR-26 Conference | Commerce + Sessions | Stripe |
| YR-27 Fundraising | Commerce | Stripe |
| YR-28 Sponsors | Commerce | Stripe |

## Connector registry (exhaustive — only 5)

| Connector | Purpose | Author-side setup | Platform-side |
|---|---|---|---|
| **Stripe (platform)** | Reader checkout (Merchant of Record) | none | always-on |
| **Stripe Express (author)** | Author payout — back-office only | optional (admin can pay manually) | platform Stripe Connect |
| **Resend** | All outbound email | none | platform key, single domain |
| **Thinkific** | Optional course delivery | per-author subdomain (BA-10/YR-22/YR-25 only) | platform key |
| **Transistor.fm** | Podcast hosting (BA-14) | none — auto-provisioned | platform key |
| **ElevenLabs** | Audiobook TTS (BA-11) | none | platform key |

## Removed connectors (do not reintroduce)

| Connector | Removed in | Reason | Replacement |
|---|---|---|---|
| **GoHighLevel (GHL)** | Sprint 45 | OAuth fragility + cost; ABBY Nurture Engine covers same scope natively | Email Engine + CRM Engine |
| **Buffer** | Sprint 37 | API unreliable; authors preferred manual control | ABBY-generated 30-day calendar; author posts manually |
| **PayPal / Wise** | Sprint 44 | Stripe Express covers all 4 target markets (US, SG, AU, NZ) | Stripe Express only |

This zero-tolerance policy keeps the connector surface small and the platform reliable.
`,
);

w(
  "01-architecture/05-technology-stack-current.md",
  header("05 · AB Technology Stack — Current", [
    "`package.json`", "`vite.config.ts`", "`supabase/config.toml`",
    "`mem://architecture/third-party-connector-registry-v2`",
  ]) +
    `## Frontend

| Tech | Version | Role |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Bundler / dev server |
| TypeScript | 5 | Language |
| Tailwind CSS | v3 | Styling |
| shadcn/ui + Radix | latest | Primitive components |
| framer-motion | latest | Animation |
| react-router-dom | 6 | Routing (query-param based) |
| @tanstack/react-query | 5 | Server state |
| recharts | latest | Revenue dashboard charts |
| react-hook-form + zod | latest | Forms + validation |
| jspdf, docx, jszip | latest | Author export packages |
| pdfjs-dist, mammoth | latest | Manuscript parsing client-side |

## Backend

| Tech | Role |
|---|---|
| Lovable Cloud (Supabase) Postgres | Primary database |
| Supabase Auth | Email + Google sign-in |
| Supabase Edge Functions (Deno) | All server-side logic |
| Supabase Realtime | Reserved (not currently subscribed) |
| Supabase Storage | Audiobook + lead-magnet assets |

## AI

| Tech | Role |
|---|---|
| Lovable AI Gateway | All LLM calls (no API keys in client) |
| \`openai/gpt-5.2\` | Default generation model |
| \`google/gemini-3-flash-preview\` | Default chat model |
| \`google/gemini-3-flash-image-preview\` | Image / social-post composition |
| ElevenLabs (via edge function) | Audiobook narration |

## External services (5 total)

| Service | Sprint added | Notes |
|---|---|---|
| Stripe | early | Merchant of Record + Express payouts |
| Resend | early | Single sender domain \`notify.authorsbureau.com\` |
| Thinkific | sprint 19 | Optional course host |
| Transistor.fm | sprint 22 | Podcast RSS |
| ElevenLabs | sprint 25 | Audiobook TTS |

## Replaced / removed (history)

| Service | Removed in sprint | Replacement |
|---|---|---|
| GoHighLevel | 45 | Native ABBY Nurture Engine |
| Buffer | 37 | Manual posting + ABBY 30-day calendar |
| PayPal | 44 | Stripe Express |
| Wise | 44 | Stripe Express |
| Daily.co | 30 | Zoom links (manual paste) |

> When swapping a tool, update this table **and** add a row to \`05-sprint-records/04-decision-log.md\`.
`,
);

// ───────────────────────────────────────────────────────────────────────────
// 02 — BUSINESS RULES
// ───────────────────────────────────────────────────────────────────────────

w(
  "02-business-rules/01-count-business-rules-v2.md",
  header("01 · AB Count Business Rules (v2)", [
    "`supabase/functions/_shared/node-readiness.ts`",
    "`src/lib/__tests__/node-readiness.test.ts`",
  ]) +
    `## 1. The Universe — 28 nodes

Counters across the dashboard, microsite, and admin views always denominate to **28**. Source: \`builderNodeConfig.ts\` (28 entries: BP-01 → BP-09, BA-10 → BA-18, YR-19 → YR-28). \`BP-00\` is an internal book-analysis pre-step, not a node — never count it.

## 2. Author-level vs Book-level scoping

Some nodes apply across the author's entire library (one email list, one podcast, one social presence). Others are book-specific (microsite, workbook, audiobook).

- **Author-level (16 nodes)**: BP-01, BP-03, BA-14, BA-15, BA-16, BA-18, YR-19 through YR-28
- **Book-level (12 nodes)**: BP-02, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09, BA-10, BA-11, BA-12, BA-13, BA-17

Defined in \`AUTHOR_LEVEL_NODES\` set.

## 3. Two-Gate Live Rule

A node only counts as **Live** on any UI counter when both gates pass:

1. **Status gate**: \`author_nodes.status = 'live'\`
2. **Readiness gate**: \`hasRequiredAssets(nodeId, content_json)\` returns \`true\`

If gate 2 fails, the dashboard shows the node as "in progress" even if the row says live. The diagnostic \`warnIfStuckLive\` logs a warning in dev / edge function logs whenever a row drifts.

## 4. Counter Consistency Contract

Every consumer of "X / 28 Live" MUST import \`hasRequiredAssets\` from the **single shared module**:

- Edge function: \`supabase/functions/_shared/node-readiness.ts\`
- Frontend: re-exported via \`src/lib/node-readiness.ts\`

Forking this rule into a second file is what caused the historical 22 → 26 → 24 counter bug (Sprint 33). Never duplicate.

## 5. Per-node Readiness Gates

Full table in \`02-node-readiness-gates-full-spec.md\`. Special-gate nodes (richer rules):

- BP-01, BP-03, BP-04, BP-06, BP-07, BP-09
- BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-17
- YR-19 through YR-28 (commerce + session-style sub-rule)

All other nodes use the **generic gate**: any non-empty \`content_json\` object passes. This is intentional — the builders for those nodes save substantial content_json on every save, so a stricter gate would create false negatives.

## 6. Commerce Nodes — informational only

\`COMMERCE_NODES\` enumerates nodes that bear paid offers. **It does NOT gate Live status.** Reader payments always flow to the platform Stripe account regardless of author Stripe Express setup. See \`04-stripe-connection-rules.md\`.

## 7. Change-Management Rule

Adding or changing a readiness rule requires:

1. Edit \`supabase/functions/_shared/node-readiness.ts\` only.
2. Add or update tests in \`src/lib/__tests__/node-readiness.test.ts\`.
3. Update \`02-node-readiness-gates-full-spec.md\` in the same PR.
4. Add a row to \`05-sprint-records/04-decision-log.md\` if the rule changes economics or counter math.
`,
);

// Read the readiness file so the gates doc reflects it verbatim.
const readinessSrc = fs.readFileSync(
  path.join(ROOT, "supabase/functions/_shared/node-readiness.ts"),
  "utf8",
);
// Extract the switch body
const switchBody =
  readinessSrc.match(/switch \(nodeId\) \{([\s\S]*?)\n  \}\n\}/)?.[1] ?? "(switch body not found)";

w(
  "02-business-rules/02-node-readiness-gates-full-spec.md",
  header("02 · AB Node Readiness Gates — Full Specification", [
    "`supabase/functions/_shared/node-readiness.ts` (verbatim source below)",
  ]) +
    `For each of the 28 nodes, this document states the **exact** rule that \`hasRequiredAssets()\` applies before the dashboard counts the node as Live.

## Plain-English summary

| Node | Required content |
|---|---|
| BP-01 Email Marketing | A sequence exists with ≥ 1 step (\`email_sequence_id\` + \`steps[]\`) OR legacy \`sequence_steps[]\`. |
| BP-02 Lead Magnet | Generic gate (any non-empty content_json). Lead-magnet builder writes substantial content. |
| BP-03 Social Media | A 30-day calendar generated (\`posts_generated > 0\` OR \`content_calendar_id\` OR \`posts[]\`). |
| BP-04 Author Website | Primary anchor (\`hero_headline\` OR \`sections[]\`) AND ≥ 1 supporting field (about, subheadline, lead magnet). |
| BP-05 Webinars | Generic gate. |
| BP-06 Workbook | Title present AND (\`pdf_url\` OR commerce signal). |
| BP-07 Home Study | Title present AND (\`course_id\` OR commerce signal). |
| BP-08 Special Editions | Generic gate. |
| BP-09 Book Sales | Title present AND (\`amazon_url\` OR \`sales_page_url\` OR commerce signal). |
| BA-10 Online Course | Title present AND (\`course_id\` OR ≥ 1 module OR commerce signal). |
| BA-11 Audiobook | \`narration_script_url\` OR \`acx_guide_generated === true\` OR \`chapters[]\`. |
| BA-12 Membership | Title present AND \`stripe_price_id\`. |
| BA-13 Group Coaching | \`sessions[]\` OR \`schedule\` string. |
| BA-14 Podcast Tour | RSS ready AND ≥ 1 episode, OR activated + ≥ 2 episodes + show title. |
| BA-15 Media & PR | Press release (string OR object with headline + body) AND outlets list. |
| BA-16 Affiliates | Generic gate. |
| BA-17 Bundles | Title present AND ≥ 2 items AND commerce signal. |
| BA-18 JV Partnerships | Generic gate. |
| YR-19 to YR-28 | Title + commerce signal. **Session-style** (YR-19, YR-22, YR-23, YR-24) additionally need \`session_type\` OR \`booking_url\`. |

**Commerce signal** = any of: \`stripe_price_id\` set, \`price_usd > 0\`, \`suggested_price_usd > 0\`, OR a \`sales_tiers[]\` entry with \`price_usd > 0\`.

> There is **intentionally no Stripe-connection gate** in any rule. Authors Bureau is Merchant of Record — the platform's Stripe account always processes reader payments. Author payout setup is admin-side. See \`04-stripe-connection-rules.md\`.

## Verbatim source — the switch statement

\`\`\`typescript
${switchBody.trim()}
\`\`\`

## Generic fallback (default branch)

\`\`\`typescript
default:
  // Any object with at least one key passes. Used for BP-02, BP-05,
  // BP-08, BA-16, BA-18 where rich builders save substantial content_json
  // and per-shape gates would create more false negatives than benefits.
  return Object.keys(content).length > 0;
\`\`\`

## Diagnostic

\`\`\`typescript
warnIfStuckLive(nodeId, status, content, ctx?)
\`\`\`

Logs a one-line warning when a node has \`status === 'live'\` but fails the readiness gate. Pure side-effect, never throws.
`,
);

w(
  "02-business-rules/03-product-lifecycle-rules.md",
  header("03 · AB Product Lifecycle Rules", [
    "`author_nodes.status` enum",
    "`mem://features/product-lifecycle-management`",
    "`mem://ux/brand-products-hub-semantics`",
  ]) +
    `## States

| Status | Meaning | Set by |
|---|---|---|
| \`draft\` | Author opened the builder; nothing committed | initial seed |
| \`in_progress\` | Author has saved partial content | builder save |
| \`content_ready\` | Generator finished; content awaits review | generator |
| \`published\` (legacy) | Pre-Sprint 28 published state | legacy |
| \`live\` | Author hit Activate; visible to readers | Activate button OR generator with auto-live |
| \`archived\` | Author retired the node | archive action |

## Transitions

\`\`\`text
draft → in_progress → content_ready → live ↔ archived
\`\`\`

- \`content_ready\` and \`published_pending_ghl\` (legacy) are both treated as **Published** by the Brand Products hub UI.
- Only \`live\` (combined with the readiness gate) counts toward "X / 28 Live".

## Distinction from the readiness gate

Status is a **declared intent** ("the author wants this published"). The readiness gate (\`hasRequiredAssets\`) is a **factual check** ("is there actually enough content here to show readers?"). Both must pass for a node to count as Live. See \`02-node-readiness-gates-full-spec.md\`.

## Activation flow (post-Sprint 28)

1. Author finishes review in the builder.
2. Builder writes \`status = 'live'\` directly to \`author_nodes\` — **no GHL call, no external publish**.
3. Marketing Hub's Auto-Nurture engine picks up the live node and starts campaigns.
4. Reader-facing surfaces (microsite sections, BuyNowButton, learn page) check live + readiness and render accordingly.

## Archive

- Setting \`status = 'archived'\` removes the node from all counters and reader views.
- Underlying \`content_json\` is preserved so the author can re-activate later without losing work.
- Stripe products / prices are NOT auto-archived — admin handles those out-of-band.
`,
);

w(
  "02-business-rules/04-stripe-connection-rules.md",
  header("04 · AB Stripe Connection Rules", [
    "`mem://features/automated-payouts-stripe-only`",
    "`mem://architecture/commerce-engine-v1`",
    "`platform_config` table",
    "`supabase/functions/create-checkout-session/index.ts`",
    "`supabase/functions/_shared/node-readiness.ts`",
  ]) +
    `## Locked rules (do not violate)

1. **Authors Bureau is Merchant of Record** on every reader transaction. Reader payments always flow into the platform Stripe account via \`create-checkout-session\`.
2. **Platform fee = 8 %** (\`platform_config.platform_fee_percent\`, default \`0.08\`). Covers ALL Stripe processing fees (checkout + Connect transfer).
3. **Author always receives 92 %** of gross. Gateway fees are NEVER deducted from the author's share.
4. **Stripe Express only** for author payouts. Sprint 44 permanently removed PayPal and Wise — Express covers US, SG, AU, NZ.
5. **Author Stripe connection is back-office only.** It must NEVER appear in \`hasRequiredAssets()\` or affect node Live status.

## Locked author-facing copy

> "Authors Bureau retains an 8% platform fee to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. You keep 92% of every sale."

This wording is the only approved phrasing — do not paraphrase.

## What the author sees

| Author Stripe state | Author dashboard | Reader's Buy Now button |
|---|---|---|
| Connected (Express) | "Payouts on" badge | Charges normally → automated transfer |
| Not connected | "Set up payouts" CTA, no blocker on publishing | Charges normally → admin processes manual payout |
| Disconnected after live | Banner "Payouts paused — reconnect to resume automated transfers" | Continues to charge |

## Webhook architecture

Two webhooks fire on every successful checkout:

- \`verify-purchase\` — synchronous, returns confirmation to the reader UI.
- \`process-purchase\` — asynchronous, writes to \`purchases\`, enrols, fires emails.

This dual-pattern keeps the reader-facing checkout fast even when downstream fulfilment is slow.

## What the reader sees

- Reader microsites use \`<BuyNowButton>\`.
- If the author has no Stripe and no platform fallback price, button shows a graceful "coming soon" modal instead of an error.
- All checkouts go to platform Stripe — reader never sees author's payment account.

## Admin manual payouts

When automated transfer is unavailable (no Stripe Express on author), admins use the Payouts dashboard to process manually. \`author_payouts_v2\` records both automatic and manual payouts with provenance.
`,
);

w(
  "02-business-rules/05-author-vs-book-level-registry.md",
  header("05 · AB Author-Level vs Book-Level Node Registry", [
    "`supabase/functions/_shared/node-readiness.ts` (\`AUTHOR_LEVEL_NODES\`)",
  ]) +
    `## Why the distinction matters

Some products are **per-author** (one email list, one podcast, one social presence) — activating them once applies across every book in the author's library. Others are **per-book** (microsite, workbook, audiobook) and must be built individually for each book.

This affects:

- **Counters**: book hub shows "X / 28 Live for THIS book". Author-level live nodes count toward every book's counter.
- **Cross-book pushes**: a podcast episode for Book A also shows up in Book B's marketing automation if both books share the author.
- **Email list scoping**: BP-01 sequences live on the author's master list; book-specific tagging happens via \`crm_contact_tags\`.

## Author-level (16 nodes)

| ID | Label | Rationale |
|---|---|---|
| BP-01 | Email Marketing | One author = one master email list (Resend domain is shared) |
| BP-03 | Social Media | One author = one set of social channels |
| BA-14 | Podcast Tour | One show, multi-book episodes |
| BA-15 | Media & PR | Author bio + press kit, not book-specific |
| BA-16 | Affiliates | Author's affiliate programme spans all books |
| BA-18 | JV Partnerships | Joint ventures are author-to-author |
| YR-19 | 1-on-1 Coaching | Author's coaching practice |
| YR-20 | Big Ticket Consulting | Author's consulting practice |
| YR-21 | Speaking | Author's speaker kit |
| YR-22 | Corporate Training | Author's training menu |
| YR-23 | Mastermind | Author's mastermind |
| YR-24 | Retreats | Author's retreat schedule |
| YR-25 | Certification | Author's certification programme |
| YR-26 | Conference | Author's conference series |
| YR-27 | Fundraising | Author's fundraising offers |
| YR-28 | Sponsors | Author's sponsorship deck |

## Book-level (12 nodes)

| ID | Label | Rationale |
|---|---|---|
| BP-02 | Lead Magnet | Tied to the book's themes |
| BP-04 | Author Website | The book's microsite |
| BP-05 | Webinars | Book-specific webinar topic |
| BP-06 | Workbook | Book-specific companion |
| BP-07 | Home Study Course | Book-specific deep-dive |
| BP-08 | Special Editions | Book-specific bundles |
| BP-09 | Book Sales | Per-book sales channel config |
| BA-10 | Online Course | Book-specific curriculum |
| BA-11 | Audiobook | Book-specific narration |
| BA-12 | Membership | Book-specific recurring offer |
| BA-13 | Group Coaching | Book-specific cohort |
| BA-17 | Bundles | Book-specific bundles |

> \`BP-00\` (\`generate-bp00-analysis\`) is an internal per-book analysis pre-step, not a node. No \`author_nodes\` row, no builder UI, no Live status.
`,
);

console.log("01 + 02 written");

// ───────────────────────────────────────────────────────────────────────────
// 03 — ABBY AI (04–07)
// ───────────────────────────────────────────────────────────────────────────

w(
  "03-abby-ai/04-content-generation-prompts.md",
  header("04 · ABBY Content Generation Prompts", [
    "`supabase/functions/generate-email-sequence/index.ts`",
    "`supabase/functions/generate-asset-pack/index.ts`",
    "`supabase/functions/generate-author-bio/index.ts`",
    "`supabase/functions/generate-consultation-promos/index.ts`",
    "`supabase/functions/compose-social-post/index.ts`",
    "`supabase/functions/generate-social-content/index.ts`",
    "`supabase/functions/generate-social-graphic/index.ts`",
    "`supabase/functions/generate-funnel/index.ts`",
    "`supabase/functions/generate-podcast-season/index.ts`",
    "`supabase/functions/generate-cover-image/index.ts`",
  ]) +
    `Beyond the 28 node activation generators, ABBY runs a set of **content generators** that produce specific marketing assets. These are invoked by builders, the Marketing Hub, and ABBY herself in chat.

| Generator | Used by | Output | Model |
|---|---|---|---|
| \`generate-email-sequence\` | BP-01 builder, Marketing Hub | A 3–10 step email sequence with subject + body | \`openai/gpt-5.2\` |
| \`generate-asset-pack\` | Cross-builder push, BP-02 | Bundled asset pack (intro email, social post set, headline variants) | \`openai/gpt-5.2\` |
| \`generate-author-bio\` | BP-04 builder, BA-15 | Long + short bio variants in author voice | \`openai/gpt-5.2\` |
| \`generate-consultation-promos\` | YR-19, YR-20, YR-23 | Promo copy for consultation offers | \`openai/gpt-5.2\` |
| \`compose-social-post\` | BP-03 Social Designer | 2-step background + burn-in image, 6 templates × 5 platforms | \`google/gemini-3-flash-image-preview\` |
| \`generate-social-content\` | BP-03, Marketing Hub | 30-day calendar of posts | \`openai/gpt-5.2\` |
| \`generate-social-graphic\` | BP-03, lead magnets | Standalone social graphic | \`google/gemini-3-flash-image-preview\` |
| \`generate-funnel\` | BP-02, BP-04, lead-magnet builder | Quiz, opt-in flow, results-page copy | \`openai/gpt-5.2\` |
| \`generate-podcast-season\` | BA-14 | Season-arc proposal with episode topics | \`openai/gpt-5.2\` |
| \`generate-cover-image\` | BP-06, BP-07, lead magnets | Cover graphic for workbook / course / lead magnet | \`google/gemini-3-flash-image-preview\` |

## Common patterns

All content generators:

1. Use the **Lovable AI Gateway** (\`https://ai.gateway.lovable.dev/v1/chat/completions\`).
2. Run with \`verify_jwt = false\` and validate the JWT in code via \`getActiveToken()\`.
3. Bypass RLS via the service role key and write to \`generated_assets\` with a typed \`asset_type\`.
4. Return \`{ success, status, message, data }\` per the platform contract.
5. Fetch author + book context (pen name, niche, framework, audience level) before composing the prompt.

## Forbidden phrases (universal)

These are stripped from every output by validators before persistence:

- "Next-step", "try this", "exercise" (lead-magnet copy rule)
- Em-dashes (\`—\`, \`–\`) and bracket placeholders (\`[insert ...]\`, \`{{...}}\`, \`<<...>>\`) in any microsite-bound content (\`scrub_microsite_jsonb\` DB trigger enforces this)
- "CLICK TO SELECT", "PICK ONE", "CHOOSE ONE", "SELECT ONE"
- Brand-restricted technical terms ("Stripe", "GHL", "Supabase", "deploy", "API", "CRM")

## Verbatim prompts

The **verbatim** body of each generator's prompt block is captured by \`scripts/build-doc-03.mjs\` (which scans every \`generate-*\` function, including the content generators above). See \`03-node-activation-prompts.md\` for the full extracted text.

> Future sprint: separate \`build-doc-04-content.mjs\` will split node-bound generators from content-bound generators into their own document. Until then, treat \`03-node-activation-prompts.md\` as the union.
`,
);

w(
  "03-abby-ai/05-crm-intelligence-prompts.md",
  header("05 · ABBY CRM Intelligence Prompts", [
    "`supabase/functions/abby-daily-report/index.ts`",
    "`supabase/functions/abby-daily-report-dispatcher/index.ts`",
    "`supabase/functions/generate-daily-insight/index.ts`",
    "`supabase/functions/generate-nudges/index.ts`",
    "`supabase/functions/crm-auto-capture/index.ts`",
  ]) +
    `ABBY's CRM intelligence layer produces **proactive coaching** for authors: a daily report, real-time nudges, hot-lead notifications, and re-engagement emails.

## Daily Intelligence Report

- **Edge function**: \`abby-daily-report\` (dispatched nightly by \`abby-daily-report-dispatcher\`).
- **Output**: HTML email rendered via \`transactional-email-templates\`, From address = \`notify.authorsbureau.com\` (system email — no per-author branding).
- **Sections**: New contacts, hot leads, sales last 24h, content opportunities, nudge prompts, top-performing assets.
- **Model**: \`openai/gpt-5.2\` for narrative summary; deterministic SQL for numbers.
- **Prompt verbatim**: see auto-extracted block in \`03-node-activation-prompts.md\` (or grep the function source).

## Nudge Engine (real-time cards on the dashboard)

- **Edge function**: \`generate-nudges\`
- **Triggers monitored** (9 total): new lead with no follow-up; lead opened email twice; lead clicked sales page twice; sales-page visit no purchase; webinar registration; podcast episode published with no email push; revenue dip vs 7-day avg; hot lead inactive; new sale (celebrate).
- **Output**: \`abby_nudges\` row + dashboard card. Author can dismiss, accept, or schedule.

## Daily Insight (in-dashboard tile)

- **Edge function**: \`generate-daily-insight\`
- **Output**: One short paragraph rendered in the dashboard hero "ABBY's read on today" tile.
- Uses the author's last 7 days of activity + open nudges as context.

## Lead Scoring (deterministic — no LLM)

| Event | Score change |
|---|---|
| Quiz completed | +10 |
| Email opened | +2 |
| Email link clicked | +5 |
| Sales page visited (1st time) | +5 |
| Sales page visited (2nd+) | +10 |
| Session registered | +15 |
| Session attended | +20 |
| Purchase made | +30 |
| No activity 7 days | -3 |
| Unsubscribed | -50 |

### Pipeline stages

| Score | Stage |
|---|---|
| 0–15 | New |
| 16–35 | Engaged |
| 36–60 | Warm |
| 61–80 | Hot |
| 81–100 | Customer |
| 100 | VIP |

Implemented in \`crm-auto-capture\` and read by all dashboard surfaces. Authoritative table: \`crm_contacts.score\`.

## Re-engagement copy

When a lead drops to Engaged from Warm/Hot for ≥ 14 days, ABBY can compose a re-engagement email through \`generate-email-sequence\` (single-step variant). Author approves before send.

## Hot-lead notifications

When a contact's score crosses **61** for the first time in 24 h, the Nudge Engine fires both:

1. A dashboard nudge card.
2. A transactional email to the author (system-branded, From = \`notify.authorsbureau.com\`).
`,
);

w(
  "03-abby-ai/06-abby-score-algorithm.md",
  header("06 · ABBY Score Algorithm — Documented", [
    "`supabase/functions/crm-auto-capture/index.ts`",
    "`crm_contacts.score` column",
  ]) +
    `## Event scoring

| Event | Score change |
|---|---|
| Quiz completed | **+10** |
| Email opened | **+2** |
| Email link clicked | **+5** |
| Sales page visited (1st) | **+5** |
| Sales page visited (2nd+) | **+10** |
| Session registered | **+15** |
| Session attended | **+20** |
| Purchase made | **+30** |
| No activity for 7 days | **-3** |
| Unsubscribed | **-50** |

Scoring is **deterministic** — no LLM involvement. The \`crm-auto-capture\` edge function is the only writer to \`crm_contacts.score\`.

## Pipeline stages (read-side derivation)

| Score range | Stage label | Used in |
|---|---|---|
| 0 – 15 | New | dashboard, daily report |
| 16 – 35 | Engaged | dashboard, daily report |
| 36 – 60 | Warm | dashboard, daily report, hot-lead alert (entry threshold) |
| 61 – 80 | Hot | dashboard, daily report, hot-lead alert (active) |
| 81 – 99 | Customer | dashboard, retention nudges |
| 100 | VIP | dashboard, VIP CTA |

## Floor and ceiling

- Score is clamped to \`[0, 100]\` at write time.
- Scores below 0 are stored as 0 to keep stage maths simple.

## Decay

- The \`-3 for no activity in 7 days\` event is the only decay mechanism.
- Decay is applied by a daily cron (within \`abby-daily-report-dispatcher\`) so scores reflect freshness without runtime cost.

## Overrides

Admins may override a contact's stage via \`crm_contact_tags\` ("VIP", "Founder Circle", etc.) without changing the numeric score. Tags take precedence in UI badges but not in counters.
`,
);

w(
  "03-abby-ai/07-autonomous-actions-registry.md",
  header("07 · ABBY Autonomous Actions Registry", [
    "`mem://features/abby-performance-coach-and-nudge-engine`",
    "`mem://architecture/abby-nurture-engine-sprint28`",
    "Edge function inventory: \`supabase/functions/\`",
  ]) +
    `Every "ABBY does this automatically" behaviour, mapped to its trigger and the side-effect it produces.

| Trigger | ABBY action | Edge function / mechanism | Side effects |
|---|---|---|---|
| New author signs up | Seeds 28 \`author_nodes\` rows with status \`draft\` | DB trigger on \`auth.users\` insert | Author dashboard shows the full node grid |
| Author uploads manuscript | Runs BP-00 analysis | \`generate-bp00-analysis\` | Writes \`generated_assets.business_plan\` |
| Author lacks manuscript | Falls back to \`parse-published-book\` | \`parse-published-book\` | Same persistence |
| Author activates a node | Generates that node's content + sets \`status='content_ready'\` | \`generate-<node-id>\` | Writes \`author_nodes.content_json\`; cross-builder push registry fires |
| Author hits "Go Live" | Sets \`status='live'\` | builder UI + \`bp03-node-state\` etc. | Marketing Hub picks it up; readers see it |
| Lead completes quiz | Creates / updates CRM contact + scores +10 | \`crm-auto-capture\` | New \`crm_contacts\` row or score bump |
| Lead opens email | Score +2 | \`crm-auto-capture\` (Resend webhook) | \`crm_activity_log\` row |
| Lead clicks email link | Score +5 | \`crm-auto-capture\` | activity row |
| Sales page visited | Score +5 / +10 | client beacon → \`crm-auto-capture\` | activity row |
| Lead crosses score 61 | Hot-lead nudge + transactional email | \`generate-nudges\` | \`abby_nudges\` row + email |
| New sale | Celebrate nudge + revenue stat refresh | \`process-purchase\` + \`generate-nudges\` | nudge + \`author_revenue_snapshots\` |
| Daily 06:00 cron | Generates Daily Intelligence Report | \`abby-daily-report-dispatcher\` → \`abby-daily-report\` | email to author + dashboard tile |
| Daily 06:05 cron | Decays inactive scores by −3 | \`abby-daily-report-dispatcher\` | \`crm_contacts.score\` updates |
| Author publishes podcast episode | Auto-pushes to email list (via opt-in) | \`generate-nudges\` watcher | optional Email Engine campaign |
| Author goes live on a Brand product | Auto-Nurture engine starts the sequence | Marketing Hub watcher | enrols list, schedules sends |
| Cross-builder push registered | Asset auto-flows to dependent builder | \`scripts\` registry + \`cross_builder_pushes\` | downstream builder pre-fills |
| Reader completes lead magnet | Enrols in BP-01 sequence + score +10 | \`enroll-subscriber\` | enrolment + activity |
| Email send fails / bounces | Adds to \`suppressed_emails\` | \`auth-email-hook\` + Resend webhook | future sends skip |
| Author connects Stripe Express | Switches future payouts to automatic | \`payments--enable_stripe_payments\` flow | \`author_payout_settings\` |
| Admin approves book | Unlocks public visibility + AI deep analysis | \`admin-books\` action | \`books.published_at\` set |

## Guardrails

- ABBY never sends external messages without the author having activated the relevant node.
- All autonomous email writes route through \`send-transactional-email\` so unsubscribe + author-branded headers are uniform.
- All nudges are dismissible; nothing forces an author into a workflow.
`,
);

console.log("03 ABBY 04–07 written");

// ───────────────────────────────────────────────────────────────────────────
// 04 — NODE FRAMEWORKS (28 nodes, 7 sections each)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Each entry contains the 7 mandatory sections from the Manus framework:
 *  1. what       — plain-English description
 *  2. abby       — what ABBY builds + engine + edge function
 *  3. author     — steps the author takes
 *  4. reader     — end-to-end reader / customer journey
 *  5. gate       — exact hasRequiredAssets rule (verbatim)
 *  6. revenue    — revenue model
 *  7. deps       — dependencies (other nodes / connectors)
 */
const NODES = [
  ["BP-01", "Email Marketing", "Brand", "Author", "generate-bp01-email-marketing", {
    what: "The author's master email list and the welcome sequence that turns a reader into a subscriber. This is the single source of truth for everything ABBY sends to the author's audience.",
    abby: "Engine: **Email Engine** (Resend). ABBY drafts a 3–10 step welcome sequence using the book's hook, theme, and call-to-action. Stored in `email_flows` + `email_flow_steps`; sequence ID written to `author_nodes.content_json.email_sequence_id`.",
    author: "1) Open the BP-01 builder. 2) Confirm sender name + reply-to address (sets `author_email_settings`). 3) Review the auto-drafted sequence — edit subject lines and bodies. 4) Click Activate. The Email Engine starts enrolling new contacts immediately.",
    reader: "Reader hits a microsite or lead-magnet form → submits email → enters the welcome sequence step 1 within minutes → receives subsequent steps on cadence → can unsubscribe via per-author signed token at any time.",
    gate: "`email_sequence_id` set AND `steps[]` non-empty (new model), OR `sequence_steps[]` non-empty (legacy).",
    revenue: "Indirect — feeds every paid offer downstream. Direct revenue when a sequence step contains a Buy CTA for BP-09 / BP-06 / BA-10.",
    deps: "Requires Resend connector (platform-managed, always on). Recommended: BP-02 (lead magnet) to provide the entry point.",
  }],
  ["BP-02", "Lead Magnet", "Brand", "Book", "generate-bp02-lead-magnets", {
    what: "A short (2–3 minute) assessment, quiz, or downloadable that captures a reader's email in exchange for value tied directly to the book's promise.",
    abby: "Engine: **Funnel Engine**. ABBY generates an 8-question quiz with 5 result tiers, 3 headline variants, a 4-stage conversion microsite (Gate → Quiz → Results → Next Step), and a Social Distribution Pack. Stored in `funnels` and `marketing_assets`.",
    author: "1) Open BP-02 builder. 2) Pick a template (6 visual templates) and tone. 3) Review the 8 generated questions; edit if needed. 4) Pick one of 3 headline variants (Identity / Outcome / Curiosity). 5) Click Activate — the lead-magnet microsite goes live at a public URL.",
    reader: "Reader sees the gate page → submits email → takes the 8-question quiz → lands on a personalised result tier → is invited to a next step (book purchase, BP-01 enrolment, or another offer).",
    gate: "Generic gate — any non-empty `content_json` passes. The lead-magnet builder always saves substantial structured content on activation.",
    revenue: "Indirect — primary feeder for BP-01 and downstream paid offers.",
    deps: "BP-01 (Email Engine must exist for enrolment). Optionally pushes asset packs to BP-03 and BP-04.",
  }],
  ["BP-03", "Social Media", "Brand", "Author", "generate-bp03-social-media", {
    what: "A 30-day calendar of social posts in the author's voice, plus an on-demand graphic composer (Social Designer) that produces platform-sized images.",
    abby: "Engines: **Funnel + content store**. ABBY generates a calendar of platform-tagged posts and stores them in `social_media_content` / `social_posts`. The Social Designer (`compose-social-post`) produces 6 templates × 5 platforms via 2-step background + burn-in image rendering.",
    author: "1) Generate or refresh the 30-day calendar. 2) For any post, click Design to render a graphic. 3) Copy text + download image. 4) Post manually to chosen platforms (Buffer was removed; manual control is intentional).",
    reader: "Reader sees the post on the platform → clicks through to the lead magnet, microsite, or Buy link → enters the funnel.",
    gate: "`posts_generated > 0` OR `content_calendar_id` set OR `posts[]` non-empty.",
    revenue: "Indirect — top-of-funnel awareness driving traffic to lead magnets and sales pages.",
    deps: "None required. Recommended: BP-02 lead magnet so social CTAs have a destination.",
  }],
  ["BP-04", "Author Website", "Brand", "Book", "generate-bp04-website", {
    what: "The book's public microsite — hero, about, lead magnet form, learn page, and revenue offers — hosted on Authors Bureau.",
    abby: "Engine: **Microsite renderer** + content stores. ABBY generates hero copy, headline, subheadline, about (long + short), and section content. Public URL pattern: `authorsbureau.com/<author-slug>/<book-slug>`.",
    author: "1) Open BP-04 builder. 2) Review hero + about + sections. 3) Add a lead magnet (BP-02 cross-push auto-fills). 4) Click Activate — site goes live. Owner-preview lets the logged-in author preview unpublished drafts.",
    reader: "Reader arrives via search, social, or referral → reads hero + about → submits email to lead magnet → enters BP-01 sequence → returns to browse Learn / Buy sections.",
    gate: "Primary anchor (`hero_headline` non-empty OR `sections[]` non-empty) AND ≥ 1 supporting field (`about_long`, `about_short`, `hero_subheadline`, or `lead_magnet_id`).",
    revenue: "Indirect — hub for every other node. Direct revenue when sections render `<BuyNowButton>` for BP-06/07/09 or YR offers.",
    deps: "Recommended: BP-02 (lead magnet), BP-09 (book sales). Microsite copy must respect `mem://content/public-site-logic` (no pricing visible, no em-dashes, hides empty fields).",
  }],
  ["BP-05", "Webinars", "Brand", "Book", "generate-bp05-webinars", {
    what: "A live or evergreen webinar where the author teaches one core idea from the book and pitches a paid offer.",
    abby: "Engines: **Sessions + Email**. ABBY drafts a webinar outline, slide titles, registration page copy, reminder sequence, and follow-up sequence. Sessions live in `consultation_sessions`-style records.",
    author: "1) Open BP-05 builder. 2) Set date/time + Zoom link (paste). 3) Review outline + slide titles. 4) Activate — registration page goes live, Email Engine schedules reminders.",
    reader: "Reader registers → receives confirmation + reminder emails → attends → receives recording + offer follow-up.",
    gate: "Generic gate — any non-empty `content_json`.",
    revenue: "High — webinar pitch typically converts to BA-10 / YR-19 / YR-23.",
    deps: "BP-01 (sequence delivery). Zoom link is pasted manually (no Zoom API integration).",
  }],
  ["BP-06", "Workbook", "Brand", "Book", "generate-bp06-online-course", {
    what: "A printable / fillable PDF companion to the book — exercises, prompts, and worksheets readers complete to apply the book's framework.",
    abby: "Engines: **Course + Commerce**. ABBY drafts modular workbook content; PDF rendered by client. Listed for sale via the Commerce Engine; `purchases` records each transaction.",
    author: "1) Open BP-06 builder. 2) Review modules. 3) Set price (or free). 4) Activate — sale page + download flow goes live.",
    reader: "Reader buys via `<BuyNowButton>` → checkout via `create-checkout-session` → confirmation email with download link.",
    gate: "`title` set AND (`pdf_url` set OR commerce signal — `stripe_price_id` / `price_usd > 0` / paid sales tier).",
    revenue: "Direct — typically $9–$29.",
    deps: "BP-09 (book sales) for cross-push opportunities.",
  }],
  ["BP-07", "Home Study Course", "Brand", "Book", "generate-bp07-coaching", {
    what: "A self-paced course version of the book's framework — videos, audio, and worksheets bundled as a digital product.",
    abby: "Engines: **Course + Commerce**. ABBY drafts module + lesson outlines; can deploy to Thinkific (`deploy-bp07-to-thinkific`). Optional MoR sale via platform Commerce.",
    author: "1) Open BP-07 builder. 2) Review module structure. 3) Optionally connect Thinkific subdomain. 4) Set price + activate.",
    reader: "Reader buys → receives Thinkific access OR Authors Bureau learner portal access → progresses through modules at own pace.",
    gate: "`title` set AND (`course_id` set OR commerce signal).",
    revenue: "Direct — typically $97–$497.",
    deps: "Optional Thinkific. Sequenced after BP-06 (workbook) per the Product Development Sequence.",
  }],
  ["BP-08", "Special Editions", "Brand", "Book", "generate-bp08-mastermind", {
    what: "Limited-edition bundles tied to the book — signed copies, bonus content, anniversary editions.",
    abby: "Engine: **Commerce**. ABBY generates marketing copy + bonus content descriptions; bundles stored in `special_editions` + `special_edition_bundles`.",
    author: "1) Open BP-08 builder. 2) Define bundle contents + bonus assets. 3) Set price + inventory. 4) Activate.",
    reader: "Reader sees the bundle on microsite → buys → receives confirmation + (if physical) shipping detail collection.",
    gate: "Generic gate.",
    revenue: "Direct — premium pricing ($49–$199).",
    deps: "BP-09 (book sales) and BP-04 (microsite).",
  }],
  ["BP-09", "Book Sales", "Brand", "Book", "generate-bp09-speaking", {
    what: "The canonical sales channels for the book itself — Amazon link, sales page, optional MoR direct sale.",
    abby: "Engine: **Commerce**. ABBY generates sales page copy (mandatory 11-section framework, see `mem://features/standardized-sales-page-builder`), exports slides + handout via `export-bp09-slides` / `export-bp09-handout`.",
    author: "1) Open BP-09 builder. 2) Paste Amazon / retailer URLs. 3) Optionally enable direct platform sale. 4) Activate.",
    reader: "Reader visits microsite → clicks Buy → routed to Amazon OR completes platform checkout.",
    gate: "`title` set AND (`amazon_url` OR `sales_page_url` OR commerce signal).",
    revenue: "Direct — book sale margin (Amazon royalty or 92% of MoR price).",
    deps: "BP-04 (microsite to host the link).",
  }],
  ["BA-10", "Online Course", "Build", "Book", "generate-ba10-online-course", {
    what: "A premium, video-based course expanding the book into a full curriculum. Hosted on Thinkific, sold by Authors Bureau as MoR.",
    abby: "Engines: **Course + Commerce**. ABBY drafts module/lesson curriculum (16k token complex generation), validates against sales copy via Mismatch Validator (`mem://features/sales-curriculum-validation-system`). Deploys via `deploy-ba10-to-thinkific`.",
    author: "1) Open BA-10 builder. 2) Review modules. 3) Approve sales page (auto-validated against curriculum). 4) Connect Thinkific. 5) Activate.",
    reader: "Reader buys → enrolled in Thinkific automatically → progresses through modules → certificate on completion (optional).",
    gate: "`title` set AND (`course_id` OR ≥ 1 module OR commerce signal).",
    revenue: "Direct — typically $297–$997.",
    deps: "Thinkific connector. Sequenced after BP-07 per Product Development Sequence.",
  }],
  ["BA-11", "Audiobook", "Build", "Book", "generate-ba11-audiobook", {
    what: "An audiobook version of the book — TTS-narrated with ElevenLabs, packaged for ACX, distributed manually.",
    abby: "Engine: **TTS pipeline** (ElevenLabs V2). ABBY generates narration script, voice preview (`ba11-voice-preview`), and the ACX submission guide. Save & Distribute flow handles packaging.",
    author: "1) Open BA-11 Audiobook Studio. 2) Pick voice. 3) Generate narration script. 4) Review chapters. 5) Generate audio (`elevenlabs-tts-audiobook-v2`). 6) Download ACX-ready package; submit to ACX manually.",
    reader: "Listener buys on Audible / Apple Books / etc — Authors Bureau is the producer of record on the ACX submission.",
    gate: "`narration_script_url` set OR `acx_guide_generated === true` OR `chapters[]` non-empty.",
    revenue: "Direct — Audible royalty (paid through ACX, not Authors Bureau Commerce).",
    deps: "ElevenLabs (platform-managed). ACX account is author's responsibility.",
  }],
  ["BA-12", "Membership", "Build", "Book", "generate-ba12-membership", {
    what: "A recurring membership tied to the book's themes — monthly content, community, exclusive sessions.",
    abby: "Engine: **Commerce (recurring)**. ABBY drafts membership offer + monthly content calendar + welcome sequence. Subscriptions in `subscriptions`.",
    author: "1) Open BA-12 builder. 2) Define membership benefits. 3) Set monthly price (Stripe price ID). 4) Activate.",
    reader: "Reader buys → recurring Stripe subscription → ongoing access to `membership_content` → can cancel via `customer-portal`.",
    gate: "`title` set AND `stripe_price_id` set.",
    revenue: "Direct + recurring — typically $19–$97 / month.",
    deps: "Stripe (platform). Optionally BP-01 for member nurture.",
  }],
  ["BA-13", "Group Coaching", "Build", "Book", "generate-ba13-group-coaching", {
    what: "A cohort-based group coaching programme — a fixed group meeting on a schedule for a defined duration.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts cohort outline, session schedule, sales page, application form.",
    author: "1) Open BA-13 builder. 2) Set cohort dates + Zoom link. 3) Set price. 4) Activate.",
    reader: "Reader applies → gets accepted → buys → receives schedule + Zoom links → joins live cohort.",
    gate: "`sessions[]` non-empty OR `schedule` string set.",
    revenue: "Direct + cohort — typically $497–$2,997 per seat.",
    deps: "Stripe; manual Zoom link.",
  }],
  ["BA-14", "Podcast Tour", "Build", "Author", "generate-ba14-podcast", {
    what: "The author's own podcast — ABBY drafts seasons, episode outlines, show notes, and pushes to Transistor.fm for RSS distribution.",
    abby: "Engine: **Podcast** (Transistor.fm). `generate-podcast-season` produces season arcs; `deploy-ba14-to-transistor` syncs episodes.",
    author: "1) Open BA-14 builder. 2) Generate season. 3) Record episodes. 4) Deploy to Transistor → distributed to Apple/Spotify automatically.",
    reader: "Listener subscribes on Apple / Spotify → episodes auto-deliver via RSS.",
    gate: "RSS ready (`rss_url`/`rss_feed_url`/`transistor.show_id`) AND ≥ 1 episode, OR activated + ≥ 2 episodes + show title (strict isLive check per `mem://audits/manus-2026-04-23-corrections`).",
    revenue: "Indirect — authority + audience. Sponsorship revenue routes via YR-28.",
    deps: "Transistor.fm (platform-managed).",
  }],
  ["BA-15", "Media & PR", "Build", "Author", "generate-ba15-media-pr", {
    what: "Press kit, press release, target media outlets list — the assets needed to pitch the book to journalists, podcasters, and influencers.",
    abby: "Engine: **Asset store**. ABBY generates press release (headline + body), pitch email template, target outlets list (`target_media_outlets`).",
    author: "1) Open BA-15 builder. 2) Review press release. 3) Review outlets list. 4) Activate. (Pitching itself is manual.)",
    reader: "(B2B — journalist receives pitch.)",
    gate: "Press release present (string OR object with headline AND body) AND outlets list non-empty.",
    revenue: "Indirect — earned media drives book sales + authority.",
    deps: "None.",
  }],
  ["BA-16", "Affiliates", "Build", "Author", "generate-ba16-affiliate", {
    what: "An affiliate programme letting other creators earn a commission for promoting the author's offers.",
    abby: "Engines: **CRM + Commerce**. ABBY drafts affiliate-recruitment copy, terms, tracking links.",
    author: "1) Open BA-16 builder. 2) Set commission rate. 3) Approve terms. 4) Activate; share affiliate-signup URL.",
    reader: "Affiliate signs up → gets unique referral link → reader purchases → commission attributed.",
    gate: "Generic gate.",
    revenue: "Negative direct (commission paid out) but expands top-of-funnel reach.",
    deps: "Stripe (for affiliate payout via Connect).",
  }],
  ["BA-17", "Bundles", "Build", "Book", "generate-ba17-upsells", {
    what: "Multi-product bundles combining ≥ 2 existing offers (e.g. workbook + course) at a packaged price.",
    abby: "Engine: **Commerce**. ABBY drafts bundle offer + comparison table + checkout copy.",
    author: "1) Open BA-17 builder. 2) Pick ≥ 2 items from existing nodes. 3) Set bundle price. 4) Activate.",
    reader: "Reader sees bundle CTA on a single-product page → upgrades to bundle at checkout.",
    gate: "`title` set AND `items.length >= 2` AND commerce signal.",
    revenue: "Direct — boosts AOV; typical bundle uplift 30–60 %.",
    deps: "Existing items (BP-06, BP-07, BA-10, etc).",
  }],
  ["BA-18", "JV Partnerships", "Build", "Author", "generate-ba18-jv-partnerships", {
    what: "Joint-venture deals with other authors — co-promote each other's offers to combined lists.",
    abby: "Engine: **CRM**. ABBY drafts JV pitch emails, partner brief, swap terms.",
    author: "1) Open BA-18 builder. 2) Identify candidate partners. 3) Send pitch via Email Engine. 4) Track in CRM.",
    reader: "Reader on partner's list receives co-promo → enters author's funnel.",
    gate: "Generic gate.",
    revenue: "Indirect (audience swap) + revenue-share splits on JV launches.",
    deps: "BP-01 (Email Engine) + CRM Engine.",
  }],
  ["YR-19", "1-on-1 Coaching", "Yield", "Author", "generate-yr19-coaching", {
    what: "Premium 1:1 coaching with the author — packages priced per call or per programme.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts package descriptions, intake form, scheduling copy. `coaching_packages` records each package.",
    author: "1) Open YR-19 builder. 2) Define packages (price, # sessions, deliverables). 3) Add booking URL (Calendly etc). 4) Activate.",
    reader: "Reader books → pays → receives intake form + Zoom link → coaching sessions begin.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` set, since YR-19 is session-style).",
    revenue: "Direct — typically $250–$1,500 per session or $2k–$10k per package.",
    deps: "Stripe; manual Zoom + booking link.",
  }],
  ["YR-20", "Big Ticket Consulting", "Yield", "Author", "generate-yr20-big-ticket", {
    what: "Strategic consulting engagements — multi-month, custom-scoped, high-ticket.",
    abby: "Engine: **Commerce**. ABBY drafts proposal, engagement agreement skeleton, sales page.",
    author: "1) Open YR-20 builder. 2) Define engagement tiers + price. 3) Activate.",
    reader: "Prospect inquires → consultation → custom proposal → contract.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct — typically $10k–$100k per engagement.",
    deps: "Stripe (for invoicing). Often paired with YR-19.",
  }],
  ["YR-21", "Speaking", "Yield", "Author", "generate-yr21-speaking", {
    what: "Speaker kit + topics list for booking the author for keynotes and panels.",
    abby: "Engine: **Asset store**. ABBY generates speaker bio, topic descriptions, demo reel page, speaking fee guide.",
    author: "1) Open YR-21 builder. 2) Define topics + fees. 3) Upload demo video link. 4) Activate.",
    reader: "Event organiser visits speaker page → fills inquiry form → booking conversation begins.",
    gate: "`title` set AND commerce signal (speaking fee).",
    revenue: "Direct — typically $5k–$50k per keynote.",
    deps: "BP-04 (microsite for the speaker page).",
  }],
  ["YR-22", "Corporate Training", "Yield", "Author", "generate-yr22-corporate", {
    what: "Customised corporate training programmes built from the book's framework. 8-step workflow includes Bloom's taxonomy + Kolb's stages alignment.",
    abby: "Engines: **Sessions + Commerce**. ABBY generates training menu, learning outcomes (`blooms_level`), experiential mapping (`kolbs_stage`), proposal templates. Per `mem://features/training-program-comprehensive-specs`.",
    author: "1) Open YR-22 builder (8 steps). 2) Define audience + outcomes. 3) Generate curriculum. 4) Set price. 5) Optionally connect Thinkific for delivery. 6) Activate.",
    reader: "L&D buyer requests proposal → contract → delivery (live or Thinkific) → evaluation.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` — session-style).",
    revenue: "Direct — typically $5k–$75k per engagement.",
    deps: "Stripe; optional Thinkific.",
  }],
  ["YR-23", "Mastermind", "Yield", "Author", "generate-yr23-mastermind", {
    what: "An ongoing high-ticket peer group of vetted members meeting on a recurring cadence.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts mastermind charter, member criteria, monthly format, application form.",
    author: "1) Open YR-23 builder. 2) Define cadence + price. 3) Activate.",
    reader: "Applicant applies → vetted → pays → joins monthly sessions + community.",
    gate: "`title` + commerce signal + session-style fields.",
    revenue: "Direct + recurring — typically $1,000–$5,000 / month.",
    deps: "Stripe.",
  }],
  ["YR-24", "Retreats", "Yield", "Author", "generate-yr24-retreats", {
    what: "Multi-day in-person retreats led by the author at a chosen location.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts retreat agenda, sales page, application form.",
    author: "1) Open YR-24 builder. 2) Set dates, location, capacity, price. 3) Activate.",
    reader: "Reader applies → pays → travels → attends retreat.",
    gate: "`title` + commerce signal + session-style fields.",
    revenue: "Direct — typically $3k–$15k per attendee.",
    deps: "Stripe; logistics handled out-of-band.",
  }],
  ["YR-25", "Certification", "Yield", "Author", "generate-yr25-certification", {
    what: "A certification programme that licences others to teach the author's framework. Highest-margin Yield offer.",
    abby: "Engines: **Course + Commerce**. ABBY drafts certification curriculum, exam structure, licensing terms. `deploy-yr25-to-thinkific` for course host.",
    author: "1) Open YR-25 builder. 2) Define certification levels + curriculum. 3) Set price. 4) Activate.",
    reader: "Practitioner buys → completes certification → receives credential + use of trademark.",
    gate: "`title` + commerce signal.",
    revenue: "Direct + ongoing royalties — typically $5k–$25k per practitioner + annual renewal.",
    deps: "Thinkific (recommended).",
  }],
  ["YR-26", "Conference", "Yield", "Author", "generate-yr26-conference", {
    what: "An annual conference branded around the author's framework — multi-speaker, multi-day, sponsor-supported.",
    abby: "Engines: **Commerce + Sessions**. ABBY drafts conference theme, agenda template, sponsor deck (cross-pushes to YR-28).",
    author: "1) Open YR-26 builder. 2) Set dates + venue. 3) Define ticket tiers. 4) Activate.",
    reader: "Reader buys ticket → attends conference.",
    gate: "`title` + commerce signal.",
    revenue: "Direct — multiple ticket tiers + sponsorship revenue.",
    deps: "Stripe; logistics out-of-band.",
  }],
  ["YR-27", "Fundraising", "Yield", "Author", "generate-yr27-fundraising", {
    what: "A fundraising offer for non-profit, advocacy, or cause-tied books. Donation flows handled via Stripe.",
    abby: "Engine: **Commerce**. ABBY drafts donation tiers, impact statement, donor recognition copy. `deploy-yr27-to-stripe` provisions price IDs.",
    author: "1) Open YR-27 builder. 2) Define tiers + impact statement. 3) Activate.",
    reader: "Donor selects tier → completes Stripe donation → receives receipt + recognition.",
    gate: "`title` + commerce signal.",
    revenue: "Direct (donations).",
    deps: "Stripe.",
  }],
  ["YR-28", "Sponsors", "Yield", "Author", "generate-yr28-sponsors", {
    what: "Sponsorship packages for the author's podcast (BA-14), conference (YR-26), and content channels.",
    abby: "Engine: **Commerce**. ABBY drafts sponsor deck, package tiers, audience metrics summary.",
    author: "1) Open YR-28 builder. 2) Define sponsor packages + price. 3) Activate.",
    reader: "Sponsor (B2B) reviews deck → contracts → receives placement.",
    gate: "`title` + commerce signal.",
    revenue: "Direct — $1k–$50k per sponsor per period.",
    deps: "BA-14 (podcast) and/or YR-26 (conference) for inventory.",
  }],
];

// Index for the node-frameworks folder
let nodeIndex = header("04 · Node Frameworks — Index", [
  "`src/components/dashboard/builders/builderNodeConfig.ts`",
  "`supabase/functions/_shared/node-readiness.ts`",
]) +
  `Each of the 28 nodes has its own framework document below. Every doc follows the same 7-section template defined by Manus:

1. **What it is** — plain-English description
2. **What ABBY builds** — engine(s), edge function, data shape
3. **What the author does** — step-by-step builder flow
4. **What the reader experiences** — end-to-end customer journey
5. **Readiness gate** — exact \`hasRequiredAssets\` rule
6. **Revenue model** — how money flows
7. **Dependencies** — required nodes + connectors

## Index

| ID | Label | Category | Scope | Doc |
|---|---|---|---|---|
`;

for (const [id, label, cat, scope] of NODES) {
  nodeIndex += `| ${id} | ${label} | ${cat} | ${scope} | [${id}.md](./${id}.md) |\n`;
}

nodeIndex += `\n## Authoring template

When adding a new node:

\`\`\`markdown
# <ID> · <Label>

_Version <v> · <date>_

**Category:** Brand | Build | Yield
**Scope:** Author | Book

## 1. What it is

## 2. What ABBY builds

## 3. What the author does

## 4. What the reader experiences

## 5. Readiness gate

## 6. Revenue model

## 7. Dependencies
\`\`\`
`;

w("04-node-frameworks/README.md", nodeIndex);

// Write each node file
for (const [id, label, cat, scope, fn, content] of NODES) {
  w(
    `04-node-frameworks/${id}.md`,
    `# ${id} · ${label}\n\n_Version ${VERSION} · ${DATE}_\n\n` +
      `**Category:** ${cat}  \n**Scope:** ${scope}-level  \n**Edge function:** \`supabase/functions/${fn}/index.ts\`\n\n---\n\n` +
      `## 1. What it is\n\n${content.what}\n\n` +
      `## 2. What ABBY builds\n\n${content.abby}\n\n` +
      `## 3. What the author does\n\n${content.author}\n\n` +
      `## 4. What the reader experiences\n\n${content.reader}\n\n` +
      `## 5. Readiness gate (\`hasRequiredAssets\`)\n\n${content.gate}\n\n_Source: \`supabase/functions/_shared/node-readiness.ts\`._\n\n` +
      `## 6. Revenue model\n\n${content.revenue}\n\n` +
      `## 7. Dependencies\n\n${content.deps}\n`,
  );
}

console.log(`04 node frameworks: ${NODES.length} files written`);

// ───────────────────────────────────────────────────────────────────────────
// 05 — SPRINT RECORDS
// ───────────────────────────────────────────────────────────────────────────

w(
  "05-sprint-records/01-sprint-log-master.md",
  header("01 · AB Sprint Log — Master", [
    "Project memory (`mem://sprints/*`, `mem://audits/*`)",
  ]) +
    `Running log of every sprint. Pauline maintains; Lovable provides per-sprint summaries when this doc is updated.

| # | Sprint | Date | Focus | Key deliverables |
|---|---|---|---|---|
| 28 | ABBY Nurture Engine | 2025-Q4 | GHL replaced by native ABBY flow | Marketing Hub generate→review→go-live→nurture; \`status='live'\` direct to author_nodes |
| 30 | Daily.co removal | early 2026 | Drop video infra | Zoom links manual paste only |
| 33 | Counter consistency | early 2026 | Fix 22→26→24 drift | Single \`node-readiness.ts\` shared by 3 consumers |
| 34 | ABBY Email Engine | 2026-Q1 | Native email | 4-tab Marketing Hub; BP-01/02/05 hooks; \`email_flows\` schema |
| 36b | Buffer integration | 2026-Q1 | Social scheduling experiment | (rolled back in 37) |
| 37 | ABBY Social Designer | 2026-Q1 | Buffer removed; native composer | \`compose-social-post\` 2-step renderer; 6 templates × 5 platforms |
| 39 | Commerce Engine v1 | 2026-Q1 | MoR commerce shipped | \`author_nodes\` registry; 8% fee; dual webhook; \`<BuyNowButton>\` |
| 44 | Stripe-only payouts | 2026-04 | PayPal + Wise removed | Stripe Express only; admin manual fallback |
| 45 | GHL fully removed | 2026-04 | Cleanup | All GHL refs deleted from code, DB, copy |
| 46 | Documentation Sprint v3 | 2026-05-01 | This sprint | 6-category /docs structure; Manus framework alignment |

## Schema of this table

- **#** — sprint number
- **Sprint** — short name
- **Date** — completion date
- **Focus** — 1-line goal
- **Key deliverables** — what shipped (link to PRs / decisions if available)

When a sprint completes, add a new row here AND ensure the relevant docs in 01–06 are updated per the maintenance rule in \`/docs/README.md\`.
`,
);

w(
  "05-sprint-records/02-sprint-prompt-archive.md",
  header("02 · AB Sprint Prompt Archive", [
    "Pauline's saved prompt log (external — not committed to repo)",
  ]) +
    `> **Owner:** Pauline. **Critical:** save every sprint prompt sent to Lovable here, in order, BEFORE sending. This is the recovery document — if Lovable ever loses context, replaying these prompts in order rebuilds the platform.

## Format

\`\`\`markdown
## Sprint <N> — <short title> — <YYYY-MM-DD>

<verbatim prompt sent to Lovable>

---
\`\`\`

## Entries

> _The full prompt history pre-dating Sprint 46 lives in Pauline's external archive. From Sprint 46 onward, every prompt is to be pasted into this file before send._

### Sprint 46 — Documentation Sprint v3 — ${DATE}

(Verbatim prompt that initiated this sprint:)

> Documentation Sprint Prompt for Lovable: Before we begin the next feature sprint, I need you to produce the following documentation for everything built so far. These documents must be committed to the GitHub repository in a /docs folder so they are version-controlled alongside the code. [...followed by the Manus 6-category framework checklist...]

(Plus follow-ups: "fix doc 03", "go ahead and finish the docs sprint".)

---
`,
);

w(
  "05-sprint-records/03-bug-registry.md",
  header("03 · AB Bug Registry", [
    "Project memory + sprint history",
  ]) +
    `Every bug ever found. Never delete entries — keep as history.

| # | Date found | Severity | Description | Sprint fixed | Status |
|---|---|---|---|---|---|
| 1 | 2026-Q1 | High | "X / 28 Live" counter drifted between 22, 26, 24 across screens | 33 | Fixed — single \`node-readiness.ts\` source |
| 2 | 2026-Q1 | High | Buffer API intermittently failed silently; posts not published | 37 | Fixed — Buffer removed; manual posting |
| 3 | 2026-04 | High | \`temperature\` overrides on \`openai/gpt-5*\` returned AI gateway 400 | Manus audit 2026-04-23 | Fixed — temperature param removed from all gpt-5* calls |
| 4 | 2026-04 | Medium | BA-14 marked Live with 0 episodes (just clicked Activate) | Manus audit 2026-04-23 | Fixed — strict isLive: RSS+1ep OR activated+2ep+title |
| 5 | 2026-04 | Medium | YR-25/27/28 generators failed silently | Manus audit 2026-04-23 | Verified working after fixes |
| 6 | 2026-04 | Critical | PayPal + Wise payout flows had auth edge-cases | 44 | Fixed — both rails removed; Stripe-only |
| 7 | 2026-04 | Medium | Author Stripe disconnect blocked publishing | 44 | Fixed — Stripe is payout-only, never gates publish |
| 8 | 2026-04 | Low | Microsite copy occasionally rendered em-dashes | ongoing | DB trigger \`scrub_microsite_jsonb\` strips on write |
| 9 | 2026-Q1 | Medium | Lead-magnet copy contained banned phrases ("next-step", "exercise") | ongoing | Copy validator runs pre-persist |
| 10 | 2026-04 | Low | Email change in PublishNow didn't sync to AB \`books.owner_email\` | sprint 43 | Fixed — \`sync-author-email\` edge function |

## Adding new entries

When fixing a bug:

1. Add a row to this table.
2. Reference the sprint number that fixed it.
3. Update \`02-business-rules/\` or \`04-node-frameworks/\` if the fix changes a documented rule.
4. Add a row to \`04-decision-log.md\` if the fix involved an architectural choice.
`,
);

w(
  "05-sprint-records/04-decision-log.md",
  header("04 · AB Decision Log", [
    "Project memory + sprint summaries",
  ]) +
    `Every architectural decision and the reason for it. Append-only.

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

## 2026-04-23 — Temperature ban on \`openai/gpt-5*\`

**Decision:** Never pass a \`temperature\` override on \`openai/gpt-5*\` Lovable AI Gateway calls.

**Reason:** Gateway returns 400 for any value other than the default (1). Audit (\`mem://audits/manus-2026-04-23-corrections\`) found multiple generators silently failing.

**Implication:** Complex-structure generators that wanted lower temperature (0.2) had to switch to non-gpt-5 models or accept default temperature.

---

## 2026-Q1 — Commerce Engine v1: Authors Bureau as Merchant of Record

**Decision:** All reader payments flow into platform Stripe account; author Stripe Express is back-office payout only.

**Reason:** (a) Authors don't need Stripe to start selling. (b) Single tax + invoice surface for buyers. (c) Eliminates the "Stripe disconnected → reader gets error" failure mode.

**Implication:** Platform fee = 8 % covers all gateway processing. Author always gets 92 %. Author Stripe state must NEVER appear in \`hasRequiredAssets\`.

---

## 2026-Q1 — Buffer removed (Sprint 37)

**Decision:** Drop Buffer integration; ABBY generates a 30-day calendar; author posts manually.

**Reason:** Buffer GraphQL was unreliable; many authors preferred manual control over auto-posting.

**Implication:** BP-03 is now content-only. The Social Designer (\`compose-social-post\`) renders graphics on demand.

---

## 2025-Q4 — ABBY Nurture Engine native (Sprint 28)

**Decision:** Replace GHL-driven marketing automation with a native flow: generate → review → go live → continuous AI nurture.

**Reason:** Faster, cheaper, no third-party OAuth fragility, brand-controlled UI.

**Implication:** Builders write \`status='live'\` directly to \`author_nodes\`. Marketing Hub watcher picks up live nodes and starts campaigns.

---

## Adding new decisions

When making an architectural decision:

1. Append a section to this file with **Decision / Reason / Implication**.
2. Cross-link from the relevant sprint row in \`01-sprint-log-master.md\`.
3. Update affected docs in 01–04 same sprint.
`,
);

console.log("05 sprint records written");

// ───────────────────────────────────────────────────────────────────────────
// 06 — USER EXPERIENCE
// ───────────────────────────────────────────────────────────────────────────

w(
  "06-user-experience/01-design-rules.md",
  header("01 · AB Design Rules", [
    "`tailwind.config.ts`",
    "`src/index.css`",
    "`mem://style/visual-identity-and-design-freeze`",
    "`mem://architecture/audience-split-persona-and-visual-identity`",
  ]) +
    `## 1. Palette

Authors Bureau uses HSL semantic tokens defined in \`src/index.css\` and consumed via Tailwind classes — **never hard-coded colours in components**.

| Token | Role |
|---|---|
| \`--background\` | Page background (dark navy) |
| \`--foreground\` | Body text |
| \`--primary\` / \`--primary-foreground\` | Author CTA gold |
| \`--secondary\` | Reader CTA teal |
| \`--accent\` | Hover / highlight |
| \`--muted\` / \`--muted-foreground\` | Subdued surfaces / labels |
| \`--card\` / \`--card-foreground\` | All surfaces — dark navy, never light |
| \`--builder-brand\` | Brand-category accent (Teal) |
| \`--builder-bridge\` | Build-category accent (Indigo) |
| \`--builder-yield\` | Yield-category accent (Amber) |
| \`--success\` / \`--destructive\` | Status |

### Audience split

- **Author dashboard** — Gold (\`primary\`).
- **Reader / public surfaces** — Teal (\`secondary\`).

Routing logic in \`mem://architecture/audience-split-persona-and-visual-identity\`.

## 2. Typography

| Use | Family |
|---|---|
| Headings | **Playfair Display** (serif) |
| Body | **Inter** (sans-serif) |

Set in \`tailwind.config.ts\` — do not change without approval.

## 3. Visual freeze rules

- Dark navy cards across the dashboard. **No light backgrounds.**
- Builder category colours fixed: Brand=Teal, Build=Indigo, Yield=Amber. Do not introduce other category colours.
- WebP images optimised to **< 150 KB**.
- Single step-circle stepper for builders (no progress bars or breadcrumbs).
- LIVE lead-magnet uses \`text-red-600\` for the live indicator (per \`mem://style/lead-magnet-success-theme\`).

## 4. Public microsites

- **No nav header.**
- **No pricing visible** anywhere on a public microsite.
- **No em-dashes** in any rendered copy (\`scrub_microsite_jsonb\` DB trigger enforces).
- Empty fields **must hide cleanly** — no "TBD", "[insert]", "—" placeholders.
- Footer must include "Powered by Authors Bureau".
- Header / footer component requirements per \`mem://ux/public-microsite-rendering-standards\`.

## 5. ABBY tone in UI

- Warm, encouraging, specific.
- Always uses author's first name.
- 3–5 sentences default in chat.
- Celebrates wins; never makes the author feel behind.

## 6. Forbidden technical jargon (UI copy)

| Internal | Author-facing |
|---|---|
| GHL / Stripe / Supabase / Thinkific / Transistor | (omit) |
| CRM | "your contacts" |
| API / webhook / endpoint | (omit) |
| deploy | "activate" |
| backend | "your marketing" |
| funnel | "campaign" |

## 7. Action-description vocabulary

Every action label uses plain English:

- "Generate" not "Run prompt"
- "Activate" not "Deploy" or "Publish to GHL"
- "Save" not "Persist"
- "Connect payouts" not "Link Stripe Connect Express account"
`,
);

w(
  "06-user-experience/02-author-journey-map.md",
  header("02 · AB Author Journey Map", [
    "`mem://ux/new-user-onboarding-flow`",
    "`mem://features/onboarding-and-manuscript-specs`",
    "`mem://ux/book-hub-architecture`",
  ]) +
    `End-to-end flow from sign-up to first revenue.

## Stage 1 — Sign-up

1. Author lands on \`authorsbureau.com\` or is invited from PublishNow.io.
2. Signs up with email or Google (Supabase Auth).
3. \`auth.users\` insert trigger seeds 28 \`author_nodes\` rows (\`status='draft'\`).
4. Author lands on dashboard with the **3-step onboarding card**: Add book → Talk to ABBY → Activate first node.

## Stage 2 — Add a book

1. Author uploads manuscript (PDF / DOCX) OR provides a published-book URL.
2. Manuscript path: client-side \`pdfjs-dist\` / \`mammoth\` extracts text.
3. Published-book path: \`parse-published-book\` edge function scrapes metadata + sample.
4. Book row created in \`books\` (\`published_at\` initially NULL — admin gate).
5. \`enrich-book-data\` runs to fill cover, ISBN, etc.

## Stage 3 — Initial Analysis (BP-00)

1. ABBY runs \`generate-bp00-analysis\` → produces a **business plan** in \`generated_assets\`.
2. The Business Consultant chat flow walks the author through the plan (5 turns).
3. Author sees their personalised 28-node roadmap, sequenced by audience level.

## Stage 4 — Activate first Brand Product

1. Author opens BP-04 (Author Website) — recommended first node.
2. Reviews ABBY-drafted hero + about + sections.
3. Hits Activate → microsite goes live at \`authorsbureau.com/<author>/<book>\`.
4. Then BP-02 (Lead Magnet) → quiz live.
5. Then BP-01 (Email Marketing) → welcome sequence enrolling new subscribers.

## Stage 5 — First lead, first sale

1. Author shares microsite URL.
2. Reader takes quiz → enters CRM → enters email sequence.
3. Email Engine drives reader back to microsite → reader buys (BP-09 / BP-06 / BA-10).
4. Dual webhook (\`verify-purchase\` + \`process-purchase\`) confirms sale.
5. Author dashboard shows revenue tile increment + ABBY celebration nudge.

## Stage 6 — Scale via Build + Yield

1. ABBY's Daily Intelligence Report flags audience growth (\`mem://ai/phased-product-sequencing-logic\` Level 1+).
2. ABBY recommends moving to Sub-Phase B (digital products) → BP-06 / BP-07.
3. At Level 2+ (1k+ contacts), ABBY recommends Build nodes (BA-10 / BA-14).
4. At Level 4+ (5k+ contacts), ABBY recommends Yield nodes (YR-19 / YR-23).

## Touchpoints with ABBY (always-on)

- Persistent dashboard chat (\`abby-chat\`).
- Daily Intelligence Report email (06:00 author local).
- Real-time nudge cards (9 triggers).
- Per-node generators on activate.

## Author exports

- Business plan PDF (with disclaimers per \`mem://features/author-export-packages\`).
- Annual statements (\`generate-annual-statements\`).
- Course / workbook / sales packs (per node).

> Screenshots: Pauline can attach to a future revision. The flow above is the current source-of-truth narrative.
`,
);

w(
  "06-user-experience/03-reader-journey-map.md",
  header("03 · AB Reader Journey Map", [
    "`mem://features/readers-bureau-system-and-portal`",
    "`mem://features/lead-magnet-microsite-conversion-specs`",
    "`mem://architecture/commerce-engine-v1`",
  ]) +
    `End-to-end flow from discovering an author to becoming a customer / fan.

## Stage 1 — Discovery

The reader finds the author via:

- **Search** → Authors Bureau microsite ranks for the book's keywords.
- **Social** → BP-03 post links to lead magnet OR microsite.
- **Podcast** → BA-14 episode in their feed (Spotify / Apple).
- **Press** → BA-15 placement.
- **Affiliate** → BA-16 referral link.
- **JV partner** → BA-18 cross-promo email.

## Stage 2 — Lead capture (Funnel Engine)

1. Reader lands on lead-magnet microsite (4 stages: Gate → Quiz → Results → Next Step).
2. Submits email → \`enroll-subscriber\` writes to \`crm_contacts\` + \`email_lists\` enrolment.
3. CRM score +10 (quiz completed).
4. Lead magnet result delivered immediately (HTML + email follow-up).

## Stage 3 — Nurture (Email Engine)

1. Reader receives BP-01 welcome sequence step 1 within minutes.
2. Subsequent steps deliver on cadence (typically 3–10 emails over 2–4 weeks).
3. Each open (+2) / click (+5) / sales-page visit (+5/+10) bumps the score.
4. ABBY may insert nudged sends based on behaviour (re-engagement, hot-lead alert).

## Stage 4 — First purchase

1. A sequence step OR microsite CTA points to a paid offer.
2. Reader clicks the Buy Now button → \`create-checkout-session\` → Stripe Checkout (platform Stripe account, MoR).
3. \`verify-purchase\` confirms synchronously; \`process-purchase\` completes async.
4. Reader receives confirmation email (author-branded From if author has set sender preferences).
5. CRM score +30; stage advances to Customer (≥ 81).

## Stage 5 — Onboarding into the product

Per node:

- **BP-06 / BP-07 / BA-10** → enrolled in Course Engine OR Thinkific.
- **BA-12** → recurring subscription begins; \`membership_content\` access.
- **YR-19 / YR-23 / YR-24** → Sessions Engine schedules calls / cohort.
- **BP-09 (book)** → download link OR shipping detail collection.

## Stage 6 — Reader Bureau (Teal experience)

1. Reader signs up for Readers Bureau account → switches from "purchase one book" to "track my reading life".
2. Joins reading clubs (\`reading_club_members\`), participates in challenges (\`reading_challenges\`), earns badges (\`reader_badges\`).
3. Discover other authors → loops back to Stage 1 for a new author.

## Stage 7 — Upsell / repeat

- Bundles (BA-17) shown at checkout for related products.
- Email sequences pitch next-tier offers based on score.
- VIP tier (score = 100) receives premium offers (YR-19 / YR-20).

## Pricing visibility rule

> Public microsites **never display prices**. The price appears only at checkout, after the reader clicks Buy. This protects the author's positioning and maintains the "browse → choose to buy" flow.

> Em-dashes never appear on public surfaces — DB trigger strips them.
`,
);

w(
  "06-user-experience/04-test-account-credentials.md",
  header("04 · AB Test Account Credentials", [
    "Pauline's secure note (no secrets committed to repo)",
  ]) +
    `> **CRITICAL:** This file contains placeholders only. Real credentials live in Pauline's password manager — never paste passwords or API keys into this repository.

## Author test account

- **Email:** \`support@paulineteo.com\`
- **Password:** _(see secure note)_
- **Pen name:** Pauline Teo
- **Test book:** Be SUCKcessful

## Reader test account

- **Email:** \`paulinet77@yahoo.com.sg\`
- **Password:** _(see secure note)_
- **Reader profile:** active in Be SUCKcessful reading club

## Admin test account

- **Email:** _(see secure note)_
- **Role:** \`admin\` in \`user_roles\` table

## Test Stripe

- **Mode:** Stripe Test Mode
- **Card:** \`4242 4242 4242 4242\`, any future expiry, any CVC
- **Test webhook:** see Stripe dashboard

## Test data fixtures

- Test book: **Be SUCKcessful** (the canonical test book — see \`/docs/06-be-suckcessful-test.md\`).
- Test lead magnet: 8-question success-style quiz, 5 result tiers.
- Test course: 4-module home-study built from BP-07 generator.

## What to do if credentials need changing

1. Update Pauline's secure note.
2. Email \`support@authorsbureau.com\` to notify other operators.
3. **Do not** commit the new credentials here.

---

_End of Documentation Sprint v3._
`,
);

console.log("06 UX written");
console.log("All v3 docs generated.");
