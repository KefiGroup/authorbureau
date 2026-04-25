## Why the Competitive Scan is empty

The market-research edge function ran successfully but Amazon's anti-bot blocked the bestseller scrape for the "Religion & Spirituality › Spirituality › Personal Growth › Spiritual Healing" Kindle category.

Edge function log (06:55:23Z):
> Market research completed for "Be SUCKcessful" — 3 sources, **0 Amazon products**, 1 competitor products

Because `amazonBestsellers.products.length === 0`, the `amazonBestsellers` field is set to `null` server-side. In `MarketSnapshot.tsx`:
- The header + tab bar render (because `marketIntelligence` exists)
- The **Competitive Scan** tab body renders only `<PriceDistribution>` and `<TopBestsellers>`, both gated on `hasBestsellers` → both render nothing
- The **Live Market Trends** tab is also gated on `hasKeywords` (derived from Amazon data) → falls back to raw markdown only if `marketIntelligence` exists

Result: a header with two empty tabs.

## Fix

Two changes in `src/components/dashboard/book-hub/MarketSnapshot.tsx`:

### 1. Show a useful Competitive tab when Amazon scrape fails

When `hasBestsellers` is false, render a fallback panel inside the Competitive tab that shows:
- A short note: *"Amazon bestseller scrape was blocked for this niche category. Showing competitor digital products instead."*
- The `competitorProducts` list (Gumroad / Udemy / Teachable links Abby found via Perplexity) — title + platform badge + external link.
- If `competitorProducts` is also empty, show: *"Abby couldn't pull live competitor pricing for this sub-niche. Try refreshing or check the Live Market Trends tab for genre intelligence."* with a refresh button hooked to `useMarketResearch.refetch`.

### 2. Improve the Live Market Trends fallback

When `hasKeywords` is false but `marketIntelligence` exists, the current markdown dump is hard to read. Wrap it in the same styled container the keywords use, with the citations list (`marketCitations`) rendered as clickable source chips below.

### 3. Pass refetch into MarketSnapshot

Update `BookHubOverview.tsx` (the only caller) to pass the `refetch` callback so the fallback's "Try again" button works.

## Files touched

- `src/components/dashboard/book-hub/MarketSnapshot.tsx` — add fallbacks
- `src/components/dashboard/book-hub/BookHubOverview.tsx` — pass `onRefresh` prop

## Out of scope (separate improvement, not doing here)

- Hardening the Amazon scrape itself (rotating user agents, alternate sources like Goodreads/Google Books) — that's a backend reliability sprint, not a UI fix. The current behavior of falling back to Perplexity intelligence is correct; the UI just needs to surface that data.
