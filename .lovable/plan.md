
## Root cause confirmed

The edge function is not failing because of timeout, missing AI secrets, or an early crash before error handling.

The exact error from the function logs is:

```text
insert or update on table "courses" violates foreign key constraint "courses_author_id_fkey"
Key (author_id)=(ef23c521-9cce-4d86-9128-dc687748b65b) is not present in table "users".
```

This happens when `generate-ba10-online-course` tries to insert into `public.courses`.

## What this means

BA-10 is resolving Pauline’s `author_profiles.user_id` as:

```text
ef23c521-9cce-4d86-9128-dc687748b65b
```

but that ID does not exist in the backend auth table, so the insert into `courses.author_id` fails on the foreign key.

Important: the failure happens after the AI work, during database persistence. So the long wait is the AI generation finishing, then the DB insert crashing.

## Why BA-10 breaks specifically

`public.courses.author_id` is designed to store the auth user ID, not the author profile ID.

BA-10 currently does this:

- receives `author_id` = author profile ID from the builder
- loads `author_profiles.user_id`
- uses that `user_id` as `courseOwnerId`
- inserts `coursePayload.author_id = courseOwnerId`

That is normally correct for the courses table schema, but this author profile is mapped to a stale/missing auth user ID, so BA-10 cannot save.

## Implementation plan

### 1) Fix the broken author mapping at the data layer
Create a backend migration or repair step that corrects Pauline’s `author_profiles.user_id` so it points to a real auth user record.

Target outcome:
- `author_profiles.id = 92326a2f-3ed0-4873-a8cf-7a0b1350995a`
- `author_profiles.user_id` must reference a real auth user
- that same valid auth user ID should remain the owner key used by `books`, `courses`, and other product tables

Without this repair, BA-10 will keep failing no matter how much the AI prompt is optimized.

### 2) Harden `generate-ba10-online-course` before the AI call
Update the function so it validates author mapping immediately after loading the profile:

- verify `author.user_id` exists
- verify that auth user exists before any AI generation starts
- if missing, return:
  ```json
  { "success": false, "error": "Author account mapping is invalid. Please contact support." }
  ```
- do this before calling the AI gateway so the user gets a fast actionable error instead of waiting 90–120 seconds

### 3) Keep the current pedagogy, but separate it from persistence failures
Do not remove the Bloom’s Taxonomy / Kolb framework just to fix this issue.

The logs show the current blocker is persistence, not AI response size.

Keep:
- 6-module Bloom progression
- Kolb stage per module
- learning objectives
- lesson outlines

Only trim prompt/output further if a later log proves an actual timeout or parse issue.

### 4) Preserve the intro-loading fix in BA10Builder
Keep the BA-10 UI changes that prevent:
- `Hi !`
- `'your book'`

No rollback is needed there; that part is already addressing a separate regression.

### 5) Improve BA-10 frontend error messaging for this specific backend failure
Update `BA10Builder.tsx` so if the function returns the mapping error, Abby shows a clearer message instead of the generic snag text.

Suggested user-facing copy:
- “Your author account needs to be re-linked before Abby can save this course. Please contact support.”

This avoids implying the AI generation itself failed.

## Files to update

- `supabase/functions/generate-ba10-online-course/index.ts`
  - add early auth-user existence validation
  - fail fast before AI generation
  - keep existing structured `{ success: false, error }` response shape

- backend migration / data repair
  - repair `author_profiles.user_id` for the affected author to a valid auth user ID

- `src/components/dashboard/builders/ba10/BA10Builder.tsx`
  - optionally map this specific backend error to a clearer Abby message

## Verification

After the repair and function hardening:

1. Open `/node-builder/BA-10`
2. Confirm intro resolves cleanly to Pauline + `Be SUCKcessful`
3. Click **Build My Course**
4. Expected result:
   - no long silent failure caused by invalid mapping
   - if mapping is still bad, the error returns quickly
   - if mapping is fixed, the course saves into `courses`, `course_modules`, and `course_lessons`
5. Confirm the generated course still includes:
   - Bloom progression
   - Kolb stages
   - learning objectives
   - modules and lessons
   - pricing and sales copy

## Summary

The exact root cause is a broken foreign-key owner mapping, not an edge timeout:

```text
courses.author_id -> ef23c521-9cce-4d86-9128-dc687748b65b
```

That ID is missing from the auth user table, so BA-10 crashes when saving the course. The fix is to repair the author’s `user_id` mapping and add a fast preflight validation in the edge function so this never burns AI time again.
