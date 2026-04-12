

# Sprint 26 — BP-02 Lead Magnet Builder Overhaul

## Current State

Two lead magnet builder UIs exist:
- **BP02Builder.tsx**: Standalone 4-step wizard (Intro → Generate → Review → Publish). Calls `generate-bp02-lead-magnets` edge function and `publishNodeToSite`.
- **LeadMagnetStepRenderer.tsx**: Universal builder pattern (Configure → Generate → Edit → Design → Preview). Uses `SharedContentStep` with AI prompts.

The user is experiencing the universal builder. The standalone builder already has structured JSON output from the edge function but no GHL deployment or editing.

This plan unifies both into a single, complete flow.

---

## Phase 1: Fix 3 — GHL Publish (Highest Priority)

### 1a. Upgrade `deploy-bp02-to-ghl/index.ts`
- Read `content_json` from `author_nodes` (already contains opt-in page HTML, quiz structure, etc.)
- Create GHL funnel with two pages (opt-in + thank-you)
- Create custom fields: `lead_magnet_source`, `quiz_score`, `result_tier`
- Create contact tag from funnel name
- Create workflow for lead capture
- Check if BP-01 email marketing node exists and is live → if so, link nurture sequence; if not, store intent in `content_json.pending_connections`
- Return live funnel URL
- Update `author_nodes` with `status: 'live'`, `ghl_resource_id`, `microsite_url`

### 1b. Update BP02Builder publish step
- Replace `publishNodeToSite` call with `deploy-bp02-to-ghl` invocation
- After publish, show: copyable live URL, Copy Link button, QR code (generated client-side with `qrcode` library), Share to Social button
- Mark node as "Live" in revenue map

**Files changed:**
- `supabase/functions/deploy-bp02-to-ghl/index.ts` — rewrite with full GHL deployment
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — new publish flow + success screen with URL/QR

---

## Phase 2: Fix 2 — Visual Opt-In Page Preview (Step 4)

### New component: `OptInPageBuilder.tsx`
- Takes ABBY's generated `optin_page` data (headline, subheadline, bullets, CTA, colours)
- Renders live HTML in an iframe using `srcdoc`
- Inline editing: clicking any text element opens an edit overlay
- Colour picker pre-loaded with ABBY's palette from design brief
- Desktop/mobile toggle (iframe width changes)
- "Regenerate Design" button calls AI for new layout variation
- Stores final HTML string in `stepData.leadMagnetPage`

### Integration into LeadMagnetStepRenderer
- Replace the `design` step case with `OptInPageBuilder`
- Also integrate into BP02Builder's Review step as a new "Design" tab

**Files changed:**
- `src/components/dashboard/builders/lead-magnet/OptInPageBuilder.tsx` — new component
- `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx` — design step
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — new Design tab in Review

---

## Phase 3: Fix 1 — Edit Step Shows Only Body Content

### Changes to SharedContentStep
- Add `hideSections` prop (string array of title keywords to filter out)
- When `seedFromKey` has populated content, skip "Generate" button — show editable cards directly
- Add word count indicator below content

### Changes to LeadMagnetStepRenderer
- Edit step passes `hideSections={["call-to-action", "author bio", "product recommendation"]}`
- Replace "Generate" button label with "Save Changes"

**Files changed:**
- `src/components/dashboard/builders/shared/SharedContentStep.tsx`
- `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`

---

## Phase 4: Fix 5 — ABBY Content Improvements

### Update `generate-bp02-lead-magnets/index.ts` prompt
- Quiz: 8-10 multiple-choice questions max (already enforced, verify)
- 5 result tiers (up from 3) with: name, 3-sentence description, 2 book tips, CTA to sales page
- 3 headline variants for A/B testing (identity, outcome, curiosity)
- CTA button text in first person with specific outcome
- Thank-you page delivers quiz result immediately (not just via email)
- 5-email nurture sequence structure in output JSON:
  - Email 1 (Immediate): Personalised result delivery
  - Email 2 (Day 2): Story/empathy
  - Email 3 (Day 4): High-value content
  - Email 4 (Day 6): Book chapter reference
  - Email 5 (Day 8): Direct offer with time-limited bonus

