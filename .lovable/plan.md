## BP-03 Spec Reconciliation — 5 Bugs

Goal: bring the BP-03 social kit up to the 30-post / carousel / mark-as-posted / persistent-connections spec, and confirm platform voice differentiation.

### Bug 1 — Only 20 posts (need 30 across 6 archetypes)

**Cause:** `generate-bp03-social-media` produces 5 posts per platform × 4 platforms = 20 rows, indexed by day. There is no notion of 6 archetypes, no post-type variation.

**Fix:**
1. Rewrite the generation prompt so each AI step produces **30 posts per platform** organised into 6 archetypes × 5 posts each:
   - Quote Card, Stat / Insight, Story / Anecdote, Question / Engagement, Behind-the-Scenes, Direct CTA.
2. Each post gets a `post_type` field matching one of the 6 archetypes, used for filtering + graphic template selection.
3. Bump `max_completion_tokens` (LinkedIn ~12k, IG+FB ~16k, X+outreach ~10k).
4. Regenerate creates exactly 30 unified post objects (LinkedIn + IG + FB + X all populated per day).

### Bug 2 — No carousel posts

**Cause:** carousel logic exists in the prompt (positions 2 & 4) but only across 5 IG posts → 2 carousels. With 30 IG posts the spec wants ~30% (≈9 carousels), and there is no UI to render `carousel_slides`.

**Fix:**
1. Update IG prompt to mark exactly **9 of the 30 IG posts** (every 3rd or 4th) as `format: "carousel"` with 5-slide arrays.
2. Pass `carousel_slides` through to Marketing Hub `SocialCalendarTab`.
3. Add a small `CarouselPreview` component that shows the 5 slides as a horizontal swiper inside the post card, plus a "Download all 5 slides" button (calls `bp03-generate-all-graphics` with a `slide_index` param so each slide gets its own PNG).

### Bug 3 — "Mark as posted" missing on cards

**Cause:** `markAsPosted` already exists in `SocialCalendarTab.tsx` (line 427) and the button is rendered (line 1036), but only inside a specific status branch. Need to verify it is shown for the default `scheduled` state on every card and is not hidden behind the connection gate.

**Fix:**
1. Audit the conditional around line 1036 — render the **Mark as posted** button on every card whose status is `scheduled` (regardless of platform connection state, since the workflow is copy-paste).
2. Add the same button to BP-03 Builder's preview list so the user can mark posts directly in the builder before sending to calendar.
3. On click → set `status='posted'`, `posted_at=now()`, and trigger `auto-refill-social-calendar` if unposted queue < 7.

### Bug 4 — LinkedIn / Facebook show as unconnected despite DB rows

**Findings (verified against DB):**
- `social_connections` for the test user has rows: `facebook=connected (today)`, `linkedin=active`, `instagram=active`, `youtube=active`.
- `useSocialConnectionStatus` and `ConnectSettings.tsx` both query `user_id = user.id` and filter `status in ('connected','active')` — so the data **is** there.
- Most likely cause: page is reading before `useAuth().user` resolves, or the multiple duplicate rows + a row with `status != connected/active` is overriding render logic per-platform.

**Fix:**
1. Group `social_connections` by platform on the client and pick the most recent active row per platform (de-duplicate the 4 facebook rows etc.).
2. Add `useAuthReady` gate before querying so we don't render "Not connected" during the auth race.
3. After OAuth callback, force a `refresh()` of `useSocialConnectionStatus` (the `focus` listener already fires, but the popup-callback path may not blur the parent — emit a `BroadcastChannel('social-connect')` message from the callback page and have the hook listen).
4. One-time DB cleanup migration: collapse duplicate `(user_id, platform)` rows, keeping the newest, and add a unique index on `(user_id, platform)`.

### Bug 5 — Confirm platform voice differentiation

**Findings:** `generate-bp03-social-media` makes **3 separate AI calls** with platform-specific instructions (LinkedIn 150–200 word thought leadership, IG 80–120 word visual-first, FB 100–150 word story w/ question, X 40–60 word punchy). Captions are stored independently per platform per day, and `PostEditorSheet` renders each platform tab from its own field. Data layer is correct.

**Action:** no code change — add a smoke test that, after regen, asserts `posts[0].linkedin.caption !== posts[0].facebook.caption !== posts[0].instagram.caption` and surface a one-line "Voice check passed" badge in the builder summary so the user can visually confirm.

---

### Files touched
- `supabase/functions/generate-bp03-social-media/index.ts` — 30-post / 6-archetype / 9-carousel prompts + token bumps.
- `supabase/functions/bp03-generate-all-graphics/index.ts` — accept `slide_index` for carousel slides.
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — always-visible Mark-as-posted button, carousel preview, archetype filter.
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — render carousel slides + mark-as-posted, voice-check badge, copy update ("30 posts" everywhere it currently says "20").
- `src/components/dashboard/builders/bp03/CarouselPreview.tsx` — new.
- `src/hooks/useSocialConnectionStatus.ts` — de-dupe by platform, BroadcastChannel listener, useAuthReady gate.
- `src/pages/ConnectSettings.tsx` — same de-dupe.
- `src/pages/SocialAuthCallback.tsx` — postMessage / BroadcastChannel on success.
- New migration — unique `(user_id, platform)` index + collapse duplicates.

### Out of scope
Buffer integration, X OAuth, automated publishing — this stays a copy-paste workflow per Sprint 61.
