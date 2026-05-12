## BP-03 Bug Fixes — Pure Copy-Paste Library

### Root cause
After the previous pivot, the generator stamps the canonical archetype + carousel days into `content_json.posts`, but **(a)** existing/legacy days where the AI returned `post_type: "Insight"` slip through `flattenPosts` because we only kept the AI value if it matched the archetype set, and **(b)** carousels only appear when the AI complied with `format: "carousel"` + 5 slides — there's no fallback. Per-card download is also gated on `post.graphic_url` existing, so cards without graphics show no button at all.

### Fixes

**BUG-1 — Deterministic archetype assignment**
File: `supabase/functions/bp03-node-state/index.ts`
- In `flattenPosts`, replace the `ARCHETYPES.has(d?.post_type)` check with a deterministic `archetypeForDay(day)` rotation matching the generator (Quote, Lesson, Question, Story, Framework, Proof). This guarantees the 6-archetype label distribution is preserved even on legacy/repaired data — never falls back to "Insight".
- Persist this archetype to both `social_posts.archetype` and `social_posts.post_type`.

**BUG-2 — Per-card "Download graphic" / "Generate graphic" button**
File: `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
- In the **Unscheduled posts** card row (~line 949-953), always render a graphic button:
  - If `post.graphic_url` exists → "Download graphic" (existing behavior via `downloadGraphic(post)`).
  - If not → "Generate graphic" button that calls a new lightweight handler `generateOneGraphic(post)` which invokes a single-post pass of `bp03-generate-all-graphics` (using the existing edge fn with a `post_id` filter, see below) and then refreshes.
- Add the same per-card button in the expanded-day post list for parity (~line 1047).

File: `supabase/functions/bp03-generate-all-graphics/index.ts`
- Accept an optional `post_id` in the request body; when present, restrict the loop to that single post and skip the "already has one" gate. Keeps the bulk path unchanged.

**BUG-3 — Carousel fallback synthesis**
File: `supabase/functions/bp03-node-state/index.ts` (`flattenPosts`)
- If `platform === "instagram"` AND `day ∈ {3,6,9,12,15,18}` AND the IG record is missing valid carousel_slides, synthesize 5 slides from the caption (cover hook + 3 insight lines split from caption + CTA line). Mark `isCarousel = true` so the caption gets the "— Carousel script (5 slides) —" appendage and `carousel_slides` is populated. This guarantees 6 IG carousels regardless of AI compliance.

File: `supabase/functions/generate-bp03-social-media/index.ts`
- Add the same synthesis as a post-AI safety net for `instagram_posts[i]` when the day is a carousel day and the AI returned `format: "single"` or fewer than 5 slides — so freshly-generated kits also always have 6 carousels stored in `content_json`.

### Out of scope
- No DB migration. `social_posts.archetype` already accepts the 6 canonical values.
- No changes to ZIP export, calendar grid, or scheduling flow.
- No changes to BP-02, MarketingHub, or other builders.

### Verification
1. Click "Generate 20 more posts" on Social Calendar → archetypes rotate Quote/Lesson/Question/Story/Framework/Proof across 20 days; 0 cards labelled "Insight".
2. Each unscheduled card shows either "Download graphic" or "Generate graphic"; clicking "Generate graphic" produces a graphic and the button flips to "Download graphic".
3. Days 3, 6, 9, 12, 15, 18 (Instagram only) render the `<CarouselPreview>` with 5 slides and a Download Carousel ZIP control.
