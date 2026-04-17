

## Sprint 35b QA Audit — Findings

I audited the database, edge functions, and recent Sprint 35b code. Most things are healthy. Below are the **real issues I found** that need fixing, plus a clean bill of health on what's working.

### ✅ What's working
- **Tables**: `funnels`, `funnel_submissions`, `author_nodes`, `author_context`, `books`, `author_profiles` all exist with RLS enabled.
- **Edge functions**: `generate-bp03-social-media`, `generate-bp04-website`, `generate-funnel` all have correct CORS, auth, error handling, and are deployed (zero recent 4xx/5xx in edge logs).
- **`abby-error.ts`**: clean, defensive, never throws.
- **`DashboardSidebar` cache**: 5-min TTL, localStorage hydration logic is correct.
- **`FunnelsHub` retroactive prompt**: queries live nodes, generates funnels per node correctly.
- **`generate-funnel`**: supports `force` + `funnel_id` for regen, `lead_magnet`/`webinar`/`opt_in`/`sales` types — all wired.

### 🐞 Issues found (3 real bugs + 2 polish)

**Bug A — `BookProfileQuickForm` does an INSERT, not UPSERT** (medium)
- File: `src/components/dashboard/builders/shared/BookProfileQuickForm.tsx` lines 43, 56.
- Uses `.insert()` for both `author_context` and `books`. If the user re-opens the form (e.g. after a failed generation), it creates duplicate rows. Worse, `books.slug` has a unique constraint, so a second submit with the same title may fail.
- **Fix**: change `author_context` insert to upsert by `author_id`, and check for an existing book before inserting (or catch the unique-violation gracefully).

**Bug B — `BP03Builder` progress poll never stops if the user navigates away mid-generation** (low)
- File: `src/components/dashboard/builders/bp03/BP03Builder.tsx` line 130.
- `progressPollRef` interval is only cleared in the `finally` block of `handleGenerate`. If the component unmounts during generation (user clicks back), the interval leaks and keeps querying `author_nodes`.
- **Fix**: add a `useEffect` cleanup that clears `progressPollRef.current` on unmount.

**Bug C — `FunnelsHub.loadLiveNodes` selects `microsite_url` but the type omits `status`** (low)
- File: `src/components/dashboard/FunnelsHub.tsx` lines 44–47, 95–103.
- The query selects `node_id, microsite_url, status` but `LiveNode` interface only declares `node_id` and `microsite_url`. Cast `as LiveNode[]` silently drops `status`. Currently harmless (status is filtered server-side via `.eq("status","live")`), but the type lies.
- **Fix**: add `status: string` to the `LiveNode` interface, or drop `status` from the select.

**Polish 1 — `generate-bp03-social-media` returns HTTP 200 on errors** (line 217)
- Returns `status: 200` with `success: false`. The client `handleGenerate` does check `data.success`, so it works — but it breaks edge-log visibility (no 4xx/5xx ever recorded for this function, which is why our log query came back empty). Recommend returning `500` for true failures so they show up in monitoring.

**Polish 2 — `generate-bp04-website` may still time out at 4000 tokens** (informational)
- The website JSON has ~25 fields including 6-paragraph bios and 5 takeaways. 4000 tokens is tight. Bumping to 6000 gives headroom without risking gateway timeout (gateway limit is generous on `gpt-5.2`).

### 🔒 Database linter notes (pre-existing, not Sprint 35b)
- 1 INFO: RLS-enabled-no-policy on one table (likely intentional admin-only).
- 7 WARN: function search_path mutable on legacy functions (pre-existing tech debt).
- 5 WARN: permissive RLS policies on legacy tables (pre-existing).

These are NOT Sprint 35b regressions and should be addressed in a dedicated security sprint, not here.

### Phasing
- **Phase 1 (this sprint)**: Fix Bugs A, B, C + Polish 1 + Polish 2.
- All in 5 file edits, no migrations needed.

### Files touched
- `src/components/dashboard/builders/shared/BookProfileQuickForm.tsx` (upsert pattern)
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` (interval cleanup)
- `src/components/dashboard/FunnelsHub.tsx` (LiveNode type)
- `supabase/functions/generate-bp03-social-media/index.ts` (status 500 on error)
- `supabase/functions/generate-bp04-website/index.ts` (max_completion_tokens → 6000)

### Out of scope
Pre-existing linter warnings, BP-01 quiz funnel, GHL deploy functions, anything outside Sprint 35b's surface.

Approve to apply the 5 fixes?

