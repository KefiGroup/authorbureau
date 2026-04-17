

## Root cause analysis

All 3 bugs share one root cause: **`author_context` is empty for Pauline**, and the `books` fallback uses inconsistent ID resolution.

Verified data state for Pauline (`pl@paulineteo.com`):
- `auth.users.id` = `ef23c521-9cce-4d86-9128-dc687748b65b`
- `author_profiles.id` = `92326a2f-3ed0-4873-a8cf-7a0b1350995a` (this is what builders pass as `authorId`)
- `books` row exists: title = "Be SUCKcessful", `author_id` = `ef23c521...` (auth user_id) ✓
- `author_context` rows for her: **0** (empty) — this is why everything breaks

Schema constraints confirmed:
- `author_context.author_id` → FK to `author_profiles.id` (NOT auth.users.id)
- `author_context` RLS: `author_id IN (SELECT id FROM author_profiles WHERE user_id = auth.uid())` ✓ (the form's upsert WILL pass RLS)
- `books.author_id` = auth.users.id, RLS: `auth.uid() = author_id` ✓

### Why each bug happens

**Bug A — Form save "fails"**: The upsert actually succeeds (RLS passes), but `BookProfileQuickForm.handleSubmit` calls `onComplete(title)` which in BP-04/05/08/09 only sets `setBookTitle(t)` and `setHasContext(true)`. In BP-04 the gate is `!isBookLoading && hasContext !== null && !hasBook && !hasContext` — after onComplete `hasContext=true` so the form correctly disappears, BUT the user must then click "Build My Website" manually. In BP-05/08/09 the gate is `!isBookLoading && !hasBook` — `hasBook` comes from `useAuthorBook` which doesn't refetch, so the form never disappears even after save. **That's the "form resets" symptom.**

**Bug B — "your book" placeholder**: For Pauline, `useAuthorBook` queries `books` with `author_id = auth.uid()` which DOES return "Be SUCKcessful". So `bookTitle` from the hook should be populated. BUT the local `bookTitle` state (line 42) starts empty and is only set inside the `useEffect` that runs `eq("author_id", authorId)` against `author_context` — which is empty — then falls back to `books.eq("author_id", profile?.user_id || authorId)` which works. **Hypothesis**: when the page first renders, both local `bookTitle` AND hook `detectedBookTitle` are empty (loading), so the literal "your book" flashes. After load, `detectedBookTitle` should populate. If it stays empty, `useAuthorBook`'s `.maybeSingle()` is throwing because there are multiple books rows. Need to verify and fix to handle multi-book case.

**Bug C — BP-04 generates wrong content**: `generate-bp04-website` reads ONLY from `author_context` (empty for Pauline), so `bookTitle = "your book"`, `coreThesis = ""`, `audiencePersona = "general readers"`. AI is told genre is "Non-fiction" (from author_profiles.genres) and generates generic finance content based on hallucination. **Fix: add `books` fallback in the edge function.**

### The Fix

**1. `BookProfileQuickForm.tsx`** — add `console.log` of upsert results, and after success call `onComplete` AFTER waiting briefly so parent can re-trigger book detection. No structural changes needed (upsert logic is already correct for `author_context` since RLS uses `author_profiles.id` and the form passes `authorId`= author_profiles.id).

**2. All 9 BP builders** — change the gate from `!hasBook` to `!hasBook && hasContext === false` so once the form fires `setHasContext(true)`, the form unmounts immediately and the intro+button render. Also auto-trigger `handleGenerate()` after `onComplete` fires so the user doesn't have to click twice. Strengthen the title display to: `{detectedBookTitle || bookTitle || titleFromForm || "your book"}`.

**3. `useAuthorBook.ts`** — replace `.maybeSingle()` with `.limit(1)` then `[0]` to safely handle multiple book rows without throwing PGRST116. Add console log of the resolved title for debugging.

**4. `generate-bp04-website/index.ts`** — when `author_context` is empty, fall back to `books` table (resolve via `author_profiles.user_id`):
```ts
if (!context?.book_title) {
  const { data: profile } = await supabase
    .from("author_profiles")
    .select("user_id")
    .eq("id", author_id).single();
  const { data: book } = await supabase
    .from("books")
    .select("title, description, target_audience_persona, genre")
    .eq("author_id", profile.user_id)
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle();
  bookTitle = book?.title;
  coreThesis = book?.description;
  audiencePersona = book?.target_audience_persona ?? "general readers";
}
if (!bookTitle) throw new Error("No book found — please complete your book profile first.");
```
Also strengthen the system prompt to explicitly bind the AI to the provided book title and reject generic substitutes.

**5. Apply same fallback to `generate-bp03-social-media`** (and any other generators reading `author_context`) — same pattern, since Pauline-style users with `books` but no `author_context` will hit the same hallucination.

### Files touched
- `src/components/dashboard/builders/shared/BookProfileQuickForm.tsx` — add console.logs + return success signal
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — gate fix + auto-trigger
- `src/components/dashboard/builders/bp04/BP04Builder.tsx` — gate fix + auto-trigger
- `src/components/dashboard/builders/bp05/BP05Builder.tsx` — gate fix + auto-trigger
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — gate fix + auto-trigger
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — gate fix + auto-trigger
- `src/hooks/useAuthorBook.ts` — robust multi-row handling + log
- `supabase/functions/generate-bp04-website/index.ts` — books fallback + strict prompt (deploy)
- `supabase/functions/generate-bp03-social-media/index.ts` — books fallback (deploy)

### Out of scope
BP-06/07 and other generators (separate audit). Migration to backfill `author_context` from `books` (manual one-off, not in this fix). Pauline's missing `author_context` row will be auto-created the next time she opens any of the 5 BP builders touched here — OR we can run a one-off SQL backfill as part of this sprint to immediately unblock her.

### Recommended addition
Run a one-off backfill so Pauline (and any similar users) get an `author_context` row immediately:
```sql
INSERT INTO author_context (author_id, book_title, core_thesis, target_audience_persona)
SELECT ap.id, b.title, COALESCE(b.description, b.title), '{"description":"general readers"}'::jsonb
FROM author_profiles ap
JOIN books b ON b.author_id = ap.user_id
WHERE NOT EXISTS (SELECT 1 FROM author_context ac WHERE ac.author_id = ap.id);
```
This single migration solves Bug C immediately for ALL existing users without waiting for them to re-trigger the form.

### Phasing
- **Phase 1 (one shot)**: All 9 file edits + 2 edge-function deploys + 1 backfill migration. Small enough to ship together.

Approve to proceed?

