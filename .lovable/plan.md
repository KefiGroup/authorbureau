

# Home Study Course — Distribution Platform Options

Currently BP-07 Home Study delivers exclusively inside the **Readers Bureau portal** (`/readers-bureau/learn/{purchaseId}`). That's the right *default* — zero setup for the author, single login for the reader, one platform fee. But some authors will want to push to channels they already own. Here are the realistic add-on options, ranked by fit.

## Recommended additions (tiered)

### Tier 1 — Add now (highest ROI, lowest effort)

| Platform | Why it fits Home Study | Integration model | Effort |
|---|---|---|---|
| **Thinkific** | Already wired for BA-10 Online Course. Same module/lesson schema. Authors with an existing Thinkific subdomain can mirror the Home Study there. | Reuse `deploy-ba10-to-thinkific` → add `deploy-bp07-to-thinkific`. Author connects Thinkific in Account Settings → Connections. | Small |
| **Email + PDF download (Gumroad-style)** | Self-paced PDF workbook + module PDFs delivered via email after purchase. Some authors prefer "no portal, just files." | Reuse `send-transactional-email` with attachments; generate a single bundled PDF from the existing modules. | Small |

### Tier 2 — Add when authors ask

| Platform | Why | Integration model | Effort |
|---|---|---|---|
| **Kajabi** | Premium course host; many established coaches already pay for it. | New `deploy-bp07-to-kajabi` edge function via Kajabi API; add Kajabi to the connector registry. | Medium |
| **Podia** | Cheaper Kajabi alternative; popular with first-time course creators. | Same pattern as Kajabi. | Medium |
| **Teachable** | Largest free tier, low barrier. | Same pattern. | Medium |

### Tier 3 — Defer (low fit / high overhead)

- **Udemy / Skillshare** — marketplace pricing race-to-the-bottom; conflicts with our 92% author payout model.
- **LearnWorlds / Mighty Networks** — overlap with future YR-23 Mastermind; revisit when that node ships.
- **Patreon** — better fit for BA-12 Membership, not one-time Home Study.
- **YouTube unlisted + password PDF** — too DIY; we'd be supporting a hack, not a product.

## How the multi-distribution UX would work

In the BP-07 Activate step the author picks **one or more** delivery channels:

```
[x] Readers Bureau (default — always on)
[ ] Thinkific  → "Connect Thinkific" if not connected
[ ] Email PDF bundle  → uses author's verified sender
[ ] Kajabi  (Pro tier)
```

On purchase, `process-purchase` fans out to whichever channels are enabled:
- Readers Bureau → already implemented
- Thinkific → enrol student via API (mirrors BA-10)
- Email PDF → attach generated bundle to confirmation email
- Kajabi → enrol via API

The reader's "Start Your Course" button in the confirmation email always points to the **primary** channel the author selected (Readers Bureau by default).

## What changes in this sprint vs later

**This sprint (small scope, high value):**
1. Add `delivery_channels: string[]` to BP-07 `content_json` (default `["readers_bureau"]`).
2. Add Tier-1 options (Thinkific + Email PDF bundle) to BP-07 Activate step.
3. Build `deploy-bp07-to-thinkific` (clone of `deploy-ba10-to-thinkific`).
4. Generate a single bundled "Home Study PDF" from existing modules and attach to confirmation email when channel is enabled.
5. Update `purchase_confirmation` email to list each enabled channel with a CTA per channel.

**Later (when authors request):**
- Kajabi, Podia, Teachable connectors.
- Per-channel analytics (which channel did the buyer actually use?).
- Drip-release scheduling per channel.

## Out of scope
- Replacing the Readers Bureau as the default — it stays primary.
- Refund/access-revocation across external platforms (manual for Tier-2 connectors).
- Multi-channel pricing differences — single price, multi-channel fulfilment.

## Acceptance test
1. Pauline opens BP-07 Activate → sees Readers Bureau pre-checked + Thinkific + Email PDF options.
2. She enables Thinkific (already connected from BA-10) and Email PDF.
3. Linny buys → receives email with 3 access options: Readers Bureau link, Thinkific enrolment link, attached PDF bundle.
4. Linny logs into any of the three and finds the same lessons.

