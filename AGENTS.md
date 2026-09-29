# Project architecture rules

- Treat `author_nodes` as the sole X/28 completion ledger; count only exact-book, Live, readiness-passing rows because product mirrors and profile shortcuts caused recurring dashboard drift.
- Generate public module links only in the canonical `/{author}/{book}/{module}` shape because two-segment links are ambiguous for multi-book authors.- Publishing BP-01 mirrors the generated welcome sequence into the author's active BP-01 email_flow/steps because the sending engine reads only those tables, not content_json.
- Social calendar rows (social_posts) must always carry book_id (fallback to the BP-03 row's book_id) and multi-book queries must never use maybeSingle, because null-book rows and multi-row errors made calendars appear empty.
