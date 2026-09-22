# Critical UI/UX Audit Plan

## Scope
Audit the entire Authors Bureau platform across desktop, tablet, and mobile, prioritising problems that block or seriously confuse users.

### Journeys covered
- **Public:** homepage, navigation, directory search/filtering, author and book pages, enquiries, help, and contact.
- **Authors:** sign-in, dashboard, Book Hub, all 28 node entry points, generation/loading/retry states, Marketing Hub, contacts, account settings, earnings, and sign-out.
- **Readers:** reader sign-in, Readers Bureau, challenges, purchases, library, learning access, and purchase completion.
- **Shared:** navigation, accessibility, loading/empty/error states, image reliability, terminology, mobile interaction, and visual consistency.

## Audit method
1. Walk each primary journey in the running site at representative desktop, tablet, and phone sizes.
2. Inspect the supporting code for hidden failure paths, inaccessible controls, inconsistent navigation, and weak recovery states.
3. Check keyboard access, labels, focus, contrast, tap targets, headings, landmarks, image alternatives, reduced motion, and layout overflow.
4. Compare author and reader experiences against the project’s established terminology, audience colours, navigation rules, and 28-node structure.
5. Record reproducible evidence for each important issue, including the affected page, user impact, and relevant code location where confirmed.

## Deliverable
Provide one prioritised audit containing:
- **Critical:** prevents sign-in, navigation, purchase/access, generation, saving, or task completion.
- **High:** creates serious confusion, accessibility barriers, mobile failures, or poor recovery from errors.
- **Medium:** consistency, clarity, hierarchy, and efficiency improvements.
- A concise journey scorecard for Public, Author, and Reader experiences.
- Recommended fixes ordered by impact and effort, separating quick wins from larger changes.
- Screenshots or reproducible steps for runtime findings.

## Boundaries
- This phase reports findings only; it will not change the site.
- Previously approved business rules remain unchanged, including hidden homepage pricing, enquiry-only high-touch services, canonical node labels, and the 28-node count.
- Source-only suspicions will be labelled separately from issues reproduced in the running site.
