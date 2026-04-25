# Fix "ABBY couldn't build that funnel" + Redesign My Funnels Page

## Part 1 — Fix the 401 Error (root cause)

The `generate-funnel` edge function returns **401 Unauthorized**, which surfaces as the red toast.

**Root cause:** The function has `verify_jwt = false` in `supabase/config.toml`, but its handler still manually requires an `Authorization: Bearer ...` header and calls `userClient.auth.getUser()` to validate the user. When `supabase.functions.invoke()` is called and the session token isn't reliably forwarded (or is stale), the manual gate rejects the request — even though all the data the function needs (`author_id`) is in the body, and all DB writes use the service role.

The other lead-capture / data functions in the project don't do this manual gate; they trust the body and authorize by ownership.

**Fix:** Remove the manual JWT-validation block from `supabase/functions/generate-funnel/index.ts`. Keep CORS + the rest of the logic untouched. Authorization remains correct because:
- `author_id` comes from the frontend, which resolved it from the user's session
- All inserts/updates use `service_role` against rows scoped to that `author_id`
- `verify_jwt = false` is already declared in config

## Part 2 — Page UX Redesign

The current page dumps **22 large dark-blue "Generate funnel for ..." buttons in a wall** above the funnels list. It looks like spam, hides the actual funnels below the fold, and gives no sense of which products matter most.

### New layout

```text
┌─ My Funnels ────────────────────────────────────────────┐
│  Header + short description                              │
│                                                           │
│  ┌─ Stats strip ─────────────────────────────────────┐  │
│  │  3 Live · 2 Drafts · 247 Views · 18 Leads · 7.3% │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ ABBY suggestion (collapsed by default) ──────────┐  │
│  │  ✨ ABBY can build 19 more funnels for your live  │  │
│  │     products.    [ Show suggestions ▾ ]           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  Filter chips: [All] [Sales] [Opt-in] [Application]      │
│                [Event] [Live] [Paused]                   │
│                                                           │
│  Existing funnel cards (2-col grid, unchanged design)    │
└──────────────────────────────────────────────────────────┘
```

### Specifics

1. **Stats strip** (new, top of page): Live count, Draft count, total Views, total Leads, avg conversion rate. One slim card.

2. **Collapsible ABBY suggestions:** Replace the wall of 22 buttons with a single collapsed banner. When expanded, group the suggestions by archetype with small section headers — Sales, Opt-in, Application, Event — so authors see *why* each funnel exists, not just a list of names. Each suggestion is a compact pill with archetype color accent, not a full-width dark button.

3. **Filter chips** above the funnel grid (All / by archetype / by status). Filters the cards below.

4. **Empty-state copy** stays.

5. **Funnel card polish:** Keep current card structure. Move the URL line to be clickable (opens in new tab) and tighten the action row by collapsing rarely-used actions (Pause, Edit) into a small overflow menu, leaving "View Funnel · Copy link · View in CRM" as primary.

## Files to change

- `supabase/functions/generate-funnel/index.ts` — remove the manual auth block (≈10 lines deleted near the top of the handler)
- `src/components/dashboard/FunnelsHub.tsx` — restructure the suggestion banner, add stats strip + filter chips, tighten card action row

No DB migrations, no new dependencies.
