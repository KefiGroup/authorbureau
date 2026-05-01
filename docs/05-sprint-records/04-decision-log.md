# 04 · AB Decision Log

_Version 3.0 · 2026-05-01_

**Source(s) of truth:**
- Project memory + sprint summaries

---

Every architectural decision and the reason for it. Append-only.

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

## Adding new decisions

When making an architectural decision:

1. Append a section to this file with **Decision / Reason / Implication**.
2. Cross-link from the relevant sprint row in `01-sprint-log-master.md`.
3. Update affected docs in 01–04 same sprint.
