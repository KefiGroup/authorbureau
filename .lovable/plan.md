

## Sprint 38 Phase 3 — BP-03 Social Media Kit

### Goal
Add per-platform branded graphic cards (rendered in-browser), slide-over caption editor + regenerate, full-kit ZIP (80 PNGs + CSV + README), and reword success screen to "Your Social Media Kit is Ready."

### Approach
All graphics generated client-side via HTML5 Canvas (no edge function, no AI image gen) — fast, free, deterministic, fits the "VA handoff" use case. Each card is a coloured background derived from book cover, author photo/initials top-left, author name, then the pull quote (first sentence of the platform caption), with platform-correct dimensions.

### Files to Create

1. **`src/components/dashboard/builders/bp03/socialGraphic.ts`**
   - `PLATFORM_DIMENSIONS = { instagram: {w:1080,h:1080}, linkedin: {w:1200,h:628}, facebook: {w:1200,h:628}, twitter: {w:1600,h:900} }`
   - `extractPullQuote(caption: string): string` — first sentence, max ~140 chars
   - `getInitials(name: string): string`
   - `loadImage(url): Promise<HTMLImageElement>` (handles CORS + fallback)
   - `renderSocialGraphic({ platform, authorName, authorPhotoUrl, bookColor, pullQuote }): Promise<Blob>` — draws on offscreen canvas, returns PNG Blob
   - Color palette: brand teal default; if `bookColor` (hex) provided, use it as background gradient with white text.

2. **`src/components/dashboard/builders/bp03/SocialGraphicCard.tsx`**
   - Renders a single platform graphic via `<canvas>` ref, calls `renderSocialGraphic` on mount/prop change, shows preview at responsive scale matching platform aspect ratio.
   - Click handler → opens slide-over.

3. **`src/components/dashboard/builders/bp03/PostEditorSheet.tsx`**
   - Uses `@/components/ui/sheet` (right-side slide-over).
   - Shows large graphic preview + editable `<Textarea>` for caption + hashtags input.
   - "Regenerate Graphic" button (re-renders with current edited pull quote).
   - "Save" button → calls `onSave(updatedPost)` which patches `content.posts[i][platform]` in parent state and persists via existing `persistNodeState("content_ready")`.

### Files to Edit

4. **`src/components/dashboard/builders/bp03/BP03Builder.tsx`**
   - **PostCard rewrite** (line 749): Replace text-only expanding card with a 4-tab platform switcher rendering `SocialGraphicCard` per platform. Click opens `PostEditorSheet`.
   - **Pass props** down: `authorPhotoUrl`, `bookColor`, `bookCoverUrl` from author_profiles + books query (extend resume `useEffect` to fetch `author_profiles.photo_url` and `books.cover_url`/`brand_color`).
   - **Wire onSavePost**: handler that mutates `content.posts` and calls existing save.
   - **`downloadKitZip` rewrite** (line 576): Generate all 80 PNGs (4 platforms × 20 posts) into `social_media/<platform>/day_NN.png`, plus `captions.csv` (day, platform, caption, hashtags, image_filename) and a friendly `README.md` written for a VA ("Open the folder for your platform → grab the PNG → paste the caption from captions.csv → publish on the day specified"). Outreach kit folder retained.
   - **SuccessScreen** (line 838): Always show **"Your Social Media Kit is Ready"** — remove "is Live" / "is Saved" variants and any "auto-publish" wording. Update copy to reflect manual posting.
   - Remove the auto-publish/connection wording on the connected-accounts banner (lines 468-499) — change to neutral "Connected accounts saved for reference. You'll post manually."

5. **`src/components/dashboard/builders/bp03/BP03Builder.tsx` — connectedPlatforms banner**
   - Reword to remove "auto-publish" claim per acceptance criteria.

### Data Sources for Graphic
- **authorPhotoUrl**: `author_profiles.photo_url` (existing column per author-photos bucket)
- **bookColor**: derive from `books.brand_color` if exists, else default to `#0d9488` (brand teal). Add fallback via simple hash of book title for variety.
- **authorName**: existing `authorName` state
- **pullQuote**: `extractPullQuote(post[platform].caption)`

### Acceptance Mapping
| Requirement | Implementation |
|---|---|
| Platform tab switches dimensions | `SocialGraphicCard` re-renders with platform-specific canvas size + aspect-ratio CSS |
| Card shows name + pull quote + book colour | `renderSocialGraphic` |
| Slide-over edit + regenerate | `PostEditorSheet` |
| ZIP with PNGs + CSV + README | rewritten `downloadKitZip` |
| Success says "Your Social Media Kit is Ready" | `SuccessScreen` headline literal |
| No console errors | image CORS handled with try/catch + initials fallback |

### Out of Scope
- No edge function changes, no DB migration, no schema changes.
- No AI image generation (graphics are deterministic canvas renders).
- Phase 1 & 2 functionality (generation, calendar persistence) untouched.

### QA — 8-level audit after build
1. TS compiles cleanly. 2. Builder loads at `/node-builder/BP-03` with no console errors. 3. Generate flow still works. 4. Each post card shows 4 platform tabs with correct aspect ratios. 5. Slide-over opens, caption edits persist, regenerate updates graphic. 6. ZIP downloads, contains 80 PNGs in 4 platform subfolders + captions.csv + README.md. 7. Success screen reads "Your Social Media Kit is Ready". 8. Existing Activate → Social Calendar flow still creates `social_posts` rows.

