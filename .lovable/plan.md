
# Audit 3 + 4 — Data Integrity Follow-ups

Two small, surgical fixes from Audit 2's follow-up list. Both are low-risk and isolated.

## Audit 3 — `books.author_id` integrity

### Scope confirmed
Ran a full table scan classifying every `books.author_id` as `valid_profile_id` / `is_user_id` / `orphan`:

- **Valid (already pointing at `author_profiles.id`)**: 0
- **Pointing at `auth.users.id` instead** (silent bug): **7 books / 4 authors**
- **Orphans (no profile match either way)**: 0

The 7 affected rows:

| Author | Books |
|---|---|
| Bob Battista | Hemispheric Intelligence |
| Fasa Husain | The Trust API: The HealthTech Bridge |
| Felicia Tan | A Gift From Heaven, Lost And Found, To Baby With Love |
| Pauline Teo | Be SUCKcessful, Invest Like Buffett for Parents |

Every wrong value resolves cleanly through `author_profiles.user_id`, so the backfill is deterministic — no guessing, no multi-match.

`author_nodes.author_id` is **100% clean** (59/59 rows already store `author_profiles.id`). Only `books` is affected.

### Fix
1. Backfill all 7 rows in one statement:
   ```sql
   UPDATE public.books b
   SET author_id = ap.id
   FROM public.author_profiles ap
   WHERE ap.user_id = b.author_id
     AND ap.id <> b.author_id;
   ```
2. Re-run the classifier query to confirm zero `is_user_id` rows remain.

### Code-side guard (optional but cheap)
Searched the codebase: nothing in `src/` calls generators with `books.author_id` directly today (`useAuthorBook` already passes `author_profiles.id`). The bug only fires when an external caller (or this audit's curl) uses the wrong column. No code change needed; the data fix alone is sufficient.

---

## Audit 4 — Add `updated_at` to `author_nodes`

### Why
- Audit 2's first migration failed with `column "updated_at" does not exist`.
- Every other large table in the schema has it, and the project already has a generic `public.update_updated_at_column()` trigger function ready to attach.
- Useful for "last modified" displays, cache invalidation, and audit trails.

### Fix (one migration)
```sql
ALTER TABLE public.author_nodes
  ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill so existing rows show a sensible value
UPDATE public.author_nodes SET updated_at = COALESCE(activated_at, created_at, now());

CREATE TRIGGER trg_author_nodes_updated_at
BEFORE UPDATE ON public.author_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Code impact
Zero — `update_updated_at_column()` is the project's standard trigger and existing inserts/updates don't reference `updated_at`. New column is additive with a default.

---

## Execution order
1. Audit 3 SQL (data backfill via insert tool, since it's an UPDATE not a schema change).
2. Audit 4 migration (adds column + trigger).
3. Re-verify with the same classifier query and a `\d author_nodes` style schema check.
4. Append a short results section to `.lovable/audit-2-report.md`.

## Out of scope (intentionally)
- Adding a FK constraint `books.author_id → author_profiles.id`. Worth doing eventually but needs a separate audit to verify nothing inserts a `user_id` first (e.g. the upload flow). Will flag if found.
- Renaming or restructuring the column.
- Touching `author_nodes` data — already clean.

Reply **approve** and I'll execute both in default mode.
