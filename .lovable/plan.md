

## Show all of an author's live offerings on the book microsite

### What's actually broken

The book microsite (`/pauline-teo/invest-like-buffett-for-parents`) only queries 8 product tables (`workbooks`, `home_study_courses`, `audiobooks`, `courses`, `coaching_packages`, `podcasts`, `speaking_topics`) filtered by `book_id`. For Pauline, **all 8 tables are empty** — every product she has built lives in the `author_nodes` table (Workbook BP-06 live, Audiobook BA-11 live, Lead Magnet BP-02 live, Home Study BP-07 live, 1-on-1 Coaching YR-19 live, plus 13 more). The book page never reads `author_nodes`, so the "Go Deeper" section stays empty and only the Amazon buy link shows.

Compounding the issue: `author_nodes` rows have **no `book_id` column** — they're author-level. So we can't naively attribute every node to every book or both of Pauline's books would show identical offerings (which is mostly correct for her case, but wrong for a future author with two unrelated books).

### What you'll see after

The "Go Deeper with {Book Title}" section on `/pauline-teo/invest-like-buffett-for-parents` will list every live product card:

```
Workbook ($2.99)            Audiobook ($14.99)         Home Study Course
Lead Magnet (Free)          1-on-1 Coaching ($2,997)   Group Coaching ($1,997)
Membership ($27)            Online Course ($297)       Big Ticket ($12,000)
Keynote Speaking            Corporate Training         Mastermind ($5,000)
Retreat ($3,000)            Certification ($3,500)     Conference ($497)
Webinar                     Podcast                    Press
Affiliates                  Bundles                    JV Partners
Fundraising                 Sponsors
```

Each card links to its existing public microsite (e.g. Workbook → `/pauline-teo/workbook`, Coaching → `/pauline-teo/coaching`). Cards that have no public page (BP-01 Email, BP-03 Social, BP-08 Special Editions, BP-09 Book Sales) are **excluded** — these are library-only / off-platform.

### Code changes

**`src/pages/AuthorBookPage.tsx` — `loadBookPage()`**

After the existing `Promise.all` block, add a parallel query to `author_nodes`:

```ts
supabase
  .from("author_nodes")
  .select("node_id, node_name, personalised_name, status, microsite_url, payment_link, price_usd, currency, content_json, book_id")
  .eq("author_id", authorProfileId)   // see attribution rule below
  .in("status", ["live", "published_pending_ghl"])
```

`authorProfileId` = `profile.id` from the existing `author_profiles` lookup (already available higher in the function).

**Per-book attribution rule** (mirrors the recent `author-stats` fix):

- If a node row has `book_id` set AND it matches `bookData.id` → show on this book's page.
- If a node row has `book_id = null` → it's an author-level offering. Show it on the **primary book** (oldest by `created_at`) only. We already fetch `allBooksRes` ordered by `created_at desc`; do one extra check `bookData.id === oldestBookId` to decide.
- This means Pauline's 28 author-level nodes appear on Be SUCKcessful (her oldest book). They will NOT appear on Invest Like Buffett until either she explicitly tags them with that `book_id` later, OR we move attribution to "show on every book" (see Open question below).

**Mapping author_nodes → ProductLink cards:**

Build a small table inside `loadBookPage`:

```ts
const NODE_TO_PRODUCT: Record<string, { type: string; label: string; route: string }> = {
  "BP-02": { type: "leadmagnet", label: "Free Assessment", route: "free-gift" },
  "BP-05": { type: "webinar", label: "Webinar", route: "webinar" },
  "BP-06": { type: "workbook", label: "Workbook", route: "workbook" },
  "BP-07": { type: "homestudy", label: "Home Study Course", route: "home-study" },
  "BA-10": { type: "onlinecourse", label: "Online Course", route: "online-course" },
  "BA-11": { type: "audiobook", label: "Audiobook", route: "audiobook" },
  "BA-12": { type: "membership", label: "Membership", route: "membership" },
  "BA-13": { type: "groupcoaching", label: "Group Coaching", route: "group-coaching" },
  "BA-14": { type: "podcast", label: "Podcast", route: "podcast" },
  "BA-15": { type: "press", label: "Press & Media", route: "press" },
  "BA-16": { type: "affiliates", label: "Affiliate Programme", route: "affiliates" },
  "BA-17": { type: "bundles", label: "Upsells & Bundles", route: "bundles" },
  "BA-18": { type: "jv", label: "JV Partners", route: "partners" },
  "YR-19": { type: "coaching", label: "1-on-1 Coaching", route: "coaching" },
  "YR-20": { type: "vip", label: "Big Ticket", route: "vip" },
  "YR-21": { type: "speaking", label: "Keynote Speaking", route: "speaking" },
  "YR-22": { type: "corporate", label: "Corporate Training", route: "corporate-training" },
  "YR-23": { type: "mastermind", label: "Mastermind", route: "mastermind" },
  "YR-24": { type: "retreat", label: "Retreat", route: "retreat" },
  "YR-25": { type: "certification", label: "Certification", route: "certification" },
  "YR-26": { type: "conference", label: "Conference", route: "conference" },
  "YR-27": { type: "fundraising", label: "Fundraising", route: "fundraising" },
  "YR-28": { type: "sponsors", label: "Sponsors", route: "sponsors" },
};
// BP-01, BP-03, BP-08, BP-09 deliberately omitted — no public page.
```

For each qualifying node row, push a `ProductLink`:

```ts
{
  type: NODE_TO_PRODUCT[n.node_id].type,
  title: n.personalised_name || NODE_TO_PRODUCT[n.node_id].label,
  route: NODE_TO_PRODUCT[n.node_id].route,
  price: n.price_usd ? `$${Number(n.price_usd).toLocaleString()}` : undefined,
  description: undefined, // node cards don't have curated descriptions
}
```

**Deduplication:** if the same node also has a row in one of the existing 8 product tables (e.g. BP-06 Workbook also lives in `workbooks`), prefer the product-table row (richer description + cover image). Implement by building a `Set<string>` of `route` values pushed from product tables first, then skip any node row whose route already appears.

**Link target:** existing markup uses `/${authorSlug}/${bookSlug}/${p.route}`. For node-sourced cards we want `/${authorSlug}/${p.route}` instead (the public node microsite isn't book-scoped). Add an optional `external?: boolean` flag on `ProductLink` (or simpler: `linkTo: string`) so the renderer in lines 686-690 uses the correct URL.

**Icons + labels:** extend `PRODUCT_ICONS` and `PRODUCT_LABELS` (lines 78-92) with the new types so cards render with the right icon (Sparkles for leadmagnet, Mic for podcast, Users for coaching/groupcoaching/mastermind, Headphones for audiobook, Package for bundles, etc.). Reuse icons already imported (`Sparkles`, `Users`, `Headphones`, `Mic`, `GraduationCap`, `BookOpen`).

### Files touched

- `src/pages/AuthorBookPage.tsx` — add `author_nodes` fetch, attribution + dedup logic, `NODE_TO_PRODUCT` map, `linkTo` field on `ProductLink`, extend icon/label maps, render uses `linkTo`.

### Validation

1. `/pauline-teo/invest-like-buffett-for-parents` — Go Deeper section is **empty** (because Be SUCKcessful is her oldest book and gets the author-level nodes). This is technically correct given current data but probably not what you want long-term — see Open question.
2. `/pauline-teo/be-suckcessful-` — Go Deeper section shows ~22 cards (every live node with a public page). Each card links to the right `/pauline-teo/<slug>` URL.
3. `/felicia-tan/to-baby-with-love` — unchanged (Felicia has no live nodes).
4. Owner preview while logged in as Pauline — same behaviour, no extra cards leak.

### Open question (one decision needed before I code)

The data shows `author_nodes` has **no `book_id`** column. With the rule above, only Pauline's oldest book gets the offerings listed. Two reasonable alternatives:

**Option A (proposed above):** attribute author-level nodes to the oldest book only.
**Option B:** show every author-level node on **every** book page. Simpler, and matches reality for most solo-niche authors who position the same offerings around any of their books. For Pauline's two parallel businesses (Suckcess vs Buffett-for-Parents) it would mean both pages show the same product strip.

Recommend **Option B** — most authors will want their full offering visible regardless of which book the reader landed on, and the per-book microsite still has its own hero, description, formats and Amazon link to differentiate. Confirm B and I'll code it; otherwise I default to A.

