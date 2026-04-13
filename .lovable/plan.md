

# Audit & Fix: Brand Products Routing, Stats, and Architecture

## Problems Found

### 1. BP-02 Redirect Goes to Wrong Section
`NodeBuilder.tsx` redirects BP-02 to `/dashboard?section=lead-magnet-funnel`, but the actual dashboard section name is `"lead-magnet"`. This causes the dashboard to fall through to the overview/Book Hub page — explaining the "going round and round" behavior.

### 2. Stats Count Shows Zero (Identity Mismatch)
The `author-stats` edge function resolves the user via `author_profiles.user_id`, but the JWT token comes from the shared backend. The shared backend user ID doesn't match the local `user_id` (`ef23c521...`) stored in `author_profiles`. The function already has logic to try the shared backend first, but the resulting `userId` doesn't match any local profile, so everything returns 0 — including brand built count.

**Evidence:** Calling `author-stats` with the current session returns `nodesBuilt.brand: 0` even though BP-02 is `live` and BP-04 has an `author_slug`.

### 3. Legacy Builders (BP-01, BP-03, BP-04, BP-05) All Gate on Book Profile
All legacy `BPxxBuilder` components use `useAuthorBook` which queries the `books` table by the JWT user ID. If that ID doesn't match `books.author_id`, `hasBook` returns false and the builder shows "Complete Book Profile" — even though the book exists.

### 4. BrandProductsHub Status Badges Don't Reflect Reality
The hub queries `author_nodes` using the profile ID from `author_profiles.user_id = user.id`. Same identity mismatch means nodes show as "Ready to Build" even when BP-02 is live.

## Root Cause
All issues stem from the **shared-backend identity mismatch**: the authenticated user's JWT ID differs from the local `user_id` stored in `author_profiles` and `books.author_id`. The `useAuthorBook` hook and `BrandProductsHub` both query by JWT user ID directly instead of resolving through the profile chain.

## Plan

### Fix 1: Correct BP-02 Redirect (1 line)
**File:** `src/pages/NodeBuilder.tsx`
- Change `lead-magnet-funnel` → `lead-magnet` in the redirect URL

### Fix 2: Fix `author-stats` Identity Resolution
**File:** `supabase/functions/author-stats/index.ts`
- After resolving the JWT user, also try matching by email in `author_profiles` (not just `user_id`)
- If no profile found by `user_id`, fall back to finding by email from the JWT user object
- This ensures the stats pick up the correct profile regardless of which backend issued the JWT

### Fix 3: Fix `BrandProductsHub` Identity Resolution
**File:** `src/pages/BrandProductsHub.tsx`
- The hub already queries `author_profiles.user_id = user.id` — needs to also try matching by email as a fallback
- Once the correct profile ID is found, nodes query will work correctly and show "Live" for BP-02

### Fix 4: Fix `useAuthorBook` Hook Identity Resolution
**File:** `src/hooks/useAuthorBook.ts`
- Add email-based fallback when querying `books` table
- Query by `owner_email` in addition to `author_id` to handle the cross-backend identity case
- This unblocks all legacy builders (BP-01, BP-03, BP-04, BP-05) from the "Complete Book Profile" gate

### Fix 5: Redirect Remaining Legacy BP Nodes
**File:** `src/pages/NodeBuilder.tsx`
- Apply the same redirect pattern used for BP-02 to other nodes that have UniversalBuilderStudio equivalents:
  - BP-01 → `/dashboard?section=email-marketing`
  - BP-03 → `/dashboard?section=social-media`  
- Keep BP-04 (Website) and BP-05 (Webinars) as legacy builders for now since they have dedicated GHL deploy flows

### Node Button Routing Summary (All 9 Brand Products)

| Node | Current Destination | Fix |
|------|-------------------|-----|
| BP-01 Email Marketing | `/node-builder/BP-01` (legacy, broken gate) | Redirect to `/dashboard?section=email-marketing` |
| BP-02 Lead Magnets | `/dashboard?section=lead-magnet-funnel` (wrong name) | Fix to `lead-magnet` |
| BP-03 Social Media | `/node-builder/BP-03` (legacy, broken gate) | Redirect to `/dashboard?section=social-media` |
| BP-04 Website | `/node-builder/BP-04` (legacy, broken gate) | Fix identity in useAuthorBook |
| BP-05 Webinars | `/node-builder/BP-05` (legacy, broken gate) | Fix identity in useAuthorBook |
| BP-06 Workbook | `/node-builder/BP-06` → dashboard builder | Already works via UniversalBuilderStudio |
| BP-07 Home Study | `/node-builder/BP-07` → dashboard builder | Already works |
| BP-08 Special Editions | `/node-builder/BP-08` → dashboard builder | Already works |
| BP-09 Book Sales | `/node-builder/BP-09` → dashboard builder | Already works |

## GHL Integration Architecture (Branding & Marketing Nodes)

```text
┌──────────────────────────────────────────────────────┐
│                  Brand Products Hub                   │
│        /brand-products (status from author_nodes)     │
└──────────┬───────────────────────────────────────────┘
           │ "Build This Product →"
           ▼
┌──────────────────────────────────────────────────────┐
│          UniversalBuilderStudio / Legacy Builder      │
│  Steps: Configure → Generate → Edit → Design → Pub   │
│  Content stored in: generated_assets (new builders)   │
│                     author_nodes.content_json (legacy) │
└──────────┬───────────────────────────────────────────┘
           │ "Publish to Marketing Hub"
           ▼
┌──────────────────────────────────────────────────────┐
│           deploy-bpXX-to-ghl Edge Function            │
│  1. Upsert content_payload → author_nodes             │
│  2. Check GHL_AGENCY_KEY + ghl_sub_account_id         │
│  3. If missing → provision-ghl-subaccount             │
│  4. If still missing → status: published_pending_ghl  │
│  5. If available → create funnel/workflow/tags in GHL │
│  6. Update author_nodes → status: live                │
│  7. Return microsite_url                              │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│              author_nodes (source of truth)            │
│  status: live | published_pending_ghl                 │
│  content_json: full product content                   │
│  microsite_url: public page URL                       │
│  ghl_resource_id: funnel/workflow ID                  │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  author-stats edge function reads author_nodes        │
│  → nodesBuilt.brand count shown in sidebar            │
│  → BrandProductsHub reads for status badges           │
└──────────────────────────────────────────────────────┘
```

### Per-Node GHL Deployment

| Node | Edge Function | GHL Resources Created |
|------|--------------|----------------------|
| BP-01 Email | deploy-bp01-to-ghl | Email sequences, workflows, automations |
| BP-02 Lead Magnet | deploy-bp02-to-ghl | Funnel (opt-in + thank-you pages), workflow, custom fields, tag |
| BP-03 Social Media | deploy-bp03-to-ghl | Social planner calendar, content posts |
| BP-04 Website | BP04Builder internal | Author microsite pages (home, about, book) |
| BP-05 Webinars | deploy-bp05-to-ghl | Registration funnel, follow-up emails |

## Files Changed

| File | Change |
|------|--------|
| `src/pages/NodeBuilder.tsx` | Fix BP-02 redirect; add BP-01, BP-03 redirects |
| `supabase/functions/author-stats/index.ts` | Add email-based profile resolution fallback |
| `src/pages/BrandProductsHub.tsx` | Add email-based profile lookup fallback |
| `src/hooks/useAuthorBook.ts` | Add `owner_email` fallback query |

