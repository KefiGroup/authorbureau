# BP-03 Reframed: ABBY Copy-Paste Content Factory

## What we're building (one line)
ABBY mines the book and produces a constant stream of platform-perfect, copy-paste-ready posts (LinkedIn, Facebook, Instagram single + 5-slide carousels) with custom graphics, dropped into the Social Calendar, auto-refilled when stock runs low.

---

## End-to-end workflow

```text
1. SOURCE       Manuscript + BP-00 analysis (themes, frameworks, quotes, audience)
                                │
2. PLAN         generate-bp03-social-media writes 30 posts using 6 archetypes
                (Quote · Lesson · Question · Story · Framework · Proof)
                ~70% single-image posts, ~30% Instagram carousel posts
                                │
3. CAPTIONS     generate-social-content writes 3 platform voices per post:
                • LinkedIn  ≤1300 ch, hook + insight + CTA + 3 tags
                • Facebook  400-800 ch, conversational + question
                • Instagram 150-220 ch + hashtag block + alt-text
                                │
4. HASHTAGS     5 anchor tags (locked from book themes) + 5 rotating tags
                drawn from a 30-tag pool. Same author = consistent identity,
                no spammy repetition.
                                │
5. GRAPHICS     compose-social-post (Nano Banana 2 -> burn-in template):
                Single posts:    LI 1200×627 · FB 1200×630 · IG 1080×1350 + 1080×1080
                Carousel posts:  5 slides × 1080×1350 (cover, 3 insight, CTA)
                Brand-kit aware (colors, font, author handle, book cover)
                                │
6. CALENDAR     Marketing Hub → Social Calendar grid. Each card has tabs:
                LinkedIn · Facebook · Instagram (Single | Carousel if applicable)
                [Copy caption] [Download image / Download all 5 slides]
                [Open LinkedIn ↗] [Open Facebook ↗] [Open Instagram ↗]
                  ↳ all three open the platform's compose home page,
                    NO pre-fill, consistent UX across platforms
                [Edit] [Regenerate] [Mark as posted]
                                │
7. AUTHOR LOOP  ~20 sec / post: pick tab → Copy → Download → Open app →
                paste + attach + post → Mark as posted
                                │
8. AUTO-REFILL  auto-refill-social-calendar (cron, daily check):
                when unposted < 7, generate next 14 posts, exclude last 30
                themes, notify author "+14 new posts ready"
                                │
9. LEARNING     Mark-as-posted feeds CRM scoring + biases next refill toward
                archetypes the author actually publishes
```

---

## Author-facing changes in BP-03 builder

- **Step 4 "Activate" → renamed "Send to Social Calendar"** with honest copy:
  > "30 ready-to-post packages now live in your Social Calendar. Each one has a LinkedIn, Facebook, and Instagram version with a custom graphic — Instagram includes 9 carousel sets too. Open the Calendar, copy, download, paste, post. ~20 seconds per post. ABBY will refill 14 more automatically when you drop below 7 unused posts."
- All "automated posting" / "auto-publish" wording removed from BP-03, ABBY chat, Marketing Hub, and `/docs/04-node-frameworks/BP-03.md`.

---

## Confirmed decisions (your answers)

| Question | Decision |
|---|---|
| Image cost (~$1-2 per refill) | ✅ OK |
| Instagram carousels | ✅ Yes — 5-slide carousels on ~30% of posts |
| Hashtag strategy | ✅ 5 anchor + 5 rotating from 30-tag pool |
| Open-app deep links | ✅ No pre-fill — open compose home page on all 3 platforms (consistent) |
| Auto-refill threshold | ✅ Trigger 14 new when <7 remain |

> Your last line was cut off ("i do not understa…"). I'm proceeding with the 5 decisions above. If there's something else you wanted to flag, tell me before approving.

---

## Out of scope
- True API auto-posting to LinkedIn / Meta (parked — revisit after we see real copy-paste usage)
- TikTok / X / Threads (single generic export only, no platform-tuning)
- Video posts
- Reusing the existing half-wired `social-publish` / `social-scheduler` / `social-connect-callback` code — these will be hidden from UI so nothing implies auto-post; code kept for a possible future sprint

---

## Technical appendix

**Schema** — `author_nodes.content_json` for BP-03:
```ts
posts: Array<{
  id: string
  archetype: 'quote'|'lesson'|'question'|'story'|'framework'|'proof'
  format: 'single' | 'carousel'           // carousel = IG only
  source_chapter?: string
  variants: {
    linkedin:  { caption; hashtags[]; image_url }
    facebook:  { caption; hashtags[]; image_url }
    instagram: {
      caption; hashtags[]; alt_text
      image_url_portrait; image_url_square
      carousel_slides?: string[]          // 5 urls when format='carousel'
    }
  }
  status: 'draft'|'ready'|'posted'
  posted_at?: string
  posted_platforms?: ('linkedin'|'facebook'|'instagram')[]
}>
hashtag_pool: { anchors: string[5]; rotating: string[30] }
```

**Edge functions**
- `generate-social-content` — add 3-voice generation + carousel scripts (5 slides w/ cover-insight×3-CTA)
- `compose-social-post` — render 4 single sizes + optional 5-slide carousel; brand-kit pull from `author_email_settings` + `author_profiles`
- `auto-refill-social-calendar` (NEW) — cron via `pg_cron` daily 13:00 UTC; threshold check + generation + notification
- `bp03-node-state` — count `status='posted'` for stats

**UI**
- `src/components/dashboard/builders/bp03/*` — Step 4 rename + copy
- `src/components/marketing-hub/SocialCalendarTab.tsx` — platform tabs, Single/Carousel sub-tab, Copy/Download/Open buttons (no pre-fill), Mark-as-posted, Regenerate
- `src/components/dashboard/SocialMediaManager.tsx` — replace list with card grid
- Hide `ConnectSettings` social section + `SocialAuthCallback` UI surfaces

**Docs**
- `docs/04-node-frameworks/BP-03.md`, README, `docs/03-abby-ai/03-node-activation-prompts.md` — full honesty rewrite

**Memory updates**
- Update `mem://features/buffer-social-scheduling-sprint36b` → mark deprecated, replace with new "ABBY Copy-Paste Social Factory" memory describing the workflow above.
