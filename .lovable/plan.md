
## Sprint 39 Phase 1+2 Patch — Approved Implementation

### Fix 1 — Lead Capture (`/[slug]`)
1. **`src/components/LeadCaptureForm.tsx`** — add optional `redirectTo?: string` prop; import `useNavigate`; on success, if `redirectTo` set, `navigate(redirectTo)` instead of showing inline success state.
2. **`src/pages/author-site/AuthorSubscribeSection.tsx`** — pass `showMessage={false}` and `redirectTo={`/${authorSlug}/thank-you`}` to `<LeadCaptureForm>`.

### Fix 2 — "Unknown Book" in Review & Publish
3. **`supabase/functions/builder-draft-state/index.ts`** — after building `titleMap`:
   - Collect `authorIds` from drafts.
   - Query `books` by `author_id` ordered by `created_at asc`, build `authorPrimaryBook[author_id] = { title }` (first book per author).
   - In the enrichment map: `bookTitle = titleMap[d.book_id] || authorPrimaryBook[d.author_id]?.title || ""`.
   - Ensure each draft row pushed earlier carries `author_id` (verify and add where missing).
4. Redeploy `builder-draft-state`.

### Verification
- `/pauline-...` Stay Connected = Name + Email only → submit → redirects to `/pauline-.../thank-you`.
- `/dashboard?section=review-products` for Pauline → all 4 products show "Be SUCKcessful".
- No console errors. No Phase 3 builders touched.
