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
| **A** | Analyse Book & Develop Strategies | 1 |
| **B** | Brand Products | 9 |
| **B** | Build Authority | 9 |
| **Y** | Yield Revenue | 10 |

Total: **29 nodes** (BP-00 = analysis + 28 revenue / asset nodes BP-01 through YR-28).

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
| BP-00 | Initial Analysis | Brand | Book |
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

Counters across the dashboard, microsite, and admin views always denominate to **28**. (BP-00 is excluded from counters because it is the analysis step, not a revenue node.) Source: \`builderNodeConfig.ts\`.

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
| BP-00 | Initial Analysis | Per-book AI analysis |
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

(BP-00 is the analysis step and not counted in the 28 revenue nodes.)
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
