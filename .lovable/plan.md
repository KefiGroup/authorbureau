# Authors Bureau — Stratira-Beating Build Plan

Source: `Authors_Bureau_-_Platform_Build_Roadmap.pdf` + `Authors_Bureau_-_Master_Architecture_Reference.pdf` (Apr 2026).

**Promise:** Author uploads book → ABBY reads it, builds the entire business, runs it. Author only shows up to engage.

**Where we stand:** ~35% built. Content generation works. Revenue engine, CRM intelligence, and cross-node wiring do NOT. An author who completes every live node today earns $0.

---

## The 4 Critical Money Leaks (must fix BEFORE any new node)

These are the only things blocking the first dollar.

### Fix 1 — Wire CRM to opt-in form submissions
On quiz submit at `/[slug]/free-gift`:
- INSERT into `leads` (name, email, quiz_stage, abby_score = 10)
- INSERT one row per answer into `quiz_responses`
- Call `trigger-email-sequence` edge function with the BP-02 sequence id
- Redirect to `/[slug]/thank-you` with book CTA

### Fix 2 — Connect Resend so emails actually send
- `trigger-email-sequence` must call Resend API and write a row to `email_sends`
- Prompt author for Resend API key in Connect Settings if missing
- All future sequences fire automatically once connected

### Fix 3 — Auto-generate the funnel on BP-02 activate
On BP-02 Activate:
- INSERT into `funnels` (opt-in funnel record + thank-you page record)
- Thank-you page = book purchase CTA + upsell to BP-06 workbook
- Enrol the author into Resend list automatically
- "My Funnels" page must show this funnel immediately with live URL + conversion rate

### Fix 4 — Un-break Revenue Dashboard + Review & Publish
Both currently show forever-loading skeletons.
- **Revenue Dashboard:** total leads, leads this week (with trend arrow), revenue this month (sum of `purchases`), active nodes (count `author_nodes.status='live'`), email open rate, top funnel, "Hot leads today" (ABBY score > 60)
- **Review & Publish:** grid of activated nodes with public URLs + Copy-link button, "What's live" checklist, "What's missing" with one-click Activate, "Share my author page" button

---

## The 7 Native Engines (foundation everything else plugs into)

| # | Engine | Provider | Key tables |
|---|---|---|---|
| 1 | Email | Resend | `email_sequences`, `email_sequence_steps`, `email_sends`, `email_lists` |
| 2 | Funnel | Native | `funnels`, `funnel_submissions` |
| 3 | Course | Supabase S3 | `courses`, `course_modules`, `course_lessons`, `course_enrolments`, `course_progress` |
| 4 | Podcast | Native RSS + Podcastindex.org | `podcast_shows`, `podcast_episodes` |
| 5 | Sessions | Daily.co | `sessions`, `session_registrations` |
| 6 | Commerce | Stripe direct | `products`, `purchases`, `subscriptions` |
| 7 | CRM (intelligence) | Native | `leads`, `lead_activities`, `quiz_responses` |

**Removed for good:** GoHighLevel, Thinkific, Transistor, Zoom, Zapier, Buffer.

### ABBY Score (0–100) — drives the whole CRM
+10 quiz · +2 email open · +5 link click · +5 sales-page visit · +10 second visit · +15 session register · +20 attend · +30 purchase · −3 inactive 7d · −50 unsubscribe.

Pipeline auto-routing: New (0–15) → Engaged (16–35) → Warm (36–60) → Hot (61–80) → Customer (81–100) → VIP (100).

---

## Sprint Roadmap (delivery order, locked)

> Rule: do **not** start the next sprint until acceptance criteria of the current one pass.

### Sprint 37 — CRM + Email Engine + Funnel Engine ⚡ FOUNDATION
Implements the 4 critical fixes above. Acceptance: submit test quiz → lead appears in CRM with score 10, welcome email arrives in inbox in <60s, thank-you page loads, My Funnels shows the funnel.

### Sprint 38 — BP-03 Social Media (Stratira-level kit)
- 20 posts each show a **branded graphic card** (new `generate-social-graphic` edge fn — uses book cover colours + author name + book title + caption quote)
- LinkedIn / Instagram / Facebook / X tabs swap both graphic dimensions and caption
- Per-post: Copy caption · Download PNG · Edit inline · Mark as Posted toggle
- Posting schedule (today + 3 days per post)
- "Download full kit (.zip)" → 20 graphics + captions + CSV schedule + VA README
- Success screen: 5 thumbnails + 3 destinations (View Calendar / Edit Kit / Download ZIP)

### Sprint 39 — BP-04 Author Page + BP-05 Webinars + BP-06 Workbook 💰
- **BP-04:** photo + book cover + Get-the-book CTA + Get-my-free-quiz capture + socials + testimonials section. Fully editable.
- **BP-05:** rip out the wrong "book trailer script" content. Generate webinar title + 60-min outline (5 sections) + registration page at `/[slug]/webinar/[slug]` + 3-email confirmation/reminder sequence + 3-email post-webinar sequence. Daily.co room created when date set.
- **BP-06:** 20-page workbook PDF from chapters + Stripe product + sales page at `/[slug]/workbook` + S3 PDF delivery email after purchase.

