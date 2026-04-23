

# Plan — Fix the YR-19 → YR-28 Reader Pages

## Diagnosis (confirmed against live DB)

All 10 YR nodes for Pauline Teo are **`status: live`** in `author_nodes` and contain **rich, well-structured content** (e.g. `packages`, `offers`, `signature_talks`, `fee_schedule`, `programme_title`, `mastermind_title`, `retreat_options`, `certification_promise`, etc.). The builder side is working correctly.

**The bug is in `src/pages/MicrositePage.tsx`.** Line 224 routes every node from BA-10 onwards (except the 6 with dedicated templates) to `<GenericPage>`. `GenericPage` only knows how to read 4 generic fields: `headline`, `subheadline`, `description`, `bullets`. The YR builders save **none** of these — they save node-specific shapes. Result:

- Left content column → empty (no headline/subheadline/description/bullets).
- Right column falls back to whichever helper matches `getActionType(nodeId)`:
  - `purchase` + no `payment_link` → **"Coming Soon"** disabled button (YR-19, 24, 25, 26, 27 — and YR-23 mis-renders too).
  - `enquiry` → **"Get in Touch"** form (YR-21, 22, 28).
  - `application` → **"Apply Now"** form (YR-20, 23).

That perfectly matches the two failure patterns Pauline reported.

## Fix — Build 10 dedicated reader templates

Mirror the pattern already used for `GroupCoachingPage` (BA-13), `PodcastPage` (BA-14), `OnlineCoursePage` (BA-10): one component per node, each reading the actual content shape the corresponding builder writes.

### New components inside `src/pages/MicrositePage.tsx`

| Node | New component | Reads from `content_json` |
|------|---------------|--------------------------|
| YR-19 | `CoachingPage` | `practice_title`, `tagline`, `coaching_philosophy`, `packages[]` (name, description, duration, price_usd, ideal_for, outcomes[]), `discovery_call_script.opening` |
| YR-20 | `BigTicketPage` | `offers[]`, `sales_conversation_guide`, `abby_summary` |
| YR-21 | `SpeakingPage` | `speaker_brand`, `speaker_tagline`, `signature_talks[]`, `fee_schedule`, `speaker_one_sheet`, `booking_process` |
| YR-22 | `CorporateTrainingPage` | `programme_title`, `tagline`, `training_formats[]`, `learning_outcomes[]`, `programme_outline[]`, `target_organisations[]` |
| YR-23 | `MastermindPage` | `mastermind_title`, `tagline`, `programme_promise`, `membership_tiers[]`, `sales_page` |
| YR-24 | `RetreatPage` | `retreat_title`, `tagline`, `retreat_concept`, `retreat_options[]`, `transformation_arc`, `itinerary[]` |
| YR-25 | `CertificationPage` | `certification_promise`, `tagline`, `modules[]`, `levels[]`, `badge_concept` |
| YR-26 | `ConferencePage` | conference fields from YR-26 builder |
| YR-27 | `FundraisingPage` | fundraising fields from YR-27 builder |
| YR-28 | `SponsorsPage` | sponsor/exhibitor fields from YR-28 builder |

Each template:
- Renders the actual content as a clean reader page (header + structured sections + tabs/accordions for tiers/packages/itineraries).
- Uses the existing `theme.vars` palette so it inherits the author's site theme.
- Keeps the appropriate right-column action (enquiry form / application form / payment / "Notify me") based on `getActionType(nodeId)`.
- Includes a **`SafeText` / `SafeBlock`** guard from `yr-shared/YRSafeBoundary` so any AI-shape variation (object vs string vs array) renders gracefully — same defensive pattern we already shipped to the builder side.
- Matches the visual language of `OnlineCoursePage` / `GroupCoachingPage`: 2-column grid, sticky right-side CTA card, accent-coloured headings, Card components with `cardBg` / `cardBorder` from theme.

### Router wiring

In the main render block (`MicrositePage` return), extend the explicit list (line 224) and add 10 new routes:

```tsx
{resolvedNodeId === "YR-19" && <CoachingPage ... />}
{resolvedNodeId === "YR-20" && <BigTicketPage ... />}
... (through YR-28)
```

Update the fallback exclusion list so `GenericPage` is only used as a true last-resort for nodes that have no dedicated template.

### Defensive content reading

Every template starts with the same content normalisation pattern already used in `OnlineCoursePage`:
```tsx
const title = (typeof content.X === "string" && content.X) || data.node.personalised_name || NODE_NAMES[nodeId];
const list = Array.isArray(content.Y) ? content.Y : [];
```
This guarantees no white screen if a future generation returns an unexpected shape — fields just don't render.

### What stays the same

- `get-microsite-page` edge function — unchanged. It already returns the full `content_json` and accepts `status === 'live'` correctly.
- `getActionType()` — unchanged.
- All publish/activation flow — unchanged.
- BA-10/13/14/15/16/17/18 templates — unchanged.
- `GenericPage` — kept as the last-resort fallback (will only fire if a brand-new node is added without a template).

## Files touched

- **Edit** `src/pages/MicrositePage.tsx`
  - Add 10 new page components (~80–120 lines each, ~1000 lines total).
  - Wire 10 new routes in the main render block.
  - Update the `GenericPage` fallback exclusion list to include all 10 YR ids.
- **No** changes to: edge functions, DB, builders, router, slug map, or shared backend.

## Verification

1. `/pauline-teo/coaching` → renders the 3 coaching packages (Clarity Intensive, 8-Week Accelerator, 90-Day Mentorship), philosophy, discovery-call opening, plus enquiry CTA.
2. `/pauline-teo/vip` → renders the big-ticket offers list with sales-conversation framing + application form.
3. `/pauline-teo/speaking` → renders speaker brand, tagline, signature talks, fee schedule + booking enquiry form.
4. `/pauline-teo/corporate-training` → renders programme title, training formats, learning outcomes + enquiry form.
5. `/pauline-teo/mastermind` → renders mastermind title, promise, membership tiers + application form.
6. `/pauline-teo/retreat` → renders retreat concept, options, itinerary + enquiry form.
7. `/pauline-teo/certification` → renders certification promise, modules, levels, badge + enquiry form.
8. `/pauline-teo/conference`, `/fundraising`, `/sponsors` → each renders its own real content + appropriate action.
9. No "Coming Soon" badge on any of the 10 nodes. No generic "Get in Touch" placeholder. Every page reflects what Pauline generated in the builder.
10. Toggle a node back to draft → still shows the existing "coming soon" screen via the `Node not live` guard in `get-microsite-page` (unchanged).

## Out of scope

- Builder UI / generation logic — already working.
- DB schema, edge functions, RLS — no changes needed.
- BP / BA reader pages already in place.
- Visual redesign — templates use the existing theme system and match the look of `OnlineCoursePage` / `GroupCoachingPage`.

## Scope

One file (`MicrositePage.tsx`), 10 new components + 10 new route lines + 1 fallback list update. No edge function, DB, or shared infra changes. Pure reader-rendering work that closes the loop between "builder published" and "reader sees content."

