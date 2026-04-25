# Step 3 — Funnel Template Family (4 Archetypes)

Refactor `generate-funnel` so a single generator produces archetype-tailored copy for all 28 revenue nodes, replacing the current 5 ad-hoc `funnel_type` prompts.

## Why

Today `generate-funnel` has one generic prompt with five `funnel_type` strings, and `FunnelsHub` only allows generating funnels for 4 nodes (`BP-02`, `BP-04`, `BP-05`, `BP-09`). Step 1 already tagged every node with an archetype (A/B/C/D). This step uses that tag so every node — including high-touch services (C) and events (D) — gets a tailored funnel page.

## Changes

### 1. `supabase/functions/generate-funnel/index.ts` — refactor
- Add `funnelTypeToArchetype()` mapper for backward compatibility with existing strings (`opt_in`, `lead_magnet`, `webinar`, `webinar_registration`, `sales`) plus new ones (`application`, `event`).
- When `node_id` is provided, look up `author_nodes.archetype` and prefer it over the funnel_type mapping (single source of truth).
- Replace the single prompt with `archetypeTemplate(archetype, ctx)` returning `{system, user, focus}` per archetype:
  - **A — Digital Sales**: long-form sales structure (hook → promise → product → outcomes → objections → CTA)
  - **B — Opt-in**: short, frictionless (one-line promise → 3 bullets → social proof → reassurance), <180 words
  - **C — Application**: pre-qualifying ("for you if" / "not for you if" / what's included / apply step)
  - **D — Event**: vibe + experience bullets + audience + logistics + scarcity
- All 4 templates emit the same JSON shape (`title`, `slug`, `headline`, `subheadline`, `body_copy`, `cta_text`) so the existing `funnels` table and `FunnelPage.tsx` renderer work unchanged.
- Response includes `archetype` so callers can show a badge.

### 2. `src/components/dashboard/FunnelsHub.tsx` — expand coverage
- Remove the hardcoded `FUNNEL_ELIGIBLE_NODES` whitelist.
- Drive eligibility from live `author_nodes` (any node with `status='live'` is eligible).
- Replace `NODE_TO_FUNNEL_TYPE` lookup with archetype-derived defaults:
  - A → `sales` · B → `opt_in` · C → `application` · D → `event`
- Show the archetype letter as a badge next to each funnel row.

### 3. No DB migration needed
Schema already supports it — `funnels.funnel_type` is free text and we keep it backward-compatible.

## Architecture

```text
                    ┌─────────────────┐
   node_id ───────► │ author_nodes    │ ── archetype (A/B/C/D) ──┐
                    └─────────────────┘                          │
   funnel_type ──── funnelTypeToArchetype() ────── fallback ─────┤
                                                                 ▼
                                                  archetypeTemplate(archetype, ctx)
                                                                 │
                                          ┌──────────┬───────────┼───────────┬──────────┐
                                          ▼          ▼           ▼           ▼
                                       A·Sales    B·Opt-in   C·Application  D·Event
                                          └──────────┴───────────┴───────────┴──────────┘
                                                              │
                                                  Lovable AI gateway (gpt-5.2)
                                                              │
                                                       funnels row inserted
```

## Out of scope
- FunnelPage.tsx visual layout (still one template — copy differs by archetype).
- A/B/C/D-specific page sections (e.g. application form embed, ticket grid). Those are Step 3.5 / future polish.
- Backfilling existing funnels to the new copy structure (existing rows untouched; authors can click "Regenerate" to upgrade).

## Verification
- Deploy `generate-funnel`.
- For one node from each archetype (e.g. BP-09 / BP-02 / YR-19 / YR-24), call `generate-funnel` and confirm copy structure matches the template + `archetype` is returned.
- Open FunnelsHub and confirm previously-uneligible nodes (e.g. YR-19, YR-24) now appear and generate correctly.
