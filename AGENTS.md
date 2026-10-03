# Project architecture rules

- Treat `author_nodes` as the sole X/28 completion ledger; count only exact-book, Live, readiness-passing rows because product mirrors and profile shortcuts caused recurring dashboard drift.
- Generate public module links only in the canonical `/{author}/{book}/{module}` shape because two-segment links are ambiguous for multi-book authors.
- BP-01 sending flow is built only by _shared/bp01-flow-sync.ts (on publish, and self-healed on every reader sign-up) because the sending engine reads only email_flows/steps, not content_json.
- Social calendar rows (social_posts) must always carry book_id (fallback to the BP-03 row's book_id) and multi-book queries must never use maybeSingle, because null-book rows and multi-row errors made calendars appear empty.
- Treat BP-02 learner-resource files as book-scoped records inside `author_nodes.content_json`, because Library downloads must remain attached to the exact book without changing public-page copy.
- Keep author help videos in one shared click-to-play dashboard component with self-hosted MP4, poster, and captions, because tutorials must remain accessible and page-specific without autoplay.
