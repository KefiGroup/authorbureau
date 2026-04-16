

# Link Path Audit — Dead End Analysis

## Audit Method
I checked every link path across the 28 nodes: dashboard hub links → builder routes → success screen URLs → public microsite resolution → edge function responses.

## Findings

### 1. CRITICAL: `getMicrositeUrl()` generates unreachable URLs
**File:** `src/lib/node-slug-map.ts` line 84
**Issue:** Generates `https://authorsbureau.com/pauline-teo/free-gift` but the actual published domain is `https://authorbureau.lovable.app`. This means every "Copy Link" and "View Live" button on the Publish Success Screen gives authors a **dead link** that resolves to nothing.
**Impact:** All 24 nodes with public pages (everything except BP-01, BP-03, BA-15, BA-18).
**Fix:** Change `getMicrositeUrl()` to use `window.location.origin` or a configurable base URL so links always point to the actual live domain.

### 2. OK: Dashboard → Builder routes
All 28 `/node-builder/{nodeId}` routes resolve correctly:
- `BrandProductsHub`, `BuildAuthorityHub`, `YieldRevenueHub` all link to `/node-builder/{id}`
- Route `/node-builder/:nodeId` exists in `App.tsx` (line 139)
- All 28 builder components exist and are imported in `NodeBuilder.tsx`
- "Back to Hub" links use correct hub paths (`/brand-products`, `/build-authority`, `/yield-revenue`)

### 3. OK: Public microsite routing
- `/:authorSlug/:bookSlug` → `AuthorSubpageResolver` correctly checks `SLUG_TO_NODE` for known slugs and falls back to dynamic lookup
- `get-microsite-page` edge function returns proper responses: 200 for live nodes, 404 with "Node not live" for inactive ones (handled as "Coming Soon" in the UI)
- `/:authorSlug/:bookSlug/:productType` → `AuthorProductPage` with full product config for all types

### 4. OK: Author slug consistency
Author slugs are auto-generated via `generate_unique_author_slug()` trigger. The test author "Pauline Teo" resolves correctly as `pauline-teo`.

### 5. OK: Legacy redirects
- `/authors/:slug` → `/:slug` (redirect)
- `/books/:slug` → `/:authorSlug/:bookSlug` (redirect with DB lookup)
- `/reader-portal/:id` → `/readers-bureau/learn/:id`

### 6. MINOR: `authorsbureau.com` references in website builder UI
**Files:** `WebsiteSetupStep.tsx`, `WebsitePublishStep.tsx`, `SeoAnalyticsStep.tsx`
These show `yourname.authorsbureau.com` as the subdomain format. This is display-only (subdomain hosting isn't implemented yet), so it's cosmetic but misleading if authors expect it to work.

### 7. OK: No-microsite nodes handled correctly
BP-01 (Email), BP-03 (Social), BA-15 (Media & PR), BA-18 (JV Partnerships) are correctly excluded from public URL generation via `NO_MICROSITE_NODES`.

---

## Plan: Fix the Dead Link Issue

### File changes

**`src/lib/node-slug-map.ts`** — Update `getMicrositeUrl()` to use the actual origin:
```typescript
export function getMicrositeUrl(penNameSlug: string, nodeId: string): string | null {
  if (NO_MICROSITE_NODES.has(nodeId)) return null;
  const slug = NODE_SLUG_MAP[nodeId];
  if (slug === undefined) return null;
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://authorbureau.lovable.app';
  return `${base}/${penNameSlug}/${slug}`;
}
```

This single change fixes the "Copy Link" and "View Live" buttons across all 24 public-facing node success screens.

### No other dead ends found
All other paths (hub → builder, builder → success, public routes, legacy redirects) resolve correctly.

