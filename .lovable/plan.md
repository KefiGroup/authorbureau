## BP-03 Spec Reconciliation v2 — 9 Bugs

Locking in: archetypes = **Quote / Lesson / Question / Story / Framework / Proof**. Graphics = full scope (3 sizes per post + brand-kit on every post). BUG-10 excluded (user action, not a bug).

---

### BUG-1 + BUG-2 — 30 posts across 6 archetypes (Critical)

**Root cause:** `generate-bp03-social-media` produces 5 posts × 4 platforms = 20. There is no `archetype` concept anywhere — the "Insight" badge is a hardcoded UI fallback.

**Fix:**
1. Rewrite each platform prompt to produce **30 posts** organised as 5 posts × 6 archetypes (Quote / Lesson / Question / Story / Framework / Proof), each with a strict `archetype` field.
2. Add `archetype TEXT` column to `social_posts` + a CHECK constraint on the 6 values.
3. Generator writes `archetype` per row; UI badge reads from the row (falls back to `Insight` only if NULL legacy data).
4. Token bumps: LinkedIn ~14k, IG+FB ~18k, X ~12k. No `temperature` override (gpt-5 ban).

### BUG-3 — Mark as Posted button on every card (High)

`markAsPosted` already exists in `SocialCalendarTab.tsx` but is gated. Surface it on **every** card whose status is `scheduled`/`ready`, plus the BP-03 builder preview list. On click → `status='posted'`, `posted_at=now()`, increment "X of 30 posted" counter, trigger `auto-refill-social-calendar` if unposted < 7.

### BUG-4 — Open LinkedIn / Facebook / Instagram buttons (High)

Honest copy-paste per Sprint 61. Each card gets 3 buttons:
- **Copy + Open LinkedIn** → copies caption+hashtags, opens `linkedin.com/feed/?shareActive=true`
- **Copy + Open Facebook** → opens `facebook.com/`
- **Copy + Open Instagram** → opens `instagram.com/` (mobile detect → `instagram://camera`)

No deep-link publishing — clipboard + new-tab composer only.

### BUG-5 — Facebook / Instagram persistence (High)

Two co-existing causes:
1. OAuth callback doesn't notify the parent — add `BroadcastChannel('social-connect')` ping in `SocialAuthCallback.tsx`; `useSocialConnectionStatus` already listens.
2. Duplicate `(user_id, platform)` rows confuse render. Migration: collapse duplicates keeping newest, add unique index `(user_id, platform)`.
3. Gate first query on `useAuthReady` (already wired in current hook — verify on `ConnectSettings.tsx` too).
4. Verify `meta-oauth-callback` actually writes the row (logs check).

### BUG-6 — Instagram carousels (Medium)

Mark exactly **9 of the 30 IG posts** as `format: "carousel"` with 5-slide arrays (`carousel_slides: [{headline, body, image_prompt}]`). New `CarouselPreview.tsx` (already created last loop) renders horizontal swiper. "Download all 5 slides" button calls `bp03-generate-all-graphics` with `slide_index`.

### BUG-7 — 3 size variants per post (Medium, full scope)

For every post, generate **3 graphics**:
- **Landscape 1200×628** → LinkedIn + Facebook
- **Portrait 1080×1350** → Instagram default
- **Square 1080×1080** → Instagram alternate / X fallback

Schema: replace `graphic_url TEXT` with `graphics JSONB` on `social_posts`:
```json
{ "landscape": "url", "portrait": "url", "square": "url" }
```
Migration keeps `graphic_url` as a generated/back-compat column pointing at the platform's preferred size. Download menu on each card lists all 3 sizes.

### BUG-8 — Brand-kit on graphics (Medium, full scope)

**Reuse `compose-social-post`** from Sprint 37 instead of building parallel logic in `bp03-generate-all-graphics`. That function already pulls brand kit (colors, font, book cover) and does 2-step generate-then-burn-in.

Refactor `bp03-generate-all-graphics` to:
1. For each post × each of 3 sizes → call `compose-social-post` with the right aspect ratio + brand kit + caption headline + book cover.
2. Store all 3 URLs in the new `graphics` JSONB column.
3. Cost guardrail: regen confirmation modal warns "Generating 90 graphics (30 posts × 3 sizes), takes ~5 min".

### BUG-9 — Step 5 label verification (Low)

Open BP-03 Builder, confirm Step 5 reads **"Send to Social Calendar"**. If not, change the label string in `BP03Builder.tsx`. (One-line fix.)

---

### Files touched

- `supabase/functions/generate-bp03-social-media/index.ts` — 30-post / 6-archetype prompts, token bumps, carousel marker
- `supabase/functions/bp03-generate-all-graphics/index.ts` — refactored to call `compose-social-post` × 3 sizes per post
- `supabase/functions/compose-social-post/index.ts` — verify it accepts `aspect_ratio` param; add if missing
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — archetype badge, Mark-as-posted on every card, 3 platform "Copy + Open" buttons, size-picker download menu, carousel preview, "X of 30" counter
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — same buttons in builder preview, Step 5 label check, "30 posts" copy everywhere
- `src/components/dashboard/builders/bp03/CarouselPreview.tsx` — already exists, wire into both surfaces
- `src/hooks/useSocialConnectionStatus.ts` — already updated; verify `useAuthReady` gate
- `src/pages/SocialAuthCallback.tsx` — emit BroadcastChannel on success
- `src/pages/ConnectSettings.tsx` — same de-dupe + auth-ready gate
- **Migration:**
  - Add `archetype TEXT` + CHECK constraint to `social_posts`
  - Add `graphics JSONB` to `social_posts`, migrate existing `graphic_url` → `graphics.square`
  - Collapse duplicate `(user_id, platform)` rows in `social_connections` + unique index

### Out of scope
Buffer, X OAuth, automated publishing, BUG-10 (Pauline clicks Connect on LinkedIn herself).

### Risk / open question
Brand-kit + 3-size generation triples image-gen cost per regen (~90 calls per BP-03 build). I'll add a confirm modal and a "regenerate one platform only" option to keep iteration cheap.
