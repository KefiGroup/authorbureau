

## What's Not Updated

The fallback on line 62 of `WebsiteBlueprintPage.tsx` still shows `"your-slug"` when `author_slug` is null and `pen_name` is also null. But more importantly, even when `pen_name` exists, the slug shown in the UI is only a **derived display value** — it's never actually saved to the database unless the user manually edits it or goes through `save-book`. So the preview iframe and URL display keep showing the fallback.

## Common Name Problem

If two authors are both named "Pauline Teo", both would get `pauline-teo` as their slug. The `author_slug` column has a UNIQUE constraint, so the second one would fail silently. This needs a suffix strategy (e.g., `pauline-teo-2`).

## Plan

### 1. Auto-generate and persist slug on profile creation/update

In the edge function or a database trigger, when `author_slug` is null but `pen_name` is set:
- Generate slug from `pen_name` (lowercase, hyphenated)
- Check for collisions: if `pauline-teo` exists, try `pauline-teo-2`, `pauline-teo-3`, etc.
- Save the unique slug to `author_slug`

This will be done via a **database trigger** (`before insert or update`) on `author_profiles` so it works regardless of how the profile is created.

### 2. Update `save-book` edge function

Apply the same collision-aware logic when generating `author_slug` during profile upsert (line 128-132). Query for existing slugs with the same base and append a numeric suffix if needed.

### 3. Backfill existing profiles

Run a one-time migration that generates slugs for any `author_profiles` rows where `author_slug IS NULL` but `pen_name IS NOT NULL`, using the same collision-aware logic.

### 4. Remove "your-slug" fallback in UI

In `WebsiteBlueprintPage.tsx` line 62, change the fallback from `"your-slug"` to show a prompt like "Set up your author URL" instead, since the slug should now always be auto-generated.

## Technical Details

**Database trigger function:**
```sql
CREATE OR REPLACE FUNCTION generate_unique_author_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base_slug text; candidate text; counter int := 1;
BEGIN
  IF NEW.author_slug IS NOT NULL AND NEW.author_slug != '' THEN RETURN NEW; END IF;
  IF NEW.pen_name IS NULL OR NEW.pen_name = '' THEN RETURN NEW; END IF;
  base_slug := regexp_replace(lower(trim(NEW.pen_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM author_profiles WHERE author_slug = candidate AND user_id != NEW.user_id) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  NEW.author_slug := candidate;
  RETURN NEW;
END; $$;
```

**Backfill migration** runs a PL/pgSQL block that loops through null-slug profiles and assigns unique slugs.

**Frontend change**: Replace `"your-slug"` with empty string and show "Set your author URL" message when no slug exists.

