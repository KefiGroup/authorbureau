# BP-04 verified-content fix

## Scope
- Keep all changes inside BP-04 generation and review.
- Do not change records, public pages, other modules, pricing, funnels, DOCX work, or publication state.

## Changes
1. Update the BP-04 generator to use only the existing author profile and selected book fields as factual sources.
2. Remove the instruction to invent placeholder testimonials and a buyer bonus.
3. Add a deterministic output guard that removes testimonials and bonus content and rejects named framework claims not present in those verified fields.
4. Apply the same display guard when loading an existing BP-04 draft, so unsupported draft claims are hidden without modifying the stored record.
5. Add focused tests covering testimonial suppression, bonus suppression, unsupported framework removal, and preservation of ordinary verified copy.

## Contact and SEO finding
- The Contact & SEO tab is a static review of generated copy and metadata; it is not intended to submit anything.
- The public author site already renders a separate working lead-capture form with name, email, and submit controls.
- No submission, integration, or public-page change will be made in this scope.

## Verification
- Run only the focused BP-04 safety tests and TypeScript check.
- Confirm the changed-file list and diff contain only BP-04 safety work.
- Keep the Buffett BP-04 draft unpublished and do not deploy or publish the app.
