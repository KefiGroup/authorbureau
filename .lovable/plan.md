
# Final microsite cleanup — root causes & exact fixes

I traced each of the 6 remaining issues to specific code paths and database rows. The previous sprint's migrations were correct as far as they went, but several issues live in different code paths or different database columns than we patched. Here's the plan.

---

## Issue 1 — Hero "bio" still shows the Amazon breadcrumb

**Root cause (NEW finding, different from last sprint):**
The breadcrumb text is **not** coming from `books.author_bio` (we cleared that). It's coming from `books.genre`. The "Be SUCKcessful" row in `public.books` has:

```
genre = "Kindle Store › Kindle eBooks › Religion & Spirituality › Spirituality › Personal Growth › Spiritual Healing"
```

`AuthorHeroSection.tsx` (lines 79–87) auto-builds the one-liner under the name as:

```
"<Author> is a bestselling author of N books in <comma-joined genres>."
```

So the breadcrumb pollutes the hero through `books.genre`, not `author_bio`. The author's real `author_profiles.bio_short` is correct in the database — it just isn't used by the hero one-liner.

**Fix (two parts):**

1. **Code (`AuthorHeroSection.tsx`):** Switch the hero subtitle to prefer `author.bio_short` (or the author's first-sentence bio) and fall back to the genre-based one-liner only when `bio_short` is empty. Also sanitize each genre value before joining: drop any genre containing `›`, `Kindle`, `Amazon`, or longer than ~40 chars (these are breadcrumb leaks, never real genres).

2. **Data backfill migration:** Replace the polluted `books.genre` value for "Be SUCKcessful" with a clean comma-separated list derived from `author_profiles.genres` (or null it out). One-shot UPDATE limited to rows whose `genre` matches `'%›%'` or `'%Kindle Store%'` so we don't touch legitimate values.

---

## Issue 2 — "What's inside the book" says "From Invest Like Buffett for Parents" instead of "From Be SUCKcessful"

**Root cause:**
In `AuthorSite.tsx` (lines 174–194) the highlights pipeline does this:

1. Read `author_context.key_frameworks` + `unique_insights`.
2. Pauline's `author_context` row exists and is bound to `book_id = Be SUCKcessful`, but **both arrays are empty** (`frameworks_count: 0`, `insights_count: 0`).
3. Falls back to `enriched[0].description`, where `enriched[0]` is the **most recently created book** (Invest Like Buffett for Parents) per the `order by created_at desc` on line 125.
4. Sets `whatsInsideSourceBookId = enriched[0].id` → wrong book attribution.

So the `whatsInsideSourceBookId` fix from the previous sprint was real but never triggered because frameworks/insights were empty.

**Fix (`AuthorSite.tsx`):**

Tie the "What's inside" section to the book referenced by `author_context.book_id`, **not** to `enriched[0]`:

```text
1. Resolve preferredBookId = author_context.book_id (already loaded in contextRes).
2. const sourceBook = enriched.find(b => b.id === preferredBookId) ?? enriched[0];
3. Build highlights from frameworks + insights as today.
4. If both arrays are empty, derive bullets from sourceBook.description (NOT enriched[0]).
5. Set whatsInsideSourceBookId = sourceBook.id.
```

Result: "From *Be SUCKcessful*" renders correctly, and any future author with a curated `author_context` automatically anchors the section to their lead book.

---

## Issue 3 — "Podcast section says From Invest Like Buffett for Parents"

**Root cause (clarification):**
On the live site I could not find any "From Invest Like Buffett for Parents" inside the podcast block. The only occurrence of that phrase on the page is in the "What's inside the book" section (Issue 2), which renders **directly under** the books strip and visually appears between the book grid and the podcast strip. That is the line the user sees.

The podcast itself shows correctly: `"Be SUCKcessful with Pauline Teo — Every Master Was Once a Disaster"`. The DB confirms the BA-14 podcast node is correctly linked to `book_id = Be SUCKcessful`.

**Action:** Issue 2's fix removes the misleading line. No additional podcast change required. I'll verify with the browser tool after deployment to confirm nothing else mis-attributes the podcast.

---

## Issue 4 — Four products show "Coming Soon — Notify Me" (Podcast, Media Kit, Affiliate Programme, Revenue Share)

**Root cause:**
These nodes (BA-14, BA-15, BA-16, BA-18) genuinely have **no price** (`price_usd = null`, no fallback in `content_json`). `ProductCTA.tsx` correctly classifies them as "not for sale" and renders the waitlist. They aren't transactional products — they're inquiry / partnership / discovery surfaces.

**Fix (`AuthorProductCard.tsx`):**

Expand the `isHighTouchInquiry` rule so that **any node without a price that has a `delivery_url`** routes to "Learn More" (linking to the microsite), not "Coming Soon". For affiliate/JV nodes, the CTA should be "Apply" or "Partner With Us" rather than "Notify Me". Specifically:

- `BA-14` (Podcast) → "Listen / Subscribe" linking to `delivery_url` (or the author's podcast streaming URLs from `author_profiles`).
- `BA-15` (Media Kit) → "View Media Kit" → `delivery_url`.
- `BA-16` (Affiliate) → "Join Programme" → `delivery_url`.
- `BA-18` (JV/Revenue Share) → "Partner With Us" → `delivery_url`.

When `delivery_url` is present we never show "Coming Soon" — the product *is* live; it's just not transactional. Coming-Soon stays reserved for paid products with no Stripe-ready price.

This is a small extension to the 4-state matrix in `ProductCTA`: add a 5th state "informational" triggered when `!hasPrice && delivery_url`.

---

## Issue 5 — Footer missing Instagram & Facebook icons

**Root cause:**
The footer component already renders Instagram and Facebook icons conditionally (`AuthorMicrositeFooter.tsx` lines 14–15). They don't appear because Pauline's `author_profiles` row has `instagram_url = NULL` and `facebook_url = NULL`. Nothing to fix in code — this is a data gap, not a bug.

**Fix:**
- Add a small "Add your social links" notice in the **author dashboard** Profile editor highlighting the new `facebook_url`, `podcast_*` fields (already in the schema from last sprint).
- For Pauline specifically, we can't invent URLs. I'll surface this in the deliverable summary so she can paste them in.

No code change required for the footer; it will light up automatically when the URLs are added.

---

## Issue 6 — Workbook price renders as "usd 2.99" instead of "$2.99 USD"

**Root cause:**
`AuthorBookFormatsList.tsx` line 26:

```ts
const sym = (currency || "USD") === "USD" ? "$" : `${currency} `;
```

The workbook stores its currency lowercased (`"usd"`), so `"usd" === "USD"` is false → prefix becomes `"usd "`.

**Fix:** normalize currency to uppercase before comparing, and append the ISO code after the amount for clarity:

```ts
const code = (currency || "USD").toUpperCase();
const prefix = code === "USD" ? "$" : "";
return `${prefix}${value.toFixed(2)}${prefix ? " USD" : " " + code}`;
```

Apply the same normalization to `AuthorProductCard.formatPrice` for consistency (already uppercases — verify and align string format to "$X.XX USD").

---

## Implementation steps (single sprint)

1. **Code:**
   - `src/pages/author-site/AuthorHeroSection.tsx` — prefer `bio_short`, sanitize genre list.
   - `src/pages/AuthorSite.tsx` — tie `whatsInsideSourceBookId` to `author_context.book_id`.
   - `src/components/commerce/ProductCTA.tsx` + `src/components/public/AuthorProductCard.tsx` — add "informational" CTA state for no-price-but-has-delivery-url nodes; per-node-type CTA labels (Listen, View Media Kit, Join Programme, Partner With Us).
   - `src/pages/author-site/AuthorBookFormatsList.tsx` — fix currency formatter ("$2.99 USD").

2. **Data migration (single SQL file):**
   - `UPDATE public.books SET genre = NULL WHERE genre ILIKE '%›%' OR genre ILIKE '%Kindle Store%' OR genre ILIKE '%Amazon%';` (cleans the breadcrumb pollution at the source so it can never leak again).

3. **QA on `/pauline-teo`** with the browser tool:
   - Hero subtitle reads from `bio_short`.
   - "What's inside the book" → "From Be SUCKcessful".
   - Podcast/Media Kit/Affiliate/JV cards show actionable CTAs, not "Coming Soon".
   - Workbook price reads "$2.99 USD".

4. **Deliverable note to user:** Pauline's IG/FB URLs aren't in the database. She can add them via Account Settings → Profile and they'll appear in the hero + footer automatically.

No schema changes required; all new behavior uses columns added in the previous sprint.
