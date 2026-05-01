# 01 · AB Master Architecture Reference

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `mem://project/master-architecture-constraints-v2`
- `mem://architecture/abby-7-engines-master-plan`
- `src/components/dashboard/builders/builderNodeConfig.ts`
- `supabase/functions/_shared/node-readiness.ts`

---

## 1. What Authors Bureau Is

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
| 1 | **Email Engine** | All transactional + marketing email | `email_lists`, `email_flows`, `email_send_log`, `email_templates` |
| 2 | **Funnel Engine** | Lead magnets, quizzes, microsite forms, opt-ins | `funnels`, `funnel_submissions`, `leads` |
| 3 | **Course Engine** | Workbooks, home study, online courses, memberships | `courses`, `course_modules`, `course_lessons`, `course_enrollments` |
| 4 | **Commerce Engine** | All paid offers (one-time + recurring) | `author_nodes` (registry), `purchases`, `platform_config` |
| 5 | **Sessions Engine** | 1:1 coaching, group cohorts, webinars, retreats | `coaching_packages`, `consultation_sessions` |
| 6 | **Podcast Engine** | Author podcast tour (BA-14) | `podcasts`, `podcast_episodes` |
| 7 | **CRM Engine** | Contact pipeline, scoring, daily report, nudges | `crm_contacts`, `crm_activity_log`, `crm_contact_tags`, `abby_nudges` |

External services used (and their role):

| Service | Used for | Notes |
|---|---|---|
| **Stripe** | Reader checkout + author payouts (Express) | AB is Merchant of Record. Express only — never PayPal/Wise. |
| **Resend** | Transactional + marketing email send | Single sender domain `notify.authorsbureau.com`. |
| **Thinkific** | Optional course delivery for BA-10 / YR-25 | Per-author subdomain. |
| **Transistor.fm** | Podcast hosting + RSS for BA-14 | One show per author. |
| **ElevenLabs** | Audiobook TTS (BA-11) | V2 pipeline. |
| **Lovable AI Gateway** | All LLM + image generation | Models: `openai/gpt-5.2`, `google/gemini-3-flash-preview`, `google/gemini-3-flash-image-preview`. |

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

Source of truth: `src/components/dashboard/builders/builderNodeConfig.ts` and `supabase/functions/_shared/node-readiness.ts` (`AUTHOR_LEVEL_NODES` set).

## 4. Tech Stack (top-level)

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, Radix, framer-motion, react-router-dom, @tanstack/react-query, recharts.
- **Backend**: Lovable Cloud (Supabase Postgres + Edge Functions on Deno).
- **Auth**: Supabase Auth (email + Google), `getActiveToken()` + `fetchWithTimeout()` standard.
- **AI**: Lovable AI Gateway (no API keys in client).
- **Hosting / CDN**: Lovable.

See `05-technology-stack-current.md` for the full table including versions.

## 5. Two-Gate Live Rule

A node is "Live" on a dashboard counter ONLY if BOTH:

1. `author_nodes.status = 'live'` in the database, AND
2. `hasRequiredAssets(nodeId, content_json)` returns `true` (single source of truth: `supabase/functions/_shared/node-readiness.ts`).

This prevents the "X / 28 Live" counter from drifting when an author clicks Activate without producing any content. See `02-business-rules/02-node-readiness-gates-full-spec.md` for every rule.

## 6. Commerce model (locked)

- Authors Bureau is **Merchant of Record** on every reader transaction.
- Platform fee = **8 %** (`platform_config.platform_fee_percent`, default `0.08`).
- The 8 % covers ALL Stripe processing fees (checkout + Connect transfer). Author always receives **92 %** of gross — gateway fees are NEVER deducted from the author's share.
- Author's Stripe Express connection is **payout-only**. It does NOT gate Live status. Authors without Stripe still publish; only the reader `<BuyNowButton>` shows a graceful "coming soon" modal.
- Reader checkout always flows through `create-checkout-session` to the platform Stripe account.

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

_For the full memory inventory powering this document, see `mem://index.md`._
