# Authors Bureau — Engineering Documentation

_Version 3.5 · 2026-05-01 · Sprint 53 (Documentation High-Integrity Rewrite)_

This folder is the **single source of truth** for the Authors Bureau platform's architecture, business rules, AI prompts, schema, node behaviour, and process. It is committed to GitHub alongside the code so every sprint can reference and update it.

The folder structure mirrors the **Authors Bureau Master Documentation Framework** by Manus AI (May 1, 2026).

## Authority order (when docs disagree)

1. [`01-architecture/01-master-architecture-reference.md`](./01-architecture/01-master-architecture-reference.md) — **canonical for node IDs, labels, scopes, edge function paths, categories, counts**.
2. `src/components/dashboard/builders/builderNodeConfig.ts` — code-level source of truth for canonical labels.
3. `supabase/functions/_shared/node-readiness.ts` — code-level source of truth for `AUTHOR_LEVEL_NODES`, `COMMERCE_NODES`, and `hasRequiredAssets`.

If a downstream doc disagrees with the master architecture reference, the downstream doc is the bug.

## Categories

| # | Category | Purpose |
|---|----------|---------|
| 01 | [Architecture](./01-architecture/) | What is built and why — the system at the highest level |
| 02 | [Business Rules](./02-business-rules/) | How the system counts and decides — the rules that prevent bugs |
| 03 | [ABBY AI](./03-abby-ai/) | What ABBY says and does — the most fragile and most valuable IP |
| 04 | [Node Frameworks](./04-node-frameworks/) | One document per node (28 total). `BP-00` is an internal pre-step, not a node. |
| 05 | [Sprint Records](./05-sprint-records/) | What was built, when, and why — the audit trail |
| 06 | [User Experience](./06-user-experience/) | What the author and reader actually see |

## Quick links

- [Master Architecture Reference](./01-architecture/01-master-architecture-reference.md) — start here
- [Database Schema (live)](./01-architecture/02-database-schema-current.md)
- [Engine Architecture Map](./01-architecture/03-engine-architecture-map.md)
- [Node Readiness Gates — Full Spec](./02-business-rules/02-node-readiness-gates-full-spec.md)
- [ABBY System Prompt — Current](./03-abby-ai/02-system-prompt-current.md)
- [ABBY Node Activation Prompts](./03-abby-ai/03-node-activation-prompts.md)
- [28 Node Frameworks Index](./04-node-frameworks/README.md)
- [Be SUCKcessful walkthrough](./06-be-suckcessful-test.md)

## Maintenance rule (locked)

> Every sprint must update the relevant doc(s) under `/docs/` **before** the sprint is marked complete. Updates to node IDs, labels, scopes, or edge function paths MUST first be made in `01-architecture/01-master-architecture-reference.md`.

| Change shipped | Docs that must be touched |
|---|---|
| Database migration | `01-architecture/02-database-schema-current.md` + relevant entries in `02-business-rules/` |
| New node generator or builder | `01-architecture/01-master-architecture-reference.md` (registry row) + `04-node-frameworks/<id>.md` + `03-abby-ai/03-node-activation-prompts.md` + sprint log |
| Renaming a node generator file | `01-architecture/01-master-architecture-reference.md` (registry row) + `04-node-frameworks/<id>.md` |
| New engine / table / external service | `01-architecture/03-engine-architecture-map.md` + `01-architecture/04-node-connector-map.md` |
| Tech stack swap | `01-architecture/05-technology-stack-current.md` + decision log |
| Change to ABBY system prompt | bump version in `03-abby-ai/02-system-prompt-current.md` + add Changelog row |
| Persona / philosophy / forbidden term | `03-abby-ai/01-master-prompt-architecture.md` |
| Readiness gate change | `02-business-rules/02-node-readiness-gates-full-spec.md` |
| Pricing / fee / payout / Stripe behaviour | `02-business-rules/04-stripe-connection-rules.md` + decision log |
| New bug found / fixed | `05-sprint-records/03-bug-registry.md` |
| Architectural decision | `05-sprint-records/04-decision-log.md` |

This rule is also stored in project memory at `mem://process/docs-sprint-maintenance` so future AI sessions enforce it automatically.

## Regeneration

```bash
node scripts/build-docs.mjs                  # 03-abby-ai/01–02 + database schema
node scripts/build-doc-03.mjs                # 03-abby-ai/03 (node activation prompts)
node scripts/build-docs-v3.mjs               # initial scaffold (run once)
node scripts/build-node-framework-docs.mjs   # regenerate all 28 node framework docs from canonical registry
node scripts/package-docs.mjs                # zip /docs to /mnt/documents/authors-bureau-docs-v3.zip
```

The scripts read directly from `supabase/functions/`, `src/`, and the live database, so docs always reflect what is actually in production. The node-framework registry is duplicated inside `scripts/build-node-framework-docs.mjs` — when adding or renaming a node, edit it there AND the master architecture reference, then regenerate.

---
_Last regenerated: 2026-05-01 (Sprint 47 — documentation corrections)_

