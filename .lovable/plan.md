## Edge Function Build Errors — Audit & Cleanup Plan

### Context
The build broke when deploying any edge function project-wide because the Deno type-checker now scans every function in `supabase/functions/`. Three pre-existing categories of tech debt that were previously hidden are now blocking deploys. **None were caused by the annual-product fix** — that change only edited `check-subscription/index.ts` and `useAuth.tsx`, both of which type-check cleanly.

---

### Category 1 — Stale npm import versions (~30+ functions)

**Problem.** Many edge functions pin old versions that are no longer in the Deno node_modules cache:
- `npm:@supabase/supabase-js@2.45.4` and `npm:@supabase/supabase-js@2.57.2` — current standard is `2.57.2` (already used by `check-subscription`); a few stragglers still on `2.45.4`.
- `npm:stripe@17.7.0` — Lovable's current Stripe knowledge recommends `https://esm.sh/stripe@18.5.0`.
- `npm:pptxgenjs@3.12.0` — used by `export-pro-slides` and `export-bp09-slides`.

**Affected functions (sample):**
- Stripe 17.7.0: `create-checkout`, `create-checkout-session`, `create-product-checkout`, `customer-portal`, `cancel-subscription`, `verify-purchase`, `process-purchase`, `setup-stripe-product`, `stripe-connect`, `run-monthly-payouts`, `check-subscription`, `ba11-publish-audiobook`, plus all `deploy-yr*-to-ghl`, `deploy-bp06/07/08-to-ghl`, `deploy-ba10/12/13/17`, `deploy-ba10-to-thinkific`, `deploy-yr25-to-thinkific`.
- supabase-js 2.45.4: `ba11-publish-audiobook`, `ba11-audiobook-generate`, `save-author-node`.
- pptxgenjs: `export-pro-slides`, `export-bp09-slides`.

**Fix.** Standardize to the versions that actually resolve in the Deno runtime:
- `import Stripe from "https://esm.sh/stripe@18.5.0"` (esm.sh resolves cleanly without node_modules).
- `import { createClient } from "npm:@supabase/supabase-js@2.57.2"` everywhere.
- `import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0"` (switch to esm.sh to avoid the npm cache miss).

This is a mechanical search-and-replace, no behavioral change.

---

### Category 2 — TS18046 "err is of type 'unknown'" (3 confirmed, likely more)

**Problem.** TypeScript 4.4+ types `catch (err)` as `unknown` by default. Several edge functions read `err.message` directly:
- `supabase/functions/deploy-bp03-to-ghl/index.ts:116`
- `supabase/functions/deploy-bp04-to-ghl/index.ts:158, 160`
- `supabase/functions/deploy-bp05-to-ghl/index.ts:154, 156`

The `rg` scan suggests ~20+ more functions use `catch (err)` followed by `err.message` and may surface additional errors as the build progresses past the first failure.

**Fix.** Replace each occurrence with the safe pattern already used in `check-subscription`:
```ts
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  // …use errorMessage
}
```

---

### Category 3 — TS7006 implicit `any` parameters

**Problem.** `supabase/functions/enrich-book-data/index.ts:121–122` — `.map(cat => …)` and `.filter(cat => …)` lack parameter types under strict mode.

**Fix.** Annotate: `.map((cat: string) => …)` and `.filter((cat: string) => …)`.

---

### Cleanup proposal — beyond the immediate fix

Once the build is green, two low-risk hygiene items worth doing in the same pass:

1. **Remove `LEGACY_TIER_MAP`** in `src/hooks/useAuth.tsx` (starter/pro/enterprise aliases). Confirmed unused via codebase search; harmless to keep but adds noise.
2. **Audit `setup-stripe-product` and `create-product-checkout`** to confirm they don't hardcode a competing tier→product mapping that could drift from `useAuth.tsx`. Read-only check; no edits expected unless drift is found.

What I am **not** proposing right now:
- Refactoring the Stripe customer-lookup pattern across all functions (works fine, just verbose).
- Migrating to `@supabase/supabase-js/cors` import (newer pattern, but the existing manual `corsHeaders` constants are correct and uniform).
- Touching the 20+ `deploy-*-to-ghl` functions beyond the `err.message` fixes — they're working in production.

---

### Execution order

1. Fix the 3 confirmed TS18046 errors (`deploy-bp03/04/05-to-ghl`).
2. Fix the TS7006 errors in `enrich-book-data`.
3. Standardize npm imports across all affected functions to versions that resolve in the Deno runtime.
4. Re-deploy the touched functions and confirm a clean build.
5. Sweep for any additional `err.message` errors surfaced by the now-progressing type-checker and patch them with the same `instanceof Error` guard.
6. Optional cleanup: remove `LEGACY_TIER_MAP`; audit `setup-stripe-product` / `create-product-checkout` for tier-mapping drift.

### Files expected to change
- `supabase/functions/deploy-bp03-to-ghl/index.ts`
- `supabase/functions/deploy-bp04-to-ghl/index.ts`
- `supabase/functions/deploy-bp05-to-ghl/index.ts`
- `supabase/functions/enrich-book-data/index.ts`
- ~30 edge functions for npm version standardization (mechanical edits)
- Possibly more for additional `err.message` cleanups discovered during step 5
- `src/hooks/useAuth.tsx` (optional `LEGACY_TIER_MAP` removal)

### Risk
Low. All changes are either type-safety patches or version normalizations to versions already used elsewhere in the project. No runtime behavior changes for any currently-working code path. The annual-product subscription fix from the previous step remains intact.
