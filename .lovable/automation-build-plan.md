# AuthorsBureau.com — 4-Step Monetization Automation Build Plan v2.0

## Core Principle
One book manuscript generates all 27 revenue assets through AI agents. The shared CRM connects every customer touchpoint across all four steps. An author finishes writing a book and, within days, AuthorsBureau has automatically generated their online course, workbook, audiobook script, webinar presentation, coaching packages, speaking topics with slide decks, seminar curriculum, and certification program — all ready with a single click.

## The 4-Step Framework: 27 Revenue Nodes

### Center
- Published Book (Existing)
- Podcast (AI generates scripts from chapters)

### Step 1: Digital Products (10 Nodes)
1. **Online Courses** — AI generates 8-12 module course from manuscript → populates `courses`, `course_modules`, `course_lessons`
2. **Home Study Courses** — AI generates self-paced study guide with workbook
3. **Webinars** — AI generates scripts + slide decks
4. **Audiobook** — AI generates audiobook script; TTS or author records
5. **Workbook** — Companion workbook PDF from book (40-80 pages)
6. **Affiliates** — Affiliate program with tracking links + commission
7. **Website** — Author microsite (existing)
8. **Monthly Memberships** — Membership tier system with gated content (Reader Circle $9.97, Pro $29.97, VIP $97)
9. **Upsells/Downsells** — AI-generated upsell sequences in checkout flow
10. **Social Media** — AI generates 90-day social content calendar

### Step 2: Coaching & Consulting (5 Nodes)
1. **1-on-1 Coaching** — AI generates 6/12-session program with outlines → populates `coaching_packages`
2. **Group Coaching** — AI generates 8-week curriculum
3. **Big Ticket** — AI generates premium packages ($5K-$25K)
4. **Revenue Sharing/JV** — Partnership matching + contract templates
5. **Monthly Memberships (Coaching Tier)** — Shared with Step 1

### Step 3: Speaking (8 Nodes)
1. **Keynotes** — AI generates 3-5 topics + slide decks → populates `speaking_topics`
2. **Podcasts (Guest)** — AI generates podcast pitch kit
3. **JVs (Joint Ventures)** — JV proposals for speaking
4. **Book Sales (at events)** — QR code order pages
5. **Special Editions** — AI generates special edition proposals
6. **In-House Speaker (Corporate)** — Corporate speaker profile + booking
7. **Fund Raising** — Fundraising event templates
8. **Conventions/Conferences** — Conference submission generator
9. **Training Programs** — AI generates corporate training curriculum

### Step 4: Seminars (4 Nodes)
1. **Retreats & Bootcamps** — AI generates 2-3 day agenda + registration
2. **Certification Programs** — AI generates curriculum + exam + certificates
3. **Masterminds** — AI generates program structure (quarterly meetings)
4. **Exhibitors/JV** — Exhibitor prospectus + partnership matching

## Asset Generation Process (The "Build My Author Business" Pipeline)

### Stage 1: Content Analysis (Minutes 1-5)
AI reads complete manuscript → identifies key concepts, frameworks, case studies, audience segments, teaching opportunities.

### Stage 2: Step 1 Digital Products (Minutes 5-10)
Simultaneously generates: course outline, workbook, audiobook script, webinar, home study guide, social media calendar, affiliate structure.

### Stage 3: Step 2 Coaching (Minutes 10-15)
Generates: 1-on-1 coaching program, group coaching curriculum, big ticket packages. Each with sales page and pricing.

### Stage 4: Step 3 Speaking (Minutes 15-20)
Generates: 3-5 keynote topics with slide decks, podcast pitch kit, corporate training, conference submissions, speaker profile.

### Stage 5: Step 4 Seminars (Minutes 20-30)
Generates: retreat agenda, certification program (curriculum + exam), mastermind structure, exhibitor prospectus.

### Author Review Process
After generation, author reviews each asset with three options: **Approve**, **Edit**, or **Regenerate**. Human-in-the-loop ensures quality.

## CRM: Automated Marketing Sequences

### Sequence A: Reader → Student (Step 1 → Step 1)
Book purchase → 7 days → "Dive deeper with the online course" → 3 days → Course discount offer

### Sequence B: Student → Coaching Client (Step 1 → Step 2)
Course 80% complete → "Ready to implement? Coaching accelerates results" → If clicked, tag coaching_lead

### Sequence C: Coaching Client → Speaker Audience (Step 2 → Step 3)
Coaching complete → "Join next live event" → Event invitation

### Sequence D: Event Attendee → Mastermind/Certification (Step 3 → Step 4)
Event attended → 14 days → "Take your journey to next level" → Mastermind/Certification application

### Sequence E: Cross-Author Promotion
Reader finishes book → "Readers who loved [Book] also discovered..." → Recommend other authors

### Sequence F: Re-engagement
No activity 30 days → "We miss you! Here's what's new" → Latest content + events

## Implementation Roadmap (20 Weeks)

### Phase 1: Foundation — CRM + Reading Club (Weeks 1-4) ✅ COMPLETE
### Phase 2: Step 1 — Digital Products (Weeks 5-9) ← CURRENT
- Week 5: AI Course Builder (manuscript analysis + course generation)
- Week 6: Course lessons, quizzes, workbook generation + delivery UI
- Week 7: Home Study + Webinar generator
- Week 8: Audiobook script + Membership system (3 tiers)
- Week 9: Upsell/downsell engine + Social media content generator

### Phase 3: Step 2 — Coaching (Weeks 10-12)
### Phase 4: Step 3 — Speaking (Weeks 13-16)
### Phase 5: Step 4 — Seminars + Integration (Weeks 17-20)

## Key Database Rules
- All products link to `book_id` as source
- All customer interactions feed into CRM
- `generated_assets` stores raw AI output; structured data populates domain tables
- Every asset has status: draft → approved → published
