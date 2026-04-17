

## Fix BP-03 book title display + ABBY review copy

Two small targeted edits to `src/components/dashboard/builders/bp03/BP03Builder.tsx`.

### Fix 1 — Book title shows "your book" on first render

**Root cause**: On first render, `useAuthorBook` is still loading (`isBookLoading=true`, `detectedBookTitle=""`), and the local `bookTitle` state hasn't been populated yet by the `useEffect` that queries `author_context`/`books`. The introduction string evaluates to `"your book"` and never updates reactively because the JSX uses string concatenation that's already been computed.

The JSX itself IS reactive (it re-evaluates on every render), so the real issue is purely that the literal "your book" flashes during the loading window before either source resolves. After loading, `detectedBookTitle` should populate.

**Fix**:
1. Hide the intro paragraph + button until `!isBookLoading` AND we have a resolved title (or context check finished). While loading, show a small "Loading your book details…" line instead of the misleading "your book" placeholder.
2. Also make the intro actively prefer `detectedBookTitle || bookTitle` (already correct), and add a `useEffect` that logs both sources for verification.

Concrete change in step 0 render block (around lines 257–283):
- Wrap the intro in `{!isBookLoading && (detectedBookTitle || bookTitle) ? (…intro…) : !isBookLoading && hasContext === false ? (…BookProfileQuickForm…) : (<p>Loading your book details…</p>)}`

### Fix 2 — Review copy mentions "30-day email sequence"

**Location**: Line 435, inside `ReviewStep`'s ABBY message:
> "You have {totalPosts} social posts across 4 platforms, a 30-day email sequence, and a full outreach kit"

**Fix**: Replace with:
> "You have 20 social posts across 4 platforms (LinkedIn, Instagram, Facebook, X) plus 3 outreach email templates — all personalised to your book. Review everything below, then click Activate."

Also fix `totalPosts` math: BP-03 now generates 5 posts × 4 platforms = 20, not 30 × 4. Hardcode `20` in the copy (cleaner than recomputing) since the new edge function is fixed at 5/platform.

### Out of scope
- The ZIP download still references `30_day_email_sequence.txt` and the README still mentions a 30-day sequence + 120 posts. Those are now stale because the email sequence was removed from BP-03 in Sprint 35b. I'll also clean these up so the downloaded kit matches reality:
  - Remove the email_sequence folder from the ZIP (the `if (content.email_sequence?.length)` block becomes a no-op since the field is no longer generated, but leaving dead code is risky — remove it).
  - Update README to: "20 posts across 4 platforms (5 per platform)" + "3 outreach templates (podcast, media, review)" + remove the email-sequence line.

### Files touched
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` (3 small edits: intro gate, ReviewStep copy, ZIP cleanup)

### Phasing
One shot — all changes in a single file edit.

