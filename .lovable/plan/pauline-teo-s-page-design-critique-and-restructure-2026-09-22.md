# Pauline Teo's page: design critique and restructure

## What's wrong (from a visitor's point of view)

I walked the whole page (10,000 pixels tall, 13 sections). The visuals are fine; the **logic** is broken. A visitor cannot tell what to do next, because the same handful of offers is shown to them four separate times under four different headings, in four different formats, at four different prices.

**1. The same things are sold over and over.**
"Be SUCKcessful Collective" appears in Work With Me, again in "Learn from Pauline Teo", again in "Resources / Services & Expertise". The Certification, the Mastermind, the Corporate Training and the Catalyst Intensive each appear twice. A visitor reads the page as "I've already seen this" and stops trusting the page.

**2. Prices contradict each other.**
The top bar says $4.99. The book itself is $8.99. The Collective is "From $17" in one section and enquiry-only in another. The Certification is "From $2,000" in one place and "$3500 USD" in another. Three different price formats are used ($47, From $17, $2997 USD). Any single mismatch destroys trust in all of them.

**3. There is no single path.**
Four sections all claim to be the next step: Work With Me, Learn from, Resources by, Events. Nothing tells a first-time reader "start here, then this". The one "Start Here" hint is buried two thirds down the page.

**4. The book is not the spine of the page.**
The books section is the 5th section, after a quiz. The featured book at the top is the one with no price, no Amazon link and no bestseller proof, while the actual #1 bestseller sits further down. The page is supposed to sell the book.

**5. Back-office items are shown to readers.**
Events includes "Fundraising" and "Sponsorship and Exhibitor Programme" — these are partner/sponsor matters, not reader offers, and they sit in the same grid as her retreat.

**6. Small credibility leaks.**
Repeated identical taglines ("Every Master Was Once a Disaster" on six cards), an emdash in the Work With Me intro (against our house style), "Related Authors" pushing visitors off her page before she has asked for anything.

## The restructure

One page, one story, each thing said once:

```text
1  Hero          Photo + the bestseller + "Get the Book" + free starter kit
2  Proof         Amazon bestseller screenshots, rating, reviews
3  Books         All her books, bestseller first
4  About         Who she is, the framework
5  Start free    The quiz / starter kit (one free entry point)
6  Work With Me  THE single offer ladder: free -> low -> deeper -> enterprise
7  Testimonials  Readers' words
8  Events        Only real public events (retreat, live)
9  Subscribe     Email capture
10 Related       Other authors, last
```

Concretely:

- **One offers section.** "Work With Me" becomes the only place offers are listed. "Learn from", "Resources by / Services & Expertise" and the duplicate event cards stop rendering anything that Work With Me already shows — deduplicated by title, not just by internal id.
- **Books move above the quiz** and lead with the bestseller, so the book is the spine of the page.
- **One price format everywhere**: `$47`, `$497`, `$2,000` — no "From", no "USD" suffix, and high-touch engagements show no price at all (already done). The top bar drops its price so it can never contradict the book page.
- **Reader-only events.** Fundraising and sponsorship cards are removed from the public page; the Events section shows only the retreat and the live conference, and hides itself when there are none.
- **One "Start here" line** at the top of Work With Me, not buried mid-page.
- **Copy hygiene**: no emdashes, and cards with an identical tagline to the one above them drop the repeated line.

This structure holds for every author page, not only Pauline's.

## Technical notes

- `src/pages/AuthorSite.tsx`: build one `offerRegistry` (normalised title key) as the single source for the page; `AuthorWorkWithMe` consumes it and marks every title it rendered; `AuthorLearnSection`, `AuthorServicesSection` and `AuthorEventsSection` receive the used-title set and filter against it, rendering null when empty. Reorder the section JSX to the sequence above. Extend the public exclusion list with the fundraising/sponsorship nodes (YR-27, YR-28) and drop the price from `buyCta`.
- Featured-book pick: score by bestseller badges/proof, then price + amazon_url, then newest `published_at`, keeping an explicitly curated `author_context` book as an override.
- Price formatting: one shared `formatOfferPrice()` used by every card component so "From $17" / "$2997 USD" / "$47" can't diverge.
- Copy: strip the emdash in the Work With Me intro; suppress a card tagline identical to its section's previous card.
- No database or schema changes. The third book is added through the portal.
