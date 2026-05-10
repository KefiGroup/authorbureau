# Sprint 60 — Readiness Reconciliation + Microsite Emdash Scrubber

## Goals
Close the two deferred discrepancies surfaced in the Pauline Teo audit:

1. **Readiness drift** — dashboard shows `22/28` but DB shows `26` live nodes. The audit's "stuck-live" check (`delivery_url` only) disagrees with `hasRequiredAssets()` (requires `library_asset` or substantive `content_json`).
2. **Emdash violations** — 53 emdash hits on the *Be SUCKcessful* microsite, plus 2 missing-CTA flags. Emdashes are forbidden by the public-microsite rule.

---

## Workstream A — Readiness Reconciliation

**Single source of truth**: `hasRequiredAssets()` in `src/lib/node-readiness.ts`.

Steps:
1. Read current `hasRequiredAssets()` and the audit's stuck-live SQL in `daily-audit-cron`.
2. Port the same per-archetype rules into a SQL helper (`public.node_has_required_assets(node_id, library_asset, content_json, delivery_url)`) so DB-side audits and TS-side dashboard agree byte-for-byte.
3. Update `daily-audit-cron`'s "Stuck-live nodes" query to use the new helper instead of the loose `delivery_url IS NOT NULL` check.
4. Add the 4 offending Pauline nodes to the audit output so we can confirm they now flag.
5. Add a one-shot reconciliation report (admin-only edge fn `audit-readiness-drift`) listing all `status='live'` rows that fail the helper, grouped by author.

Acceptance: Pauline's "X/28" badge and the audit email "Stuck-live" section report the **same set** of nodes.

## Workstream B — Microsite Emdash Scrubber

The DB already has `scrub_microsite_jsonb()` + `author_nodes_scrub_content` trigger, but the trigger only fires on **future** writes to `author_nodes.content_json`. Existing rows are dirty.

Steps:
1. One-shot SQL sweep: `UPDATE author_nodes SET content_json = scrub_microsite_jsonb(content_json) WHERE detect_microsite_violations(content_json) <> '{}';` — logged via the existing `content_quality_log`.
2. Same sweep for `books.description`, `author_profiles.bio`, and `library_assets.content` (text columns) using a regex-only variant.
3. Re-run violation detector and confirm Pauline's microsite reports 0 emdash hits.
4. Add a nightly reconciliation row to `daily-audit-cron` that re-scans top-100 most-trafficked live microsites and re-flags any new violations.

## Out of scope
- Touching the `missing_cta` rule (separate sprint — needs UX call on whether CTAs are required per node archetype).
- Rewriting `hasRequiredAssets()` semantics — only **mirroring** them in SQL.

## Technical notes
- Helper SQL must be `IMMUTABLE` so it can be called from CHECK / generated columns later if needed.
- Sweep migrations run as one-shot data updates via `supabase--insert` (not migrations) per project rules.
- All changes touch backend logic + 1 edge fn; no UI changes.

## Deliverables
- `supabase/migrations/*_node_has_required_assets.sql`
- Updated `supabase/functions/daily-audit-cron/index.ts`
- New `supabase/functions/audit-readiness-drift/index.ts`
- Sweep run logs in `content_quality_log`
- Sprint 60 doc entry in `/docs/`
