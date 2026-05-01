# 03 · AB Product Lifecycle Rules

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `author_nodes.status` enum
- `mem://features/product-lifecycle-management`
- `mem://ux/brand-products-hub-semantics`

---

## States

| Status | Meaning | Set by |
|---|---|---|
| `draft` | Author opened the builder; nothing committed | initial seed |
| `in_progress` | Author has saved partial content | builder save |
| `content_ready` | Generator finished; content awaits review | generator |
| `published` (legacy) | Pre-Sprint 28 published state | legacy |
| `live` | Author hit Activate; visible to readers | Activate button OR generator with auto-live |
| `archived` | Author retired the node | archive action |

## Transitions

```text
draft → in_progress → content_ready → live ↔ archived
```

- `content_ready` and `published_pending_ghl` (legacy) are both treated as **Published** by the Brand Products hub UI.
- Only `live` (combined with the readiness gate) counts toward "X / 28 Live".

## Distinction from the readiness gate

Status is a **declared intent** ("the author wants this published"). The readiness gate (`hasRequiredAssets`) is a **factual check** ("is there actually enough content here to show readers?"). Both must pass for a node to count as Live. See `02-node-readiness-gates-full-spec.md`.

## Activation flow (post-Sprint 28)

1. Author finishes review in the builder.
2. Builder writes `status = 'live'` directly to `author_nodes` — **no GHL call, no external publish**.
3. Marketing Hub's Auto-Nurture engine picks up the live node and starts campaigns.
4. Reader-facing surfaces (microsite sections, BuyNowButton, learn page) check live + readiness and render accordingly.

## Archive

- Setting `status = 'archived'` removes the node from all counters and reader views.
- Underlying `content_json` is preserved so the author can re-activate later without losing work.
- Stripe products / prices are NOT auto-archived — admin handles those out-of-band.
