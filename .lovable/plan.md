

# Fix: Lead Magnet Builder Should Use Existing Content Instead of Restarting

## Problem

There are **two separate builders** for Lead Magnets (BP-02):
1. **Old `BP02Builder`** — accessed from BrandProductsHub via `/node-builder/BP-02`. Stores/reads content from `author_nodes` table.
2. **New `UniversalBuilderStudio` + `LeadMagnetStepRenderer`** — accessed from AuthorDashboard. Stores content in `generated_assets` table.

When you generate content via the new builder, the old builder doesn't see it because it only checks `author_nodes`. So it shows "Complete Book Profile" and wants to restart from scratch.

## Solution

**Retire the old `BP02Builder` route.** Make `/node-builder/BP-02` redirect to the UniversalBuilderStudio-based lead magnet builder in the AuthorDashboard, so there's a single source of truth.

### Changes

| File | Change |
|------|--------|
| `src/pages/NodeBuilder.tsx` | For `BP-02`, instead of rendering `BP02Builder`, redirect/navigate to the dashboard's lead magnet builder section (e.g., `/dashboard?section=lead-magnet-funnel`) |

This is a one-line change: when `nodeId === "BP-02"`, navigate to the dashboard section that already hosts the working UniversalBuilderStudio builder with all existing content, headline picker, and publish flow.

### Why This Is Better
- Single builder, single content store — no duplication
- All previously generated content is immediately available
- Publish flow goes straight to GHL as designed
- No need to re-generate anything

