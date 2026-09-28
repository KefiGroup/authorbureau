# 28-module workflow and dashboard-count audit

## Goal
Make the dashboard's X/28 figure permanently match the modules genuinely completed for each book, then verify Value Investing for Women through every module from builder entry to its intended published result.

## Root-cause correction
- Treat the book-scoped `author_nodes` records as the only completion ledger, matching the platform's product-registry architecture.
- Remove legacy count contributions from separate product tables and the automatic “website completed because an author slug exists” shortcut.
- Count a module only when its record belongs to the selected book, is Live, and passes the shared readiness requirements.
- Keep draft and Content Ready modules visible as work in progress without adding them to X/28.
- Refresh totals immediately after save/publish so a correct backend result is not hidden by stale dashboard data.

## Full 28-module verification
- Reconcile all three Pauline Teo books against the corrected ledger and identify duplicate, missing-book, or falsely Live records.
- Use Value Investing for Women for the full author journey across all 28 canonical modules.
- For each module, verify: correct book opens, generation returns usable content, edits save, publishing records the right book and module, and the intended destination works.
- Check destination type by design: public book page, download/library asset, enquiry form, registration page, email/social workflow, or external publishing handoff.
- Verify every reader-facing URL returns successfully, retains Value Investing for Women context, and has a usable action without a dead end.

## Safeguards and validation
- Add automated parity tests covering all 28 IDs, per-book isolation, unique counting, readiness rules, and old product rows not inflating totals.
- Compare dashboard totals with direct database reconciliation for Pauline's three books.
- Run focused automated tests, check application errors, and perform signed-in author plus signed-out reader browser checks.
- Do not complete a real card charge; verify checkout reaches the payment handoff only.

## Technical detail
- Update the shared counting contract and `author-stats`; keep the frontend consuming `author-stats.products.perBook[bookId].nodeIds`.
- Remove independent completion inference from the Book Hub and any dashboard cards.
- Add a shared refresh signal after successful module publication so every mounted count view refetches the same authoritative result.