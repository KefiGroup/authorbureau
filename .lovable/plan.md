

# Field Mapping: PublishNow → Authors Bureau

Below is the complete list of fields the Authors Bureau database expects, organized by section. For each field, the **DB Column** is the exact database column name, and the **Expected from PublishNow** shows the field name(s) the sync function currently recognizes (from `sync-author-profile`).

---

## Author Profile Fields

| # | DB Column | Type | Description | Expected from PublishNow |
|---|-----------|------|-------------|--------------------------|
| 1 | `pen_name` | text | Author's display/pen name | `pen_name` or `profile_name` |
| 2 | `bio_short` | text | Short bio (1-2 sentences, used on cards/directories) | `short_bio` or `bio_short` |
| 3 | `bio_long` | text | Full bio (used on author profile pages) | `bio`, `full_bio`, or `bio_long` |
| 4 | `tagline` | text | One-line tagline/headline (e.g. "Bestselling Author & Speaker") | `tagline`, `headline`, or `title_tagline` |
| 5 | `photo_url` | text | URL to author headshot/profile photo | `profile_photo_url` or `profile_picture_url` |
| 6 | `location_city` | text | City (e.g. "Singapore") | `city` |
| 7 | `location_country` | text | Country (e.g. "Singapore") | `country` |
| 8 | `website_url` | text | Author's personal website URL | `social_links.website` or `website` |
| 9 | `linkedin_url` | text | LinkedIn profile URL | `linkedin_url` or `social_links.linkedin` |
| 10 | `amazon_author_profile_url` | text | Amazon Author Central page URL | `amazon_author_url` or `social_links.amazon` |
| 11 | `twitter_url` | text | Twitter/X profile URL | `social_links.twitter` |
| 12 | `instagram_url` | text | Instagram profile URL | `social_links.instagram` |
| 13 | `youtube_url` | text | YouTube channel URL | `social_links.youtube` |
| 14 | `genres` | text[] | Array of genres (e.g. ["Memoir", "Self-Help"]) | `genres` (array) |
| 15 | `credentials` | jsonb | Array of credential strings (e.g. ["Keynote Speaker", "PhD"]) | `credentials` (string or array) |
| 16 | `is_speaker` | boolean | Whether author is available for speaking engagements | `extra_data.is_speaker` |
| 17 | `speaker_fee_range` | text | Speaking fee range (e.g. "$500-$2000") | `extra_data.speaker_fee_range` |

**Not currently synced but available in DB** (could be added to sync):

| # | DB Column | Type | Description |
|---|-----------|------|-------------|
| 18 | `cover_photo_url` | text | Banner/cover photo for author profile page |
| 19 | `availability_notes` | text | Free-text availability notes |

---

## Book Fields

Each book project pushed from PublishNow maps to a row in the `books` table:

| # | DB Column | Type | Description | Expected from PublishNow |
|---|-----------|------|-------------|--------------------------|
| 1 | `title` | text | **Required.** Book title | `title` or `name` |
| 2 | `subtitle` | text | Book subtitle | `subtitle` |
| 3 | `description` | text | Book blurb/description (HTML or plain text) | `description` |
| 4 | `cover_image_url` | text | URL to the book cover image | `cover_image_url` or `cover_url` |
| 5 | `amazon_url` | text | Amazon product page URL (or other buy link) | `amazon_url` |
| 6 | `genre` | text | Primary genre/category | `genre` or `category` |
| 7 | `pages` | integer | Page count | `pages` |
| 8 | `price` | text | General/hardcover price (e.g. "$12.99") | `price` |
| 9 | `kindle_price` | text | Kindle/ebook price | *(not currently synced)* |
| 10 | `paperback_price` | text | Paperback price | *(not currently synced)* |
| 11 | `currency` | text | Currency code (default: "USD") | *(not currently synced)* |
| 12 | `bestseller_proof_url` | text | Screenshot URL proving bestseller status | *(not currently synced)* |

**Auto-generated fields** (not needed from PublishNow):

| DB Column | Description |
|-----------|-------------|
| `slug` | Auto-generated from title (URL-safe) |
| `author_id` | Resolved from email lookup |
| `author_name` | Pulled from synced profile `pen_name` |
| `author_bio` | Pulled from synced profile `bio_short` or `bio_long` |
| `author_photo_url` | Pulled from synced profile `photo_url` |
| `entry_mode` | Set to `"imported"` or `"publishnow"` |
| `published_at` | Set via `auto_publish` flag |

**Locally managed fields** (never overwritten by sync):

| DB Column | Description |
|-----------|-------------|
| `badges` | Bestseller badges, managed by admin |
| `rating` | Book rating, managed locally |
| `review_count` | Review count, managed locally |
| `ai_enriched` | Whether AI enrichment has run |

---

## Fields to Consider Adding to Sync

These fields exist in the DB but are not yet mapped from PublishNow. If PublishNow can collect them, the sync function can be extended:

1. `kindle_price` — Ebook/Kindle price string
2. `paperback_price` — Paperback price string
3. `currency` — Currency code (USD, SGD, etc.)
4. `cover_photo_url` — Author banner/cover image
5. `bestseller_proof_url` — Screenshot of bestseller ranking

