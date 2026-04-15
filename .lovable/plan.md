

# Author Public Website — Complete Node Architecture Plan

All 28 revenue nodes mapped to a single, conversion-optimized author page. Each section only renders when the author has live content for those nodes.

<lov-artifact url="/__l5e/documents/author-website-architecture.mmd" mime_type="text/vnd.mermaid"></lov-artifact>

**Color key:** Teal = Brand nodes (BP), Indigo = Build nodes (BA), Amber = Yield nodes (YR), Gray = backend-only (no public display)

---

## Current State vs Target

**Currently rendered:** Hero, About, Books (BP-09), Services (coaching + products), Subscribe, Related Authors — only 6 sections covering ~8 nodes.

**Target:** 7 strategic sections covering all 24 public-facing nodes, with 4 backend-only nodes (BP-01, BP-03, BA-15, BA-18) working behind the scenes.

---

## Section Architecture

### Section 1: Hero + Lead Capture
**Nodes:** BP-02 (Lead Magnet), BP-01 (Email — backend), BP-03 (Social — backend)
- Current hero stays. Add a prominent "Take the Free Assessment" CTA card if BP-02 is live.
- CTA links to `/{authorSlug}/{quiz-slug}`. Leads feed into BP-01 email list automatically.
- **This is the one you asked about — we build this first.**

### Section 2: About the Author
**Nodes:** BA-14 (Podcast)
- Current bio section stays. If BA-14 podcast is live, embed a "Latest Episodes" mini-player or link strip below the bio.

### Section 3: Published Works
**Nodes:** BP-09 (Books), BP-08 (Special Editions), BA-11 (Audiobook), BP-06 (Workbook), BA-17 (Bundles)
- Current book cards stay. Enhance each card with badges for available formats:
  - "Audiobook Available" badge if BA-11 exists for that book
  - "Workbook Available" badge if BP-06 exists
  - "Special Edition" badge if BP-08 exists
  - "Bundle" link if BA-17 exists
- Each badge links to the respective microsite page.

### Section 4: Learn from the Author (NEW)
**Nodes:** BP-07 (Home Study), BA-10 (Online Course), BP-05 (Webinars), BA-12 (Membership), YR-25 (Certification)
- New section between Books and Work With Me.
- Grid of cards, each linking to the node's microsite page.
- Ordered by commitment level: Webinar (free/low) → Home Study → Online Course → Membership → Certification.
- Only renders if at least one of these nodes is live.

### Section 5: Work With Me (enhanced)
**Nodes:** YR-19 (1-on-1 Coaching), BA-13 (Group Coaching), YR-23 (Mastermind), YR-20 (VIP), YR-22 (Corporate Training), YR-21 (Speaking)
- Replaces current "Services" section with richer layout.
- Two sub-groups:
  - **Coaching & Growth:** YR-19, BA-13, YR-23, YR-20
  - **For Organisations:** YR-22, YR-21
- Each card links to its microsite. Contact CTA for enquiry types.

### Section 6: Events & Community (NEW)
**Nodes:** YR-24 (Retreats), YR-26 (Conferences), YR-27 (Fundraising), YR-28 (Sponsors)
- Only renders if any event node is live.
- Cards with date/location if available, linking to microsite pages.

### Section 7: Connect + Subscribe
**Nodes:** BA-16 (Affiliates), BA-18 (JV — backend), BA-15 (Media — backend)
- Current subscribe form stays (feeds BP-01 + CRM).
- If BA-16 is live, add "Become an Affiliate" link/card.
- Contact modal already exists.

### Footer
- Related Authors (existing)
- "Powered by Authors Bureau" (existing)

---

## Navigation Update

Current nav: Home | About | Books | Services | Subscribe | Contact

**New nav:** Home | About | Books | Learn | Work With Me | Events | Connect

Each nav item only appears if the corresponding section has live nodes. The nav dynamically adapts per author.

---

## Data Strategy

Single query to `author_nodes` during `loadAuthorSite()`:
```sql
SELECT node_id, status, personalised_name, content_json, microsite_url
FROM author_nodes
WHERE author_id = {profile.id} AND status = 'live'
```

Group results by section. Pass arrays to each section component. RLS policy needed for anonymous reads on live nodes.

---

## Implementation Order

| Phase | What | Nodes |
|-------|------|-------|
| **Phase 1** (now) | Lead Magnet CTA in Hero + new Learn section | BP-02, BP-05, BP-07, BA-10, BA-12, YR-25 |
| **Phase 2** | Enhanced Book cards with format badges | BP-08, BA-11, BP-06, BA-17 |
| **Phase 3** | Work With Me restructure | YR-19, BA-13, YR-23, YR-20, YR-22, YR-21 |
| **Phase 4** | Events section + Podcast embed + Affiliate link | YR-24, YR-26, YR-27, YR-28, BA-14, BA-16 |

---

## Files to Create/Modify

- `src/pages/AuthorSite.tsx` — add `author_nodes` query, pass data to sections
- `src/pages/author-site/AuthorLeadMagnetsSection.tsx` — NEW: BP-02 CTA cards
- `src/pages/author-site/AuthorLearnSection.tsx` — NEW: courses/webinars/membership
- `src/pages/author-site/AuthorEventsSection.tsx` — NEW: retreats/conferences
- `src/pages/author-site/AuthorBooksSection.tsx` — enhance with format badges
- `src/pages/author-site/AuthorServicesSection.tsx` — restructure as "Work With Me"
- `src/pages/author-site/AuthorSubscribeSection.tsx` — add affiliate link
- `src/components/public/AuthorBrandedNav.tsx` — dynamic nav items
- Migration: RLS policy on `author_nodes` for anonymous reads

