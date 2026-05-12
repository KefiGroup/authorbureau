## Honest answer

Yes, but the previous fixes only repair **newly generated** kits. Your current 20 rows in the calendar were written **before** the deploy, so they still carry the old shape:

```
DB state (current 20 rows):
  post_type = "Insight"   (all 20)
  archetype = NULL        (all 20)
  carousel_slides = NULL  (all 20)
  graphic_url = NULL      (all 20)  ← that's why every card shows "Generate graphic" only
  1 platform per row      (LI/IG/FB/TW rotating, not 4 per day)
```

The new `flattenPosts` logic (deterministic archetype rotation + carousel synthesis) is correct, but it never re-runs against rows that were inserted before the fix shipped. That is the entire reason the DOM still reads "19 × Insight, 0 carousels".

## What I'll actually do

**FIX-1 — One-shot repair on load (BUG-1 + BUG-2)**
File: `supabase/functions/bp03-node-state/index.ts`
- In the existing `repair_calendar` action, drop the `hasUsableSocialKit` precondition for one specific case: if **any** existing `social_posts` row for this author/BP-03 has `archetype IS NULL` OR `post_type = 'Insight'`, force-rebuild from `content_json` (calls the already-fixed `flattenPosts` → 4 platforms × 20 days = 80 rows, 6 archetypes, 6 IG carousels with `carousel_slides` populated).
- Add a new `action: "auto_repair_if_stale"` returning `{ repaired: true|false, count }` so the UI can call it once on mount.

File: `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
- On first mount (after the existing fetch), if any loaded post has `archetype == null` or `post_type === 'Insight'`, fire `bp03-node-state` with `action: "auto_repair_if_stale"` then refetch. Silent — no toast unless it fails.

**FIX-2 — UI hardening so legacy null archetypes never render "Insight" (BUG-1 belt-and-braces)**
File: `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` (lines 943, 1055)
- Replace `{post.archetype || post.post_type}` with `{post.archetype || (ARCHETYPES_FE[post.post_index % 6])}`. Local constant `ARCHETYPES_FE = ["Quote","Lesson","Question","Story","Framework","Proof"]`. Means even if a row sneaks through with `archetype=null`, the badge will never say "Insight".

**FIX-3 — Clarify "Download graphic" expectation (BUG-3)**
This is **not actually a missing button** — it's gated correctly on `graphic_url` existing. Your 20 rows have `graphic_url = NULL`, so the UI correctly shows "Generate graphic" instead. After FIX-1 reseeds the rows, click **"Generate graphics"** (the bulk button at line 773) once → graphics get generated → "Download graphic" appears on every card. No code change needed; I'll add a one-line tooltip on the Generate button: *"Generates a branded graphic; once ready, this becomes Download graphic."* so the affordance is obvious.

**FIX-4 — Backfill SQL migration (so even users who never re-open the page get repaired)**
Migration: `UPDATE public.social_posts SET archetype = (ARRAY['Quote','Lesson','Question','Story','Framework','Proof'])[((post_index % 6) + 1)], post_type = (ARRAY['Quote','Lesson','Question','Story','Framework','Proof'])[((post_index % 6) + 1)] WHERE node_id = 'BP-03' AND (archetype IS NULL OR post_type = 'Insight');`
This guarantees the badges read correctly even before the user reloads. Carousels still need the in-app repair (FIX-1) because their slides come from caption text, not from a constant.

## Out of scope
- No regeneration of caption/AI content — your existing captions stay.
- No social-account reconnection — model is still copy-paste.
- No changes to BP-02, scheduling, or ZIP export.

## Verification (after approval + run)
1. Refresh Social Calendar → silent auto-repair fires once → 80 rows now exist (4 platforms × 20 days), badges rotate Quote/Lesson/Question/Story/Framework/Proof, 0 cards say "Insight".
2. Days 3, 6, 9, 12, 15, 18 (Instagram only) show the carousel preview block with 5 slides.
3. Click "Generate graphics" → all 80 cards flip to "Download graphic".

## Files touched
- `supabase/functions/bp03-node-state/index.ts` (add `auto_repair_if_stale` action)
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` (mount-time call + badge fallback + tooltip)
- 1 SQL migration (archetype backfill)
