

## Sprint 35 — ABBY Funnel Engine: Plan

### Audit findings (conflicts to resolve)

1. **Route collision** — `/:authorSlug/:bookSlug` is already used by `AuthorSubpageResolver` which routes to MicrositePage / AuthorBookPage. Sprint 35's `/[author-slug]/[page-slug]` would collide.
   - **Fix**: extend `AuthorSubpageResolver` to also check the new `funnels` table (live status). Resolution order: known node slug → dynamic microsite node → **funnel slug (NEW)** → book slug. No new route entry needed; quiz funnel `/free-gift` continues to resolve via existing path unchanged.
2. **Sidebar location** — Spec says insert "My Funnels" between "My Author's Page" and "My CRM" in the YOUR BRAND section of `DashboardSidebar.tsx` (line 186-188). Clean insertion, no conflicts.
3. **Section-based routing** — Per memory, dashboard uses `?section=` query params, not sub-routes. So "My Funnels" should be a new dashboard section (`?section=my-funnels`), not a top-level `/my-funnels` route. I'll deviate from the spec here to follow project convention (and confirm in plan).
4. **AI model** — Spec says GPT-4o; project standard is Lovable AI Gateway with `openai/gpt-5.2` for generation. Will use gpt-5.2.
5. **Email sequence hook** — Sprint 34's `email_flows.node_id` already maps; `submit-funnel` will reuse `trigger-sequence` (already built).
6. **No conflicts** with Sprint 34 (Marketing Hub, email engine), quiz funnel, CRM, or admin.

### Phase A — Database (1 migration)
- Create `funnels` table (id, author_id, node_id, funnel_type, title, slug, headline, subheadline, body_copy, cta_text, cta_url, hero_image_url, background_color, accent_color, status, page_views, conversions, published_at, timestamps, UNIQUE(author_id, slug))
- Create `funnel_submissions` table (id, funnel_id, author_id, email, name, phone, custom_fields, ip, utm_*, created_at)
- RLS: authors manage own; public can SELECT live funnels; public can INSERT submissions
- Index on (author_id, slug) and (status)

### Phase B — Edge functions (3 new)
1. **`generate-funnel`** — Lovable AI Gateway (`openai/gpt-5.2`), reads `author_context` + `author_profiles` + `books`, generates headline/subheadline/body/CTA/title/slug per funnel_type focus. Saves draft to `funnels`. `verify_jwt = true`.
2. **`submit-funnel`** — Public endpoint (`verify_jwt = false`). Validates live funnel, inserts submission, upserts `leads` (with `abby_score=5`, `stage='new'`, source='funnel'), inserts `lead_activities`, increments conversions, calls `trigger-sequence` if matching `email_flows.node_id` exists.
3. **`track-funnel-view`** — Public, increments `page_views`. `verify_jwt = false`.

### Phase C — Public funnel renderer
- New component `src/pages/FunnelPage.tsx` (dark navy + gold theme, mobile-first, no sidebar/nav)
- Layout: minimal header → headline → subheadline → body → opt-in form (first name + email + CTA) → privacy note → author footer + "Powered by Authors Bureau"
- On mount: call `track-funnel-view`. On submit: call `submit-funnel`, show inline thank-you (or redirect if `cta_url` set)
- **Wire into `AuthorSubpageResolver.tsx`**: add a funnel-slug check (Supabase query against `funnels` where slug = bookSlug AND status = 'live') in the resolution order before falling back to AuthorBookPage. Quiz funnel path untouched.

### Phase D — Funnel management UI
- New section `?section=my-funnels` (following project routing convention) — file: `src/components/dashboard/FunnelsHub.tsx`
- Card grid: title, node badge, type badge, status badge, views/conversions/rate, live URL, actions (Preview / Edit inline / Go Live-Pause / Copy Link)
- Inline editor: headline, subheadline, body, CTA, bg/accent color preset swatches, Save, "Regenerate with ABBY" (with confirm dialog)
- ABBY empty-state message
- Add to `DashboardSidebar.tsx` between "My Author's Page" and "My CRM" with `Filter` icon, no lock badge (all tiers)

### Phase E — Node builder integration
- Helper `src/lib/funnel-generation-hook.ts` (mirror of `email-sequence-hook.ts`): idempotent fire-and-forget call to `generate-funnel`
- Wire into BP-02 (opt_in), BP-04 (opt_in), BP-05 (webinar_registration), BP-09 (sales) — call after existing content generation step. No UI restructure; reuses existing builder publish hooks alongside `ensureEmailSequence`.

### Phase F — Revenue Dashboard
- Add "Funnel Performance" table section to `src/pages/RevenueFullDashboard.tsx`: Funnel Name | Node | Views | Conversions | Conv. Rate | Status. Sort by conversions desc. Empty state "No funnels yet".

### Phase G — Memory + QA
- Save `mem://sprints/sprint-35-abby-funnel-engine` with reuse decisions (route resolver merge, gpt-5.2 over gpt-4o, section-based routing instead of `/my-funnels` top-level route, reuses Sprint 34 trigger-sequence)
- QA: 11-step checklist from spec, plus regression tests for quiz funnel, microsite, book pages, BP-02 publish flow

### Deviations from spec (flagged)
| Spec | Decision | Reason |
|---|---|---|
| `/my-funnels` top-level route | `?section=my-funnels` dashboard section | Project memory: dashboard uses query-param sections |
| GPT-4o | `openai/gpt-5.2` via Lovable AI Gateway | Project standard, no API key needed |
| New `/[author-slug]/[page-slug]` route | Extend existing `AuthorSubpageResolver` | Avoids React Router collision with microsite/book routes |

### What this avoids
- No regression to quiz funnel, microsite, BookPage, BP builders, Marketing Hub, or email engine
- No duplicate routes; clean integration into existing slug resolver
- Reuses Sprint 34's `trigger-sequence` and email engine

