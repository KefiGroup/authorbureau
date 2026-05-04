## What I found

Two separate problems are happening on the live site:

1. Saving BP-02 drafts is failing on the backend.
   - The backend logs show `save-author-node` failing with: `malformed array literal: "placeholder"`
   - The BP-02 social pack edge function also logs: `persist social_pack failed: malformed array literal: "placeholder"`
   - This means the UI can say "Draft saved" even though the database write actually failed.

2. Refresh persistence is still not robust enough for your BP-02 flow on the published site.
   - The direct `/node-builder/BP-02?bookId=...` route exists, but I need to tighten the builder-opening path so the app always lands on the direct builder URL before a refresh happens.

## Build plan

### 1. Fix the real save failure first
I will trace exactly which database trigger or write path is turning the string `placeholder` into an invalid array update during `author_nodes` saves.

Then I will harden the save flow so BP-02 saves succeed reliably when:
- generating the lead magnet
- generating the social pack
- clicking Save Draft
- publishing

### 2. Make save results truthful in the UI
I will update the shared autosave helper so it returns a real success/failure result instead of silently swallowing backend errors.

Then I will update BP-02 to:
- only show success toasts when the save actually succeeded
- show a real error if the backend rejected the write
- block publish if the final save failed

This removes the false-positive "Draft saved" behaviour.

### 3. Lock refresh to the exact builder page
I will tighten dashboard-to-builder navigation so BP-02 always opens using the direct node-builder URL with the active `bookId` preserved.

That includes:
- builder entry from dashboard / book hub
- section redirects for BP-02
- preserving the current builder URL on refresh

Goal: refreshing BP-02 should reopen BP-02, not send you back to dashboard/book hub.

### 4. Verify BP-02 as the gold standard
Once the above is fixed, BP-02 will be the reference implementation for:
- real save persistence
- truthful save feedback
- leave/return persistence
- refresh-safe routing

After that, the same pattern can be replicated to BP-06 and the rest.

## Files likely to change

- `src/lib/builder-autosave.ts`
- `src/components/dashboard/builders/bp02/BP02Builder.tsx`
- `src/components/dashboard/builders/bp02/SocialDistributionPack.tsx`
- `src/pages/AuthorDashboard.tsx`
- possibly `supabase/functions/save-author-node/index.ts`
- possibly `supabase/functions/generate-bp02-social-pack/index.ts`

## Technical notes

Confirmed backend evidence from logs:
- `save-author-node`: `update failed: malformed array literal: "placeholder"`
- `generate-bp02-social-pack`: `persist social_pack failed: malformed array literal: "placeholder"`

So the next implementation step is not guesswork. I’ll fix the real failing save path first, then the routing persistence around it.