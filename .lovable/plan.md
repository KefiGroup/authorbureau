# Sprint — Counter regression + bio normalization

## Findings (verified against your DB)

I pulled Pauline's actual `author_nodes` rows. Here's ground truth before we change anything:

- **Pauline has 28 nodes with `status='live'` in the database.**
- Of those, **22 have `book_id = "Be SUCKcessful"`** and **6 have `book_id = "Invest Like Buffett for Parents"`**.
- Total = 28. So `22 + 6 = 28`.

This means two of your three reported issues need to be re-interpreted.

---

## Issue 1 — Real regression. Fix.

**Symptom:** "Products Built So Far" stat on the Build-My-Business page shows **0** for the whole portfolio, even though the per-book chips are non-zero.

**Root cause (confirmed):** `src/components/dashboard/build-my-business/BookSelectionView.tsx`, line 41:

```ts
const totalBuilt = 0;   // hardcoded
```

It never reads `centralStats.products.totalBuilt` (or any other source). The number was hardcoded to 0 when the portfolio summary was first scaffolded and was never wired up.

**Fix:** Pass `centralStats` into `BookSelectionView` and compute:

```ts
const totalBuilt = centralStats?.products?.totalBuilt ?? 0;
```

`centralStats` already exists upstream (`useAuthorStats`) — we just plumb it through `BuildMyBusiness` → `BookSelectionView`.

> Note on your wording: this stat lives on the **Build My Business** screen, not on the My Books cards. The per-book card counters in `MyBooks.tsx` already use `centralStats.products.perBook[bookId].total` correctly — that's why the inner Book Hub shows 22/28 properly. If you ARE seeing 0/28 on the My Books cards specifically, please grab a screenshot — I couldn't reproduce it from code reading.

---

## Issue 2 — Not actually a bug.

**Reported:** "Monetization Universe shows 28/28 but Be SUCKcessful only has 26 nodes built — should be 26/28."

**Reality:** Per-book counters and the Monetization Universe count different things:

| Where | What it counts | Pauline today |
|---|---|---|
| Book Hub badge ("26/28 for Be SUCKcessful") | Live nodes attributable to **this book** (book_id match + author-level nodes) | ~22–26 depending on which author-level nodes get attributed |
| Monetization Universe ("28/28") | All live nodes the **author** has built across **all** books | 28 (22 + 6) |

The Monetization Universe is an **author-wide** map, not a per-book map. 28/28 is correct: Pauline has activated all 28 streams across her two books. If we changed it to per-book it would always under-report for multi-book authors.

**Recommended action:** Leave the count alone. Add a one-line clarifier under the progress bar so this isn't confusing:

> `28 of 28 activated across all your books`

(Two-word change in `MonetizationUniverse.tsx` header copy.)

If you actually want it to show *only* the active book's count, that's a different design decision — say the word and we'll switch the data source. But it would drop to 22/28 for Be SUCKcessful and 6/28 for the other book, which is probably worse UX.

---

## Issue 3 — Bio still rendering "Specialist,who"

**Reality:** The DB stores `... Development Specialist,who previously ...` — literally no space before *or* after the comma. `stripHtml` already removes the space *before* punctuation but doesn't *insert* a space after when it's missing.

**Fix in `src/lib/stripHtml.ts`** (one extra line):

```ts
// Existing: collapse "word ,word" → "word,word"
.replace(/[ \t]+([,.;:!?])/g, "$1")
// New: ensure single space after sentence punctuation when followed by a letter
.replace(/([,.;:!?])([A-Za-z])/g, "$1 $2")
```

After fix, `Specialist,who` renders as `Specialist, who` everywhere (hero, About, cards, microsite — they all already pass through `stripHtml`).

We should also offer Pauline an "auto-clean bio" pass on save in `ProfileEditor`, but that's a separate sprint item — for now the runtime fix covers all rendering surfaces.

---

## Files touched

1. `src/components/dashboard/build-my-business/BookSelectionView.tsx` — accept `centralStats` prop, replace hardcoded `0`.
2. `src/components/dashboard/build-my-business/BuildMyBusiness.tsx` (or its parent) — pass `centralStats` down.
3. `src/components/dashboard/framework-dashboard/MonetizationUniverse.tsx` — append "across all your books" to the activated label.
4. `src/lib/stripHtml.ts` — add the post-punctuation space rule.

No DB migration. No edge-function changes. Three small text/prop diffs.

---

## Open question

Confirm before I implement:

- **Issue 2 wording:** Keep author-wide ("28 of 28 activated across all your books") **or** switch Monetization Universe to per-active-book counting (would show 22/28)? My recommendation is **keep author-wide** with the clarifier.
