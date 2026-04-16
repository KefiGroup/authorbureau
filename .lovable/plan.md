

# Sprint 30e — Redesign BP-01 Email Marketing as Visual Funnel Builder

## What Changes

Replace the `ReviewStep` component inside `BP01Builder.tsx` with three new sections: a horizontal funnel flow map, a slide-in email preview panel, and a campaign activation bar.

## Section 1 — Funnel Flow Map

A horizontal scrollable row of pill/node elements representing the reader journey:

```text
[Opt-in] → [Welcome] → [Day 2] → [Day 4] → [Day 7] → [Day 14 Offer] → [Broadcast]
```

Each node shows: step number, send timing, and a status dot (green if content exists, grey otherwise). Below each node, a muted label shows the CRM stage trigger (e.g., "New Lead", "Engaged", "Warm", "Hot", "Customer").

Nodes are mapped from `content.welcome_sequence` (by `send_delay_days`) plus the broadcast and lead magnet offer. Clicking a node sets `selectedNode` state.

## Section 2 — Email Preview Panel (Sheet)

When a node is clicked, a right-side `Sheet` opens showing:
- Subject line (large, bold)
- Preview text (italic, muted)
- Email body rendered inside a styled card (whitespace-pre-line, not raw text)
- "Preview as Reader" button opening a `Dialog` with a mock inbox view (From, Subject, body in an email-client-style card)
- CRM trigger label: "When clicked → moves reader to [Stage]"
- Status badge (Draft / Active)

**Placeholder fix**: Before rendering any email body, replace all `[Lead Magnet URL]` occurrences. The component will receive the real lead magnet URL (fetched from `generated_assets` / `author_nodes` BP-02 microsite_url in the parent). If none exists, substitute with italic text: "Your lead magnet link will be inserted automatically when BP-02 is built."

## Section 3 — Campaign Activation Bar

Replace the current two-button row with:
- Gold full-width button: "Activate My Email Campaign →"
- Campaign name and list name displayed above
- Note: "Sent via Authors Bureau — no external email platform needed."

## Data Fetching Addition

In the parent `BP01Builder` `useEffect`, add a query for the BP-02 lead magnet URL:
1. Query `author_nodes` where `node_id = 'BP-02'` for `microsite_url`
2. Pass `leadMagnetUrl` to `ReviewStep`

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/builders/bp01/BP01Builder.tsx` | Full rewrite of `ReviewStep`, add `FunnelFlowMap`, `EmailPreviewSheet`, `ReaderPreviewDialog`, `ActivationBar` sub-components. Add BP-02 URL fetch in parent. Remove Tabs import. |

## What Does NOT Change
- Steps 0, 1, 3 (Introduction, Generating, Publish/Success)
- Generation logic and edge function
- Database schema
- No new files needed — all sub-components stay in the same file

