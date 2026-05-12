## Goal

Pivot BP-03 to a pure **copy-paste social library** model: 20 posts across 6 archetypes, ~6 Instagram carousels, no platform connections anywhere.

---

## Changes

### 1. Spec: 30 → 20 posts (5 files)
- **`generate-bp03-social-media/index.ts`** — change loop `days = 30` → `20`; archetype manifest 30 → 20; `CAROUSEL_IG_DAYS` set → 6 evenly-spread days `{3, 6, 10, 13, 17, 20}`; update all "30 LinkedIn / 30 Instagram / 30 Facebook / 30 X" prompts to "20"; update `rotating` hashtag pool count from 30 → 20; update default `calendar_name` and `abby_summary`.
- **`bp03-node-state/index.ts`** — update repair-path day count and any `30` literals to `20`.
- **`bp03-generate-all-graphics/index.ts`** — update batch size if it iterates 30.
- **`BP03Builder.tsx`** — subtitle and intro copy: "20 posts across 6 archetypes (5 each from Quote / Lesson / Question / Story / Framework / Proof) + ~6 Instagram carousels + outreach kit".
- **`MarketingHub.tsx`** — campaign description "20 posts".
- **`SocialCalendarTab.tsx`** — any visible "30 posts" labels.
- **`docs/04-node-frameworks/BP-03.md`** + **`README.md`** — update spec to 20.

### 2. Archetype labels actually render
Already canonical in generator (Sprint fix landed). Verify `SocialCalendarTab.tsx` reads `post.post_type` (or `archetype` column) and renders that as the badge — not a hardcoded "Insight" string. Fix if still hardcoded.

### 3. Hide ALL social-connection UI (copy-paste only)
- **`src/pages/ConnectSettings.tsx`** — remove the entire "Social Accounts" section (LinkedIn / Facebook / Instagram / X tiles). Keep email + payout sections only.
- **`SocialCalendarTab.tsx`** — remove "Connect" CTAs, remove the `useSocialConnectionStatus` gate, remove "Mark as Posted" auto-publish path. Replace per-card actions with: **Copy Caption**, **Copy Hashtags**, **Download Image**, **Download Carousel ZIP** (where applicable).
- **`BP03Builder.tsx`** — Step 4 stays "Send to Social Calendar" but description reframes as "Save to your copy-paste library" (no "Activate auto-posting" wording).
- **Dashboard banner** — remove "Connect your social accounts" prompt if it appears (search `useSocialConnectionStatus` callsites).
- Leave the underlying `social_connections` table + `social-connect-callback` edge function in place (no DB drops) — just hide the UI. This keeps the rollback path open.

### 4. Instagram carousels (~6 of 20)
Generator already produces `format: "carousel"` with 5 slides on the `CAROUSEL_IG_DAYS`. Confirm `SocialCalendarTab.tsx` renders `<CarouselPreview>` when `instagram.format === "carousel"` and offers a "Download Carousel ZIP" (5 image variants) action. If ZIP download doesn't exist yet, add a client-side JSZip bundler over the existing `graphics` URLs.

### 5. Copy/docs sweep
- Replace every "30 posts" / "30-day" string in BP-03 surfaces with "20 posts" / "20-day".
- Memory update: amend `mem://features/abby-copy-paste-social-factory-sprint61` to lock the new spec (20 posts, 6 archetypes, ~6 carousels, no connections).

---

## Out of scope
- No DB migration. `social_connections` table and OAuth functions stay (dormant).
- No changes to BP-02 social pack or other builders.
- No new dependencies beyond JSZip (only if ZIP download is missing — will check first).

## Files touched (estimated)
~10 files: 4 edge functions, 4 React components/pages, 2 doc/markdown files, 1 memory file.