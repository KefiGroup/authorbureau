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
| Social media kit | ✅ Graphics + captions + calendar + ZIP download + Mark-as-Posted | None |
| Email marketing | ✅ Sequences via Resend, suppression, flows, open/click → ABBY scoring | None |
| Lead capture | ✅ Quiz + thank-you + CRM + BP-01 nurture autowire | None |
| Sales funnel | ✅ Auto-generated + live Stripe checkout | None |
| CRM | ✅ Pipeline + tagging + Hot Leads + Daily Intelligence digest (email + dashboard card) | None |
| Payment processing | ✅ Stripe Connect Express, auto-product per node | None |
| Revenue dashboard | ✅ Real-time gross/fee/net + hot-leads deep-link | None |
| Coaching/sessions | ❌ | Daily.co room + booking calendar + payment |
| Course platform | ⚠️ Generation done | Build `/courses/:slug/learn` portal + enrollments |
| Podcast hosting | ⚠️ MP3 pipeline reused | Add RSS feed for Spotify/Apple |
| Membership site | ⚠️ Stripe + portal exist | Build `/members/:slug` gated route |
| Daily AI insights | ✅ `abby-daily-report-dispatcher` + `abby-daily-crm-digest` | None |
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

---

## Sprint 57 — Lead-magnet → BP-01 nurture autowire (DONE)

- `enroll-subscriber`: BP-01 flows are now matched globally (parity with `master_nurture`) in addition to node-specific match. De-duped by `flow.id`.
- `submit-funnel`: quiz finishers seed `crm_contacts.abby_score=5` (was 2); raw opt-ins remain at 2. After enrollment, a `lead_activities` row with `activity_type='nurture_autowired'` is logged with `{enrollments}` metadata so authors see the autowire on the contact timeline.
- Revenue Dashboard "Hot Leads Today" card rows are now clickable and deep-link via `onNavigate('author-crm?contactId=<id>')`. Dashboard `handleNavigate` now supports `section?key=val` shorthand. `AuthorCRMPage` already consumed `?contactId=` (Sprint 36b), so the panel opens automatically.

### Capability table delta
| Capability | Before | After |
|---|---|---|
| Lead capture | ⚠️ Quiz + thank-you + CRM | ✅ Auto-enrolls in BP-01 nurture + node-specific flow + master_nurture; timeline event logged |
| CRM | ⚠️ Pipeline + tagging | ⚠️ Hot-Leads on Revenue Dashboard now deep-links to contact panel; daily intelligence push remains |

### Next sprints (in order)
1. Mark-as-Posted + ZIP social pack + ABBY email scoring
2. Member portal + course-learn portal + podcast RSS
3. Daily.co coaching booking
4. Per-node ZIP/MP3 export rail
