# Audit 3 — Must-Have Capabilities (Part A complete)

## ✅ Done in this session
- **Empty library root cause fixed.** `generate-asset-pack` now validates the AI response, retries with `openai/gpt-5-mini` when Gemini Flash returns an incomplete JSON, and writes `status='failed'` instead of empty stubs.
- **Library UI honesty.** `MarketingPackCard` now shows `X/4 ready` (real content count, not row count), hides empty sections, and surfaces a "generation failed — Regenerate" inline state.
- **Verified with BP-09.** Regenerated pack now has 6,465 char sales copy, 3 social posts, 2,042 char email, 3,019 char bonus.
- **Backfill started** for 19 remaining empty packs across BP-02/03/04/05/06/07/08, BA-11/12/15/16/17, YR-21/22/23/26/27.

## Capability table (current state)

| Capability | Status | Gap |
|---|---|---|
| AI content generation | ✅ Documents + microsites + Stripe wiring (28 nodes) | None |
| Social media kit | ⚠️ Graphics + captions + calendar | Add ZIP download + "Mark as Posted" |
| Email marketing | ⚠️ Sequences via Resend, suppression, flows | Add open/click → ABBY score bumps |
| Lead capture | ⚠️ Quiz + thank-you + CRM | Auto-trigger BP-01 nurture sequence on quiz submit |
| Sales funnel | ✅ Auto-generated + live Stripe checkout | None |
| CRM | ⚠️ Pipeline + tagging | Hot-leads widget + daily intelligence push |
| Payment processing | ✅ Stripe Connect Express, auto-product per node | None |
| Revenue dashboard | ✅ Real-time gross/fee/net | Add hot-leads + 7d new-lead widgets |
| Coaching/sessions | ❌ | Daily.co room + booking calendar + payment |
| Course platform | ⚠️ Generation done | Build `/courses/:slug/learn` portal + enrollments |
| Podcast hosting | ⚠️ MP3 pipeline reused | Add RSS feed for Spotify/Apple |
| Membership site | ⚠️ Stripe + portal exist | Build `/members/:slug` gated route |
| Daily AI insights | ✅ `abby-daily-report-dispatcher` | Confirm cron + settings UI |
| Export portability | ⚠️ TXT/DOCX/PDF | Add per-node ZIP + MP3 export |

## Next sprints (in order)
1. Mark-as-Posted + ZIP social pack + ABBY email scoring
2. Lead-magnet → nurture autowire + hot-lead CRM widget
3. Member portal + course-learn portal + podcast RSS
4. Daily.co coaching booking
5. Per-node ZIP/MP3 export rail

## Files touched
- `supabase/functions/generate-asset-pack/index.ts` — validation + retry + failed-status path
- `src/components/library/MarketingPackCard.tsx` — `readyCount`, hide empty buckets, failure state
- `.lovable/audit-3-must-have.md` (this file)
