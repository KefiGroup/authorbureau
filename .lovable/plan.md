## Goal
Show every node's funnel as a **visual, editable flow chart** (Level 1 editability). Author clicks any stage → side drawer opens → edits the copy/config for that stage → flow chart updates. ABBY's original generated copy is preserved; the author's edits are stored as **layered overrides** so a "Reset to ABBY's version" is always possible per stage.

Visible in two surfaces only: each node builder's success screen, and the Funnels Hub.

## What the user sees

### Flow chart (per archetype)
Horizontal row of stage cards with chevrons between them.

- **A — Sales:** Traffic → Sales Page → Checkout → Thank You → Onboarding Email
- **B — Opt-in:** Traffic → Opt-in Page → Confirm Email → Deliver Magnet → Nurture → Upsell
- **C — Application:** Traffic → Application Page → Form Submit → Review (48h) → Discovery Call → Close
- **D — Event:** Traffic → Event Page → Register → Confirmation → Reminder Sequence → Event Day

Each stage shows: name, 1-line description, status dot (green = filled, amber = using ABBY default / incomplete, grey = not built), stat when available (Views · Opt-ins · Conversions), and a small **"Edited"** badge when an author override exists.

### Stage editor drawer (Level 1 edit)
Click a stage → right-side drawer opens with **only that stage's editable fields**. Examples:
- *Opt-in Page* → Headline, Subheadline, CTA text, CTA color
- *Confirm Email* → Subject, Body, From-name
- *Nurture (each email)* → Delay (days), Subject, Body
- *Thank You* → Headline, Redirect URL
- *Discovery Call* → Calendar URL, pre-call questions

Each field shows ABBY's generated value as the placeholder/baseline. A small **"Reset to ABBY's version"** link appears next to any field the author has overridden. Save persists the override; flow chart re-renders with the green dot + "Edited" badge.

### Below the flow chart
Compact metadata strip — no mock landing-page render:
- Archetype badge · Status · Public URL (copyable) · Last updated
- Buttons: **Open landing page** (real public URL, new tab) · **Regenerate funnel** (warns about overrides) · **View in Funnels Hub**
- Empty state: **Generate funnel for this node** button.

## Where it appears
1. `PublishSuccessScreen.tsx` — embedded under the success headline (skipped for `NO_MICROSITE_NODES`).
2. `FunnelsHub.tsx` — each card replaces its hero-preview block with the same flow chart + drawer.

No other surfaces.

## Technical plan

### Database — new `funnel_stage_overrides` table
Layered storage: keep `funnels` row as the ABBY-generated baseline; store author edits separately so reset is trivial.

```text
funnel_stage_overrides (
  id uuid pk,
  funnel_id uuid fk → funnels.id on delete cascade,
  author_id uuid not null,           -- denormalized for RLS
  stage_id text not null,            -- e.g. 'optin_page', 'nurture_email_2'
  field_overrides jsonb not null,    -- { headline?: string, body?: string, delay_days?: number, ... }
  updated_at timestamptz default now(),
  unique (funnel_id, stage_id)
)
```

RLS: author can select/insert/update/delete rows where `author_id = auth.uid()`'s author_profile id (same pattern as existing `funnels` policy). Standard `update_updated_at_column` trigger on `updated_at`.

### New files
- `src/lib/funnel-flow-stages.ts` — `getStagesForArchetype(archetype, funnel, overrides, ctx)` returns `{ id, label, description, status, stat?, fields: FieldDef[], values: Record<string,string>, isEdited: boolean }[]`. Field definitions per stage type live here.
- `src/lib/funnel-archetype.ts` — extract `ARCHETYPE_TO_FUNNEL_TYPE`, `ARCHETYPE_LABEL`, color presets from `FunnelsHub.tsx`.
- `src/lib/funnel-overrides.ts` — `loadOverrides(funnelId)`, `saveStageOverride(funnelId, stageId, fields)`, `resetStageField(funnelId, stageId, fieldKey)`, `mergeWithBase(baseFunnel, overrides)`.
- `src/components/dashboard/builders/shared/FunnelFlowChart.tsx` — pure presentational. Props `{ stages, onStageClick }`. Flex row + chevrons; stacks vertically <768px; status dots + "Edited" badge.
- `src/components/dashboard/builders/shared/StageEditorDrawer.tsx` — uses `Sheet` from ui/sheet. Renders the field list for the selected stage with placeholders showing ABBY's baseline value and per-field reset link.
- `src/components/dashboard/builders/shared/NodeFunnelFlow.tsx` — top-level panel. Loads funnel + overrides for `(author_id, node_id)`, resolves archetype, renders flow chart + metadata strip + drawer + empty/generate state. Used by both surfaces below.

### Edited files
- `src/components/dashboard/builders/shared/PublishSuccessScreen.tsx` — embed `<NodeFunnelFlow nodeId={...} authorId={...} />` after the success card (skip for `NO_MICROSITE_NODES`).
- `src/components/dashboard/FunnelsHub.tsx` — remove hero-preview block from each card; render `<NodeFunnelFlow />` per funnel. Keep filters, regenerate, leads count.

### No edge-function changes
- `generate-funnel` keeps writing to `funnels` (the ABBY baseline). Overrides are pure client-side writes via Supabase SDK.
- "Reset stage to ABBY's version" deletes the per-field key from `field_overrides` (or the whole row if empty).
- "Regenerate funnel" updates `funnels` row; overrides remain attached to the same `funnel_id` and continue to win — drawer surfaces a banner "ABBY regenerated this funnel — review your overrides" when `funnels.updated_at > overrides.updated_at`.

## Out of scope
- Toggling stages on/off or reordering (Level 2) — deferred.
- Drag-drop free-form funnel canvas, branching, conditional logic (Level 3) — not planned.
- Mock landing-page render in dashboard (real page lives at public URL).
- Funnel widget on Author Dashboard overview or per-node manager pages.
