# Project architecture rules

- Treat `author_nodes` as the sole X/28 completion ledger; count only exact-book, Live, readiness-passing rows because product mirrors and profile shortcuts caused recurring dashboard drift.
- Generate public module links only in the canonical `/{author}/{book}/{module}` shape because two-segment links are ambiguous for multi-book authors.