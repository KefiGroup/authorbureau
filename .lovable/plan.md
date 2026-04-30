# Audit #5 — Critical Blocker Found, Then Resume Audit

## What I found (live site is broken for readers)

I scored all 24 of Pauline's microsite URLs against the resolver. **Every single one returns HTTP 404 "Node not live"**, even though the database confirms all 28 nodes have `status='live'`. That means right now, any reader who clicks a card on `/pauline-teo` and lands on `/pauline-teo/free-gift`, `/webinar`, `/coaching`, etc. gets a broken page.

### Root cause

```text
DB: 28 nodes × 2 rows each = 56 rows for Pauline
Resolver: .maybeSingle() against (author_id, node_id) → returns null when >1 row
Result: isLive = false → 404 → "Node not live"
```

Every node has **2 duplicate rows**:
- **Original row** (created weeks ago) — has `microsite_url` populated, slightly older content_json
- **Newer row** (created 2026-04-29) — `microsite_url=NULL`, slightly larger regenerated content_json

Both are `status='live'`. Same `updated_at` (touched by a recent bulk write — likely a generator that did INSERT instead of UPSERT). This is **Pauline-only** (other authors have 1 row per node), so the corruption was introduced by a generator run on her account specifically.

## The fix (two parts)

### Part A — Stop the bleeding (data cleanup)

For each of Pauline's 28 node_ids, keep the **better** of the two rows and delete the other. "Better" = the row with `microsite_url` populated AND the larger/newer content_json where they differ.

Concretely, the rule per node_id:
1. If exactly one row has `microsite_url IS NOT NULL` → keep that row, delete the other
2. If both have NULL `microsite_url` → keep the one with the larger `content_json`, delete the other

This will be a single migration:

```sql
-- Within a transaction
WITH ranked AS (
  SELECT id, node_id,
    ROW_NUMBER() OVER (
      PARTITION BY author_id, node_id
      ORDER BY (microsite_url IS NOT NULL) DESC,
               length(content_json::text) DESC,
               created_at ASC
    ) as rn
  FROM author_nodes
  WHERE author_id = (SELECT id FROM author_profiles WHERE author_slug='pauline-teo')
)
DELETE FROM author_nodes WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

I will print the would-delete set before running, so we can eyeball it.

### Part B — Prevent recurrence (resolver hardening + DB constraint)

1. **Resolver fallback** in `supabase/functions/get-microsite-page/index.ts` — switch from `.maybeSingle()` (which fails on dupes) to a query that orders by `(microsite_url NULLS LAST, updated_at DESC)` and takes `.limit(1)`. If dupes ever reappear, readers still get a working page.

2. **Unique constraint** so this can never silently happen again:
   ```sql
   ALTER TABLE author_nodes
     ADD CONSTRAINT author_nodes_author_node_unique UNIQUE (author_id, node_id);
   ```
   This will fail loudly the next time a generator tries to INSERT a duplicate (we'll see the error in edge function logs immediately, instead of silently corrupting the reader experience).

3. **`author-stats` recount** — once dupes are gone, the "28/28" counter and BookHub progress will agree (the stats function currently counts both rows).

## Then — resume Audit #5 (Steps 1–7)

Once Part A+B are deployed, I re-run my scoring pass against the live site. With nodes resolvable, I score each page on the 8-check rubric:
1. HTTP status / load time
2. Title tag (not generic)
3. No placeholder leaks (`[AUTHOR NAME]`, `{{`, `undefined`, `example.com`)
4. Pauline + SUCKcess personalisation
5. CTA presence
6. No broken images
7. No console / network errors
8. Mobile (375×812) — no overflow, all CTAs tappable

Output: per-page scorecard table, prioritised fix queue, then implement fixes for anything <7/8.

## Open question — none, this is unblocked

The data fix is a delete of 28 redundant rows where every "winner" is unambiguously identifiable. Safe to proceed.

## Files / changes

- **Migration** — delete 28 duplicate rows for `pauline-teo`; add unique constraint on `(author_id, node_id)`.
- **`supabase/functions/get-microsite-page/index.ts`** — replace `.maybeSingle()` with ordered `.limit(1)` so the resolver is dupe-tolerant.
- **`supabase/functions/author-stats/index.ts`** — already updated last sprint; will re-verify counts after dedup.
- **No changes** to UI components in this step — Part A+B alone restore all 24 microsites.

## Why this comes first

Without the dedup + resolver fix, every other "fix the title tag" or "fix a CTA" task is invisible to readers because the page never loads. This single fix unblocks the **entire** audit and also explains the dashboard 28/28 counter mismatch.
