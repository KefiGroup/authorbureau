# Live author publishing audit

## Goal
Verify the complete author journey from a saved module through publication to its final live page or downloadable output, then fix every reproducible failure without mixing unrelated work.

## Scope
- Audit all 28 canonical Revenue Streams across every author book that currently has built or live module records.
- Confirm each module belongs to the correct book and uses the canonical `/{author}/{book}/{module}` live address.
- Test author-side open, review, publish, copy-link, Library, and download actions where applicable.
- Test the final public page, lead form, enquiry, purchase handoff, or external destination without submitting payments or sending campaigns.
- Check Project monitoring and current runtime errors as part of the same audit.

## Work plan
1. Build a live inventory of authors, books, module records, status, readiness, saved outputs, and public destinations.
2. Run automated HTTP and browser checks against every published author/book/module address, including internal links and primary actions.
3. Sign into the live author portal with an authorized test session and exercise the build-to-publish flow for representative modules in Brand, Build, and Yield, plus every module-specific export or destination contract.
4. Fix confirmed defects in small, isolated groups. Recheck book selection, exact-book association, status/readiness, Library visibility, downloads, and canonical live links after each fix.
5. Resolve the three current Project monitoring findings:
   - legacy funnels hidden by book filtering;
   - social/coaching drafts omitted by invalid field requests;
   - single-book authors unable to escape an empty remembered scope.
6. Add regression checks for all 28 module IDs, exact-book isolation, live-link construction, and publishing readiness.
7. Confirm the pending deployment contains only audited fixes, publish, then rerun the complete checks against the live custom domain.

## Safety and reporting
- Preserve approved public copy, prices, terms, records, and existing live content unless a confirmed defect requires a targeted correction.
- Do not activate campaigns, send emails/posts, submit payments, or create real customer activity.
- Report exact tested coverage, every fix, live URLs, and any external blocker that cannot be resolved safely.

## Technical details
- `author_nodes` remains the sole 28-module completion ledger.
- Only exact-book, Live, readiness-passing rows count toward completion.
- Public links use the three-segment author/book/module format.
- Publishing validation includes database association, edge-function response, browser rendering, primary CTA behavior, and downloadable-file integrity.