### Sprint 40 — Revenue Dashboard + Review & Publish + ABBY Daily Report 📊
Implements Fix 4 fully + adds the **ABBY Daily Intelligence Report** sent at 8am local: new leads yesterday, hot lead count, revenue yesterday, best-performing node, one specific recommended action.

### Sprint 41 — BA-10 Online Course + BA-12 Membership Site 🔁
- **BA-10:** 6–8 modules (one per chapter), 3–5 lessons each, video upload, course portal at `/[slug]/course/[slug]` with player + progress + certificate. Stripe one-time product.
- **BA-12:** membership concept + recurring Stripe subscription + member portal at `/[slug]/members` + monthly newsletter via Email Engine.

### Sprint 42 — BA-14 Podcast + BA-11 Audiobook + BA-15 Media & PR
- **BA-14:** show meta + cover-art prompt + first 5 episode outlines + native RSS at `/[slug]/podcast/feed.xml` + step-by-step Apple/Spotify submission guide.
- **BA-11:** narration script + ElevenLabs TTS chapter-by-chapter + ACX submission guide.
- **BA-15:** media kit PDF + 5 podcast pitch templates + 3 press release templates + 3-email follow-up sequence + new "Media Contacts" CRM stage.

### Sprint 43 — YR-19 1-on-1 Coaching + YR-20 Big-Ticket Offers
- **YR-19:** Sessions Engine booking calendar + Stripe checkout + Daily.co room + 24h/1h reminders.
- **YR-20:** application funnel (not direct checkout) + manual approval + invoice via Commerce Engine.

### Sprint 44 — YR-22 Corporate Training + YR-23 Mastermind + YR-24 Retreats
Same engine pattern: Sessions + Commerce + Funnel + Email.

### Sprint 45 — YR-25 Certification + YR-26 Conferences + YR-27 Fundraising + YR-28 Sponsors
Closes out the 28-node map.

---

## The Author Experience Standard (gate before "complete" on every node)

1. **No dead ends** — every screen has ≥2 next actions
2. **No empty states without guidance** — explain why + give the action ("You have no leads yet. Share your free quiz link: [Copy]")
3. **ABBY always visible** — avatar + contextual tip on every builder
4. **Mobile-first** — Calendar, CRM, Revenue Dashboard must all work on phone
5. **One-click for the important action** — copy / download / share / mark posted
6. **Progress is always visible** — 28-node map showing live / in-progress / locked

---

## What I'm proposing to start with (this turn, after approval)

**Sprint 37 in two passes**, because it unlocks every dollar:

**Pass 1 — the wiring (no UI churn):**
1. Migration: ensure `funnels`, `funnel_submissions`, `email_sends`, `email_lists`, `lead_activities` exist with correct columns + RLS (most are already there from Sprint 34/35 — audit + add what's missing).
2. Edge fn `submit-quiz-response` (or extend existing): write `leads` + `quiz_responses` + call `trigger-email-sequence` + return thank-you redirect URL.
3. Edge fn `trigger-email-sequence`: confirm it calls Resend with the author's saved API key, log to `email_sends`. If no key → return a structured error the UI can surface as "Connect Resend" CTA.
4. Edge fn `bp02-activate-funnel`: on BP-02 Activate, INSERT a `funnels` row (opt-in + thank-you variant) and seed the BP-02 follow-up sequence.

**Pass 2 — the visible surfaces:**
5. Public `/[slug]/thank-you` page with book CTA + webinar CTA when BP-05 live.
6. **My Funnels** page: replace "No funnels yet" with the auto-generated funnel card (live URL, visits, submissions, conversion %, View button).
7. **Revenue Dashboard**: kill the loading skeleton, render the 6 metric cards + Hot Leads list from real queries.
8. **Review & Publish**: kill the loading skeleton, render the activated-nodes grid + "What's missing" checklist + "Share my author page" copy button.
9. Connect Settings: add a "Resend API key" field with a green "Connected" badge that updates after save.

**Acceptance test (mandatory before declaring Sprint 37 done):**
- Test author submits the quiz → lead in CRM (score = 10) within 5s
- Welcome email lands in test inbox within 60s
- `/[slug]/thank-you` renders with book CTA
- My Funnels shows the new opt-in funnel
- Revenue Dashboard + Review & Publish both render (no skeleton)

Once Sprint 37 passes, we move to Sprint 38 (BP-03 graphics kit). I will NOT touch any BA or YR node until 37 → 40 are green.

---

## What I am explicitly NOT doing

- Not touching the defunct Manus `authors-bureau-v2` project
- Not adding Buffer, GHL, Mailchimp, Calendly, Zoom, or Thinkific code paths back
- Not building BA-10 → YR-28 ahead of the foundation sprints
- Not changing the design system / branding (Sprint 12 freeze stays)

Reply **"Approve Sprint 37 Pass 1"** to start with the wiring, or tell me to scope differently (e.g. "do Fix 4 only first" or "audit current state before building").
