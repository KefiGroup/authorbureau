

# BP-03 Social Media — Native Workflow Redesign (No Buffer)

## Goal
Replace the Buffer-dependent flow with a complete, author-owned **Social Media Kit**: branded graphics for every post, real calendar grid, manual "Mark as Posted" workflow, and clear navigation back to the kit from anywhere.

---

## 1. Remove Buffer (full sweep)

**Delete edge functions:** `get-buffer-channels`, `diagnose-buffer`, `schedule-social-posts`.
**Delete frontend Buffer logic:** all `buffer_api_key`, `buffer_post_id`, `BUFFER_*` references in BP03Builder, social-media steps, Marketing Hub, Connect Settings.
**Replace copy:** "scheduled to Buffer" → "saved to your kit"; "Schedule posts now" button removed.
**Connect Settings:** remove Buffer card; keep social platform connections (LinkedIn/IG/FB/X) as informational badges only (used for "Mark as Posted" deep links, not API posting).

## 2. Database changes (one migration)

`social_posts` table additions:
- `graphic_url TEXT` — cached generated graphic per post
- `post_index INT` — 0-19 ordering
- `post_type TEXT` — insight | story | cta | promo
- `posted_at TIMESTAMPTZ` — set when "Mark as Posted" clicked
- `status` enum widened to `draft | ready | posted` (default `draft`)
- Drop `buffer_post_id` column (or leave nullable, deprecated)

Set status='ready' on Activate. Default `scheduled_at` = today+3d, then every 3 days.

## 3. Review Step (Step 3) — Visual Post Cards

Replace the accordion with a **2-col grid (1-col mobile)** of post cards. Each card:
- **Top 60%**: branded graphic (dark navy `#1a2744` + gold `#d4a843`, author name, book title, hook headline, AB watermark, platform icon). Generated via existing `generate-social-graphic` edge fn, cached to `graphic_url`. CSS fallback if generation fails.
- **Platform tabs** above graphic (LinkedIn/IG/FB/X) — switch graphic + caption together
- **Bottom 40%**: caption text, hashtag chips, char count (green/amber/red vs platform limits), scheduled date
- **4 actions**: Copy caption · Download PNG (platform-correct dims) · Edit (inline textarea) · Regenerate (single post)

Above grid:
- **Kit Summary bar** — "20 posts · 4 platforms · 4 weeks · [BOOK] · [AUTHOR]"
- **Platform Connection Status bar** — 4 badges (✓ connected / Connect →)
- **Filter bar** — by platform, by post type
- Week dividers preserved

Below grid:
- **Posting Schedule section** — start-date picker + frequency selector (Daily / 2d / 3d / Weekly), recalculates all 20 dates on change

## 4. Social Calendar — Real Grid View

**In Review step "Social Calendar" tab** AND **Marketing Hub → Social Calendar tab** (shared component):
- Mon–Sun month grid with mini post cards on assigned days (platform icon, 40-char headline, status badge)
- Click day → right-side panel with all posts for that day, full captions, copy/download
- "Assign dates" CTA when posts unscheduled
- Platform legend, week/month toggle
- **Progress tracker header**: "5 of 20 published · 15 remaining · Next: Thu 24 Apr"
- Marketing Hub empty-state replaced: if no BP-03 → prompt card; if BP-03 saved → 20 posts shown
- Unscheduled posts in section below grid

Each calendar post card has:
- **"Mark as Posted"** button → status=`posted`, sets `posted_at`
- **"Copy & Post"** dropdown → copies caption + opens platform composer URL (LinkedIn/FB/X with prefilled text where supported; IG = mobile note)

## 5. Success Screen (Step 4) Redesign

**Conditional headline** by state:
- No accounts connected → "Your Social Media Kit is Saved ✓"
- Accounts connected, none posted → "Ready to Post 🚀"
- Some posts marked posted → "Your Social Media is Live! 🎉"

**Persistent breadcrumb banner**: "📍 Your kit lives in Marketing Hub → Social Calendar."

**Content preview strip**: horizontal scroll of 5 mini graphic thumbnails + "...and 15 more →" link to Step 3.

**3 destination cards**:
1. 📅 **View Social Calendar** → `/dashboard?section=marketing-hub&tab=social-calendar`
2. ✏️ **Edit My Kit** → back to Step 3
3. 📥 **Download Marketing Kit** → ZIP

**Connection prompt** (only if no accounts connected) — informational, non-blocking.

**Bottom**: Primary "View Social Calendar →", Secondary "Back to Brand Products", Tertiary "← Edit my posts".

## 6. Marketing Hub Overview Row

Replace generic "90-day content calendar" copy with: "20 posts · LinkedIn, IG, FB, X · [STATUS]" + 3 inline graphic thumbnails. Single CTA "View & Post →" → Social Calendar tab. Remove "Activate Campaign".

## 7. ZIP Export

Already partly exists; ensure ZIP contains:
- 1 PNG per post (1080×1080 universal)
- 1 .txt per post with all-platform captions
- 1 combined `posts.csv` (date, platform, caption, hashtags)
- `README.txt` with posting instructions

---

## File Map

**New/edited frontend:**
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — strip Buffer; new state machine
- `src/components/dashboard/builders/social-media/PostCard.tsx` (new) — visual card
- `src/components/dashboard/builders/social-media/SocialCalendarGrid.tsx` (new) — shared grid
- `src/components/dashboard/builders/social-media/PostingScheduleEditor.tsx` (new)
- `src/components/dashboard/builders/social-media/KitZipExporter.ts` (new)
- `src/components/dashboard/builders/social-media/SocialMediaPublishStep.tsx` — full success-screen rewrite
- `src/components/dashboard/builders/social-media/ContentGenerationStep.tsx` — trigger graphic gen + cache
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — use shared grid, add progress tracker
- `src/components/dashboard/marketing-hub/MarketingHubOverview.tsx` (or row component) — new BP-03 row
- `src/pages/AccountSettings.tsx` (Connect Settings) — remove Buffer card

**Edge functions:**
- Delete: `get-buffer-channels`, `diagnose-buffer`, `schedule-social-posts`
- Reuse: `generate-social-graphic` (already exists) for per-post graphics
- New tiny fn: `generate-social-graphic-batch` (optional — or call existing one in parallel from client)

**Migration:** add columns + drop buffer cols on `social_posts`; update default status enum.

---

## Out of Scope
- Real auto-posting to LinkedIn/IG/FB/X APIs (manual workflow only)
- Analytics on actual post performance (only "marked posted" count)
- Bulk regenerate-all (per-post only)

---

## Open Question
Sprint says use `generateImage` for branded cards. Generating 20 images on first Review-step open will take ~30–60s and cost tokens. Two options:

**A. Generate on-demand, lazy**: only generate the visible card's graphic when scrolled into view; cheaper, faster initial load.
**B. Generate all 20 upfront in background**: better UX once loaded, but slower first paint and higher cost.

I'll default to **A (lazy)** with a "Generate all graphics" button to bulk-fill when the author wants the ZIP — unless you want B.

