

## Abby's Special Edition Calendar — proactive seasonal prompts

Right now BP-08 already has occasion templates (Valentine's, Mother's Day, Father's Day, Christmas, etc.) and a date-aware Abby tip inside the builder. But the author only sees that tip **if they happen to open BP-08**. We need Abby to **proactively prompt** the author 6–10 weeks before each peak occasion with a one-click path to spin up a themed edition + bundle for both Amazon and the author's portal.

### What you'll see after

**1. New "Special Edition Calendar" card on the dashboard**
A horizontal calendar strip showing the next 3 upcoming occasions with countdown chips:

```text
┌─────────────────────────────────────────────────────────────────┐
│  🎁 Special Edition Calendar                  View full calendar │
├─────────────────────────────────────────────────────────────────┤
│  💝 Valentine's Day  🌷 Mother's Day  🛡 Father's Day            │
│  in 3 weeks ⚡        in 11 weeks       in 15 weeks               │
│  [Build edition →]   [Build edition →] [Plan edition →]          │
└─────────────────────────────────────────────────────────────────┘
```

The "⚡" chip means the occasion is inside its **launch window** (8 weeks out for Amazon print lead time + marketing runway). Clicking "Build edition" deep-links to BP-08 with the occasion **pre-selected** and the recommended price/print-run pre-filled.

**2. Abby nudges in the existing nudge feed**
6 new triggers fire automatically through the existing `generate-nudges` edge function:

- **8 weeks out** — "🌷 Mother's Day is 8 weeks away. Authors who launch a themed edition by week 6 sell 3x more. Want me to draft a Hardcover Mother's Day Edition of *[Book Title]* now?"
- **4 weeks out** — last-call nudge with bundle suggestion
- **Fired only once per occasion per author per year** (dedupe key `special_edition_${occasion}_${year}`)

**3. One-click "Generate this edition" flow**
Clicking the nudge or calendar CTA opens BP-08 with:
- Occasion pre-selected (e.g. Mother's Day)
- Edition type pre-set (Hardcover Collector's for gifting occasions, Signed for Father's Day, Gift Set for Christmas)
- Suggested price pre-filled
- "Includes" pre-populated with occasion-specific bonuses (themed foreword, gift inscription page, companion journal/audio for that occasion)
- Bundle tab pre-loaded with **Amazon SKU bundle** (book + workbook + signed bookplate) and **Portal Premium bundle** (everything + author audio message)

Author can edit anything, then click **Generate** — Abby produces the full 3-tier edition + sales page + 30-day promo calendar (already supported by `generate-bp08-mastermind`).

**4. Full Calendar page at `/special-editions-calendar`**
A 12-month grid showing all occasions, status per occasion (`Not started` / `Drafted` / `Live on Portal` / `Live on Amazon`), and revenue earned per occasion last year. Reachable from the dashboard card and the BP-08 builder header.

### The 7 universal occasions we use

Limited to a small, universal set (no niche holidays) so the calendar stays clean:

| Occasion | Peak Window | Launch Trigger | Default Edition | Default Price |
|---|---|---|---|---|
| 💝 Valentine's Day | Jan 15 – Feb 14 | Dec 1 (10 wk) | Signed Limited (100) | $49 |
| 🌷 Mother's Day | Apr 15 – May 12 | Mar 1 (10 wk) | Hardcover Collector's | $69 |
| 🛡 Father's Day | May 15 – Jun 15 | Apr 1 (10 wk) | Signed Edition | $59 |
| 🎓 Graduation | Apr 1 – Jun 30 | Feb 15 (10 wk) | Gift Set | $79 |
| 📚 Back to School | Jul 15 – Sep 15 | Jun 1 (10 wk) | Signed + Workbook | $69 |
| 🎁 Christmas / Holiday | Oct 15 – Dec 25 | Sep 1 (10 wk) | Hardcover Gift Set | $99 |
| ✨ New Year | Dec 15 – Jan 15 | Nov 1 (10 wk) | Limited Numbered | $59 |

These defaults already live in `OCCASION_TEMPLATES` — we just centralize them and add `launchWindowWeeks: 10` and `defaultEditionType` / `defaultPriceUsd` fields.

### What changes in code

**New file: `src/lib/special-edition-calendar.ts`**
- Single source of truth for the 7 occasions (extends what's already in `OccasionTemplateGrid.tsx`).
- Exports `getUpcomingOccasions(now, count)`, `weeksUntil(occasion)`, `isInLaunchWindow(occasion)`, `nextOccurrence(occasion)`.
- Handles year-rollover (Valentine's in November shows "next Feb 14", not "10 months ago").

**New component: `src/components/dashboard/SpecialEditionCalendarCard.tsx`**
- Renders the horizontal 3-occasion strip on the dashboard (Brand Products section).
- Each chip shows emoji, name, "in N weeks" countdown, urgency ⚡ if inside launch window.
- CTA: `navigate("/node-builder/BP-08?occasion=mothers-day&autostart=1")`.

**New page: `src/pages/SpecialEditionCalendarPage.tsx`** (route `/special-editions-calendar`)
- 12-month grid view with all occasions, status badges per occasion, last-year revenue per occasion.
- Wrapped in `DashboardLayout`.

**Modify: `src/components/dashboard/builders/special-editions/SpecialEditionsStepRenderer.tsx`**
- Read `?occasion=` and `?autostart=` query params. If present, pre-select the occasion + edition type + price + "Includes" defaults the moment the builder mounts.
- Add a small "Why this occasion now?" callout above the existing Abby tip when launched from a nudge.

**Modify: `supabase/functions/generate-nudges/index.ts`**
- Add a new "Seasonal Edition Triggers" block that loops through the 7 occasions, computes weeks-until, and inserts nudges at **8 weeks out** and **4 weeks out**.
- Dedupe key: `special_edition_${occasionId}_${year}` so each occasion fires at most twice per year per author.
- Skip if the author already has a `live` BP-08 node tagged with that occasion this year (check `content_json.occasion` + `activated_at` year).
- Skip entirely if BP-08 isn't unlocked for the author's tier.

**Modify: `src/pages/AuthorDashboard.tsx`**
- Mount `<SpecialEditionCalendarCard />` inside the dashboard view, just below the Brand Products summary.

**Bundle / Amazon hooks (no new infra needed)**
The existing `generate-bp08-mastermind` function already produces a `bundle_offer` JSON. We extend its prompt to ALWAYS produce two bundle SKUs when an occasion is set:
- `amazon_bundle` — physical-only items, ASIN-friendly title with occasion suffix (e.g., "*[Book]* — Mother's Day Hardcover Gift Set")
- `portal_bundle` — adds author-only digital extras (signed audio note, themed PDF journal, companion meditation)

The existing `deploy-bp08-to-ghl` function already handles the portal listing + Stripe payment link. For Amazon we generate an **Amazon Listing Pack** (title, bullets, A+ content blurb, keyword list) that the author copy-pastes into Amazon KDP — no Amazon API integration needed in this sprint.

### Out of scope (explicit)

- Direct Amazon KDP API integration (we generate the listing copy; author publishes manually).
- Notification email/SMS for nudges (existing in-app nudge feed only).
- Custom occasions beyond the 7 universal ones (the BP-08 builder still supports the existing "Custom Occasion" template — it just doesn't appear on the calendar).
- Per-book occasion editions (one occasion edition spans the author's catalog; per-book is a future iteration).

### Validation

1. On Apr 1, dashboard shows: Mother's Day (in 6 wk ⚡), Father's Day (in 11 wk), Graduation (in 4 wk ⚡).
2. Open the in-app nudge feed: a Mother's Day nudge appears with one-click "Draft Mother's Day Edition" CTA.
3. Click the CTA → BP-08 opens with occasion = Mother's Day, edition type = Hardcover Collector's, price = $69, occasion-specific bonus list pre-filled.
4. Click Generate → 3-tier edition + Amazon bundle copy + Portal bundle published, ready to copy into KDP.
5. Re-visit the calendar: Mother's Day chip now shows "Drafted" status badge.
6. Trigger generate-nudges twice on the same day → only one Mother's Day nudge exists (dedupe works).
7. On Nov 1, calendar shows Christmas (in 7 wk ⚡), New Year (in 9 wk ⚡), Valentine's (in 15 wk).

