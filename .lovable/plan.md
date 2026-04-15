

# Sprint 29 — Marketing Hub Flow Alignment

## Summary
Rewrite the Marketing Hub's status logic and card rendering so it reflects the correct Build → Review → Activate flow. Touches primarily `MarketingHub.tsx`. No new tables, routes, or edge functions.

## Current State
- `author_nodes.status` is a text field (default `'locked'`). Only value currently in DB: `'live'`.
- Marketing Hub uses `marketing_activated_at` timestamp to determine "active" state, and `status === "live"` for "ready".
- Cards show "Build [Node]" CTAs and step-by-step "how to get started" instructions — duplicating Brand Products.

## Status Mapping

| `author_nodes` state | Hub status badge | CTA button |
|---|---|---|
| No row / `locked` | **Not Built** (gray) | "Build this first in Brand Products →" links to `/brand-products` |
| `draft` | **Draft** (amber) | "Review & Approve Content →" links to `/node-builder/{nodeId}` |
| `live` (published) | **Ready to Activate** (gold) | "Activate Campaign" (green/gold) |
| `live` + `marketing_activated_at` set | **Active** (green) | "Pause Campaign" button |

## Changes

### 1. Rewrite `getCampaignStatus` (MarketingHub.tsx)
Replace current logic with 4-state derivation per node:
- `not_built`: no row or status is `locked`
- `draft`: status is `draft`
- `ready`: status is `live` and no `marketing_activated_at`
- `active`: status is `live` and `marketing_activated_at` is set

For grouped campaigns (BP-06+, BA-*, YR-*), derive from worst-state of child nodes (keep existing behavior).

### 2. Rewrite `CampaignRow` rendering
**For BP-01 through BP-05** (the 5 individual nodes):
- **Not Built**: Show node name, "Not Built" badge, description, and single line: "Build this first in Brand Products" with link to `/brand-products`. No step-by-step instructions.
- **Draft**: Show "Draft" amber badge, content preview (first 100 chars of `content_json`), "Review & Approve Content" button linking to `/node-builder/{nodeId}`.
- **Ready**: Show "Ready to Activate" gold badge, content preview, "Activate Campaign" green button.
- **Active**: Show green "Active" badge, "Pause Campaign" button, stats row: "Activated {date} · {X} leads captured".

### 3. Add pause functionality
"Pause Campaign" sets `marketing_activated_at = null` on `author_nodes` for that node, reverting to "ready" state.

### 4. Add leads count query
Query `leads` table (if exists) or default to 0 for the activation stats row.

### 5. Remove all "Build" language
- Remove `howToStart` step-by-step sections for BP-01–BP-05
- Remove all "Build [Node Name] →" button text
- Change Abby guidance section: replace "Build Email Marketing First" with "Go to Brand Products to get started" when no nodes are built
- Remove `deployFunctions` references to GHL (`deploy-bp04-to-ghl`, `deploy-bp05-to-ghl`, etc.)

### 6. Content preview snippet
For draft/ready/active nodes, extract first 100 chars from `content_json` (parse the JSON, find a suitable text field like `description` or first content block) and display as a muted preview line.

## Files Changed
| File | Change |
|---|---|
| `src/components/dashboard/MarketingHub.tsx` | Rewrite status logic, card rendering, remove Build language, add pause, add content preview |

## What Does NOT Change
- Brand Products page
- Node builders (BP-01 through BP-09)
- Sidebar navigation
- Dashboard
- Database schema (no migrations)
- No new routes or edge functions

