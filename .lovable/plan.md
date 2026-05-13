# Sprint 63B Plan — BUG-3 root cause and fix

## Root cause
The issue is not a role-loading problem.

Two concrete backend problems showed up:

1. **No generated graphics are being persisted at all for Pauline’s BP-03 posts**
   - Current data check shows **21 BP-03 posts, 0 with `graphic_url`, 0 with `graphics`**.
   - That means the card never receives the data required to flip.

2. **The generator function has a fragile write path and hides failures**
   - `bp03-generate-all-graphics` updates `social_posts` but does **not check the update error**.
   - So it can appear to succeed even if the database write fails.
   - The function also reads `books.cover_url`, but this project’s `books` table exposes **`cover_image_url` instead**. That mismatch can break prompt enrichment and is a sign the function drifted from the live schema.

There is also a smaller frontend inconsistency:

3. **The card flip condition is inconsistent across views**
   - One render path flips only on `post.graphic_url`.
   - Another render path correctly uses `graphicVariants(post)`.
   - Even after backend persistence is fixed, this inconsistency can still cause false “Generate graphic” states.

## What I’ll change

### 1) Harden the graphic generator function
Update `supabase/functions/bp03-generate-all-graphics/index.ts` to:
- Use the correct live book column (`cover_image_url`) when loading cover art.
- Check and log the result of `social_posts.update(...)` instead of ignoring it.
- Return accurate counts only when database persistence succeeds.
- Emit explicit error logs for these stages:
  - book lookup
  - image generation
  - storage upload
  - `social_posts` update

### 2) Make the UI flip based on real available variants
Update `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` so both card render branches use the same rule:
- If `graphicVariants(post).length > 0`, show **Download graphic**
- Otherwise show **Generate graphic**

This removes dependence on legacy `graphic_url` alone.

### 3) Validate the fix end-to-end
After deploying the function:
- Trigger one single-post generation for BP-03.
- Confirm the function logs show a successful post update.
- Confirm the corresponding `social_posts` row now has `graphics` and `graphic_url`.
- Confirm the card flips from **Generate graphic** to **Download graphic** after reload.

## Technical notes
- No schema migration is planned unless validation reveals a real DB constraint issue.
- If the write still fails after error handling is added, I’ll inspect the exact DB error message and then prepare a narrow follow-up fix.
- Scope remains limited to BUG-3 only.