

## Consolidated Plan: Lead Magnet System Upgrade

Three changes across four files. No database migrations needed (all new data lives in the existing `content_json` JSONB column and `cross_builder_pushes` table).

---

### 1. Rewrite Abby's AI Prompt for Structured, Interactive Lead Magnets

**File: `supabase/functions/generate-bp02-lead-magnets/index.ts`**

Replace the current `userPrompt` JSON schema with a richer structure that outputs:

**Per lead magnet** (3 items, each a different type):
- `number`, `type`, `title`, `description`, `why_it_works`, `pages_or_length` (existing)
- **NEW** `best_channel` — single best marketing platform (e.g., "LinkedIn Posts", "Instagram Reels", "Email Newsletter", "Facebook Groups", "TikTok", "Pinterest", "Blog/SEO")
- **NEW** `channel_reason` — one sentence explaining why this channel suits this lead magnet + audience

**For quiz-type lead magnets**, the AI must output structured interactive JSON instead of prose:
- `questions[]` — each with `text`, `options[]` (label + points), scored automatically
- `scoring_tiers[]` — min/max ranges mapped to result labels, descriptions, and 3 product recommendations
- Quiz results gated behind a contact form (no manual score addition)

**All lead magnets** must include a `contact_gate`:
- Fields: `first_name`, `email`, `phone`
- For quizzes: gate appears after completion, before results
- For PDFs/checklists: gate appears before download

**NEW top-level `marketing_strategy` object:**
```json
"marketing_strategy": {
  "primary_platform": "Best overall platform for this author",
  "primary_reason": "Why",
  "secondary_platform": "Complementary platform",
  "secondary_reason": "Why",
  "promotion_tips": ["Tip 1", "Tip 2", "Tip 3"]
}
```

**NEW `social_media_posts` array** (4 posts, one per platform):
```json
"social_media_posts": [
  { "platform": "instagram", "caption": "...", "hashtags": [...], "cta": "Take the free quiz →" }
]
```

**NEW `quiz_insights_for_social`** — 3 standalone insights derived from quiz content, suitable for social posts.

Also increase `max_tokens` from 4000 to 6000 to accommodate the larger output.

Enforce existing generation constraints: simple 2-3 minute assessment, no action items, acknowledge reader is stuck, 3 product recommendations per tier, forbidden phrases list.

---

### 2. Register Lead Magnet as a Cross-Builder Source

**File: `src/lib/cross-builder-registry.ts`**

Add a new `"lead-magnet"` entry to `CROSS_BUILDER_REGISTRY`:

```typescript
"lead-magnet": [
  { destinationBuilder: "social-media", pushType: "quiz-promo-posts", label: "Quiz Promotion Posts", description: "Posts promoting the quiz/lead magnet with teaser questions and CTA" },
  { destinationBuilder: "social-media", pushType: "quiz-insight-posts", label: "Quiz Insight Posts", description: "Standalone posts sharing insights from quiz content" },
  { destinationBuilder: "email-marketing", pushType: "lead-nurture", label: "Lead Nurture Sequence", description: "Post-quiz email nurture based on results", destinationTable: "email_flows" },
  { destinationBuilder: "website", pushType: "quiz-page", label: "Quiz Landing Page", description: "Embeddable quiz page on author microsite" },
],
```

---

### 3. Wire Cross-Builder Push After Generation

**File: `src/components/dashboard/builders/shared/SharedContentStep.tsx`** (or the handler that processes the generation response)

After the AI returns successfully and content is saved, call `executeCrossBuilderPushes` with:
- `sourceBuilder: "lead-magnet"`
- Map `social_media_posts` → `quiz-promo-posts` output
- Map `quiz_insights_for_social` → `quiz-insight-posts` output

This makes the social media content appear as "Pending Pushes" in the Social Media builder automatically.

---

### 4. Extend GHL Deployment for Full Lead Capture

**File: `supabase/functions/deploy-bp02-to-ghl/index.ts`**

After creating the funnel and pages (existing logic), add:

- **Create GHL Custom Fields** via `POST /locations/{locationId}/customFields`:
  - `lead_magnet_source` (text)
  - `quiz_score` (number)
  - `result_tier` (text)

- **Create GHL Workflow** via `POST /workflows`:
  - Trigger: form submission
  - Actions: create contact (name, email, phone), tag by lead magnet title, add to pipeline, send delivery email

All GHL calls remain non-blocking (existing error handling pattern preserved).

---

### Summary of Files

| File | Change |
|------|--------|
| `supabase/functions/generate-bp02-lead-magnets/index.ts` | Rewrite prompt: structured quiz, contact gate, marketing recommendations, social content |
| `src/lib/cross-builder-registry.ts` | Add `"lead-magnet"` source with 4 push destinations |
| `src/components/dashboard/builders/shared/SharedContentStep.tsx` | Call `executeCrossBuilderPushes` after generation |
| `supabase/functions/deploy-bp02-to-ghl/index.ts` | Add GHL custom fields + workflow creation |

