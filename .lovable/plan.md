
## Sprint 63 — BP-03 Carousels + Download Graphic (no Buffer)

Two open bugs from the last pass. Buffer is explicitly excluded — copy-paste workflow stays the model (Sprint 61 lock).

---

### BUG-2 — Carousels never get created

**Root cause**
- `flattenPosts` only marks a day as a carousel if it falls in `CAROUSEL_IG_DAYS` (days 3, 6, 9, 12, 15, 18). Your `content_json.posts` only contains **5 days**, so at most 1 day qualifies.
- The auto-repair gate in `bp03-node-state` only fires when `archetype IS NULL` OR `post_type = 'Insight'`. After the last fix backfilled archetypes, that condition is permanently false → carousel-synth code never runs again.
- All 20 Instagram rows currently have `carousel_slides IS NULL`.

**Fix**
1. `supabase/functions/bp03-node-state/index.ts`
   - Drop the day-list rule. New rule: **every Instagram post is a carousel** (5 slides synthesized from the caption, same logic already in place).
   - Widen the `auto_repair_if_stale` staleness check to also trigger when any Instagram row has `carousel_slides IS NULL`.
2. `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
   - Mirror the same staleness check on mount so the silent auto-repair fires once for existing users.
3. One-shot SQL backfill: synthesize `carousel_slides` for the user's existing 5 Instagram rows by splitting their caption into 5 slide objects (hook / point 1 / point 2 / point 3 / CTA). Same shape the function produces.

---

### BUG-3 — "Download graphic" never appears

**Root cause**
- The button is gated on `graphic_url` (or `graphics.{size}`) being populated. Code is correct — `generateAllGraphics` and `generateOneGraphic` both call `load()` after success, so the card *should* flip from "Generate" → "Download".
- But `bp03-generate-all-graphics` shows **zero invocations** for this user. No graphics have ever successfully generated, so the Download state is never reached.

**Fix**
1. `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
   - Add a one-line helper under the page header: *"Click Generate graphic on any card. Once it's ready, the button becomes Download graphic."*
   - In the bulk handler, when the response returns `generated === 0 && failed > 0`, surface the failure count in the toast so the user knows generation actually ran and failed (instead of silently doing nothing).
2. `supabase/functions/bp03-generate-all-graphics/index.ts`
   - Add `console.info` breadcrumbs at start, per-post, and final summary so we can diagnose future "no graphic" reports from logs alone.

No DB changes for BUG-3.

---

### Out of scope (deliberate)
- No Buffer OAuth, no Buffer migration, no social-account reconnection.
- No regeneration of caption text — existing AI captions stay.
- No changes to BP-02, scheduling, ZIP export, or `social-publish`.

### Verification
1. Reload Social Calendar → silent auto-repair fires once → all 5 Instagram cards now show a 5-slide carousel preview.
2. Badge distribution remains 6 archetypes (already fixed last sprint).
3. Click "Generate graphic" on any card → after ~10s the button label flips to "Download graphic" and clicking downloads the PNG. If generation fails, toast shows "0 generated, N failed" instead of silent success.
4. Edge function logs for `bp03-generate-all-graphics` now show start/per-post/summary breadcrumbs.

### Files touched
- `supabase/functions/bp03-node-state/index.ts`
- `supabase/functions/bp03-generate-all-graphics/index.ts`
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
- 1 SQL migration (carousel_slides backfill for existing IG rows)
