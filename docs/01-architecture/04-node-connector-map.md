# 04 · AB Node Connector Map

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- `mem://architecture/third-party-connector-registry-v2`
- `supabase/functions/_shared/node-readiness.ts`

---

Every node is powered by one or more of the **7 native engines**. External connectors are intentionally minimal — five total — and are only used where the engine itself can't deliver.

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
