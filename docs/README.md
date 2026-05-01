# Authors Bureau — Engineering Documentation

This folder is the **source of truth** for the Authors Bureau platform's architecture, prompts, schema, and node behavior. It is committed to GitHub alongside the code so every sprint can reference and update it.

## Index

| File | Description |
|---|---|
| [01-abby-master-prompt-architecture.md](./01-abby-master-prompt-architecture.md) | ABBY persona, philosophy, forbidden terms, model routing |
| [02-abby-system-prompt-current.md](./02-abby-system-prompt-current.md) | The verbatim production system prompt (versioned) |
| [03-abby-node-activation-prompts.md](./03-abby-node-activation-prompts.md) | Per-node generator prompts (BP-00..YR-28) |
| [04-ab-engine-architecture-map.md](./04-ab-engine-architecture-map.md) | The 7 platform engines, their tables and integrations |
| [05-ab-database-schema-current.md](./05-ab-database-schema-current.md) | Live `public` schema export |
| [06-ab-node-framework-be-suckcessful-test.md](./06-ab-node-framework-be-suckcessful-test.md) | Author + reader journeys for the 5 most-used nodes |

## Maintenance rule (locked)

> **Every sprint must update the relevant doc(s) under `/docs/` before the sprint is marked complete.**
>
> - New node generator → update **03** and (if among the top 5) **06**
> - Database schema change → re-export **05**
> - New engine, table, or external service → update **04**
> - Any change to ABBY's system prompt → bump version in **02** and update **01** if the persona / philosophy shifts
> - New forbidden term, model, or behavioral rule → update **01**

This rule is also stored in project memory at `mem://process/docs-sprint-maintenance` so future sessions enforce it automatically.

## How to regenerate

```bash
node scripts/build-docs.mjs
```

The script reads directly from `supabase/functions/`, `src/components/dashboard/builders/`, and the live database schema, so the docs always reflect what is actually in production.

---
_Generated: 2026-05-01 · Version 1.0_