**Files changed:**
- `supabase/functions/generate-bp02-lead-magnets/index.ts` — expanded prompt + JSON schema

---

## Phase 5: Fix 4 — Social Media Distribution Pack

### New edge function: `generate-bp02-social-pack/index.ts`
- Triggered after publish
- Generates: LinkedIn (3 posts), Instagram (3), Facebook (2), Twitter/X (5-tweet thread), Email to list (3 subjects + body), Visual Assets Brief (3 specs)
- Stores in `cross_builder_pushes` table linked to BP-02
- Returns structured JSON

### New component: `SocialDistributionPack.tsx`
- Shown on publish success screen
- Displays all generated posts grouped by platform
- Copy button per post
- "Schedule All Posts" button (visible only if Buffer connected — check via connector)

**Files changed:**
- `supabase/functions/generate-bp02-social-pack/index.ts` — new edge function
- `src/components/dashboard/builders/bp02/SocialDistributionPack.tsx` — new component
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — integrate into success screen

---

## Phase 6: Fix 6 — Sticky Subscription Features

### 6a. Lead Magnet Library
- New component `LeadMagnetLibrary.tsx` in Brand Products Hub
- Query `author_nodes` for all BP-02 entries (support multiple via `content_json` array or separate rows)
- Shows: title, type, date, opt-in URL, stats
- Actions: Edit, Duplicate, Archive, View Stats
- "+ Create New Lead Magnet" button
- Database: Add migration to support multiple lead magnets per author (new `lead_magnets` table or use `generated_assets`)

### 6b. Monthly Suggestion
- New edge function `generate-nudges` (already exists) — add lead magnet suggestion logic
- Cron job on 1st of month queries authors with live BP-02 nodes
- Generates suggestion using book context
- Stores as in-app notification + triggers email

### 6c. Performance Dashboard
- New component `LeadMagnetStats.tsx`
- Calls `sync-ghl-metrics` to fetch: total opt-ins, opt-in rate, top traffic source, email open rate
- Accessible from Library, Revenue Dashboard, Marketing Hub

### 6d. A/B Testing
- When author has 1+ live lead magnet, offer A/B variant creation
- Deploy both to GHL as 50/50 split
- After 100 visits, show winner with "Use Winner" button

### 6e. Milestone Celebrations
- Client-side check against GHL metrics
- Trigger toast notifications at 10, 100, 500, 1,000 opt-ins
- Each milestone points to next unbuilt node

**Files changed:**
- `src/components/dashboard/builders/bp02/LeadMagnetLibrary.tsx` — new
- `src/components/dashboard/builders/bp02/LeadMagnetStats.tsx` — new
- `src/pages/BrandProductsHub.tsx` — integrate library view
- Database migration for `lead_magnets` table (if needed)
- `supabase/functions/generate-nudges/index.ts` — add monthly suggestion logic
- Multiple component files for A/B testing and milestones

---

## Database Changes

1. **New table `lead_magnets`** (if supporting multiple per book):
   - `id`, `author_id`, `book_id`, `node_id` (FK to author_nodes), `title`, `type`, `status`, `optin_url`, `ghl_funnel_id`, `content_json`, `stats_json`, `created_at`, `updated_at`
   - RLS: authors can only access their own rows

2. **Alter `author_nodes`**: No schema changes needed — `content_json` JSONB handles all new data fields

---

## Dependencies / NPM Packages
- `qrcode.react` — QR code generation for live URL display
- No other new packages needed

---

## Implementation Order
1. Phase 1 (Fix 3) — GHL Publish
2. Phase 2 (Fix 2) — Visual Opt-In Page
3. Phase 3 (Fix 1) — Edit Step cleanup
4. Phase 4 (Fix 5) — ABBY prompt improvements
5. Phase 5 (Fix 4) — Social Distribution Pack
6. Phase 6 (Fix 6) — Library, monthly suggestions, stats, A/B, milestones

Each phase is independently deployable and testable. No existing functionality is broken — all changes are additive or replace only BP-02-specific code paths.

