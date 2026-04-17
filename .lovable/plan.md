
## Fix BP-03 — Resume state, book title resolution, remove Email tab

Three targeted edits to `src/components/dashboard/builders/bp03/BP03Builder.tsx`. Data already verified correct in DB (Pauline's BP-03 = `content_ready`, ctx & books titles = "Be SUCKcessful"). Bugs are all in the React layer.

### Bug 1 — Step resets on navigate-back (CRITICAL)

Mount logic at lines 89–106 already handles `content_ready` → `step=2` and `live` → `step=3`. But it gates on `node.content_json` being truthy AND status matching. If the node row exists but `content_json` is empty/null (or status is `generating`), the resume falls through and `step` stays at 0. Also: there's no resume for the rare `generating` status (user closed tab mid-gen).

**Fix**:
- Broaden the resume to: if `node.status === "live"` → step 3 + activated. Else if `node.status === "content_ready"` AND `content_json` present → step 2. Else if `node.status === "generating"` → step 1 (and re-attach progress poll).
- Add `console.log("[BP-03 mount]", { status, hasContent, step })` for verification.
- Run the resume effect AFTER the book-context block (already does) but ensure `setStep` happens regardless of `hasContext` resolution.

### Bug 2 — "your book" placeholder still flashes

Mount queries `author_context.author_id = authorId` (author_profiles.id) ✓ — works for Pauline. `useAuthorBook` queries `books.author_id = auth.uid()` ✓ — also works. Both should populate. The visible 'your book' is either (a) a flash before load completes, or (b) appearing inside ReviewStep where `bookTitle` prop falls through to "your book" because step transitioned to 2 before local `bookTitle` state populated (race: line 89 query for node fires in parallel with line 61 ctx query, and if node returns first with content_ready, `step=2` renders ReviewStep before `setBookTitle` resolves).

**Fix**:
- Restructure mount: `await` all three queries (profile, ctx/books, node) sequentially OR at minimum set `bookTitle` BEFORE setting `step=2`.
- Add `console.log("[BP-03 title resolution]", { detectedBookTitle, localBookTitle, hasBook, isBookLoading })` after each set.
- Strengthen ReviewStep prop chain: `bookTitle={bookTitle || detectedBookTitle || "your book"}` is already correct, but we'll add a fallback to the node's stored content (some legacy gens stored `book_title` in `content_json`).

### Bug 3 — Email Sequence tab still visible

Lines 431, 435–437 (TabsList) and 474–487 (TabsContent value="emails") still render the Email Sequence tab. Removed in copy/ZIP last sprint, but the UI tab was missed.

**Fix**:
- Change `TabsList` to `grid-cols-2`.
- Delete the `<TabsTrigger value="emails">` (lines 435–437).
- Delete the entire `<TabsContent value="emails">` block (lines 474–487).
- Delete the now-unused `EmailCard` component (lines 564–604) and the `Mail` import.
- Update Outreach tab description (line 493): "These 5 templates" → "These 3 templates" to match actual generation count.

### Files touched
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` (single file, ~5 small edits)

### Out of scope
Other BP builders (this report is BP-03 only). No DB changes. No edge function changes.

### Phasing
One shot — single file.
