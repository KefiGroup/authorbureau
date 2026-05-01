/**
 * Frontend re-export of the canonical readiness module.
 *
 * The actual rules live in `supabase/functions/_shared/node-readiness.ts`
 * so the edge function (`author-stats`) and the frontend hooks
 * (`useBookNodeProgress`, `useNodeLiveStats`) read from a single source.
 *
 * DO NOT add logic here. Add it to the shared module.
 */
export { AUTHOR_LEVEL_NODES, hasRequiredAssets, warnIfStuckLive } from "../../supabase/functions/_shared/node-readiness";
