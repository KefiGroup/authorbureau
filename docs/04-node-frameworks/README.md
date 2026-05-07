# 04 · Node Frameworks — Index

_Version 3.1 · 2026-05-01_

**Source(s) of truth:**
- [Master Architecture Reference §3](../01-architecture/01-master-architecture-reference.md) — the canonical registry
- `src/components/dashboard/builders/builderNodeConfig.ts`
- `supabase/functions/_shared/node-readiness.ts`

> All node IDs, canonical labels, scopes, and edge function paths in the docs below are mirrored from the master registry. To regenerate: `node scripts/build-node-framework-docs.mjs`.

---

Each of the 28 nodes has its own framework document below. (`BP-00` is an internal book-analysis pre-step, not a node — see [master reference §3a](../01-architecture/01-master-architecture-reference.md).) Every doc follows the same 7-section template defined by Manus:

1. **What it is** — plain-English description
2. **What ABBY builds** — engine(s), edge function, data shape
3. **What the author does** — step-by-step builder flow
4. **What the reader experiences** — end-to-end customer journey
5. **Readiness gate** — exact `hasRequiredAssets` rule
6. **Revenue model** — how money flows
7. **Dependencies** — required nodes + connectors

## Index

| ID | Label | Category | Scope | Doc |
|---|---|---|---|---|
| BP-01 | Email Marketing | Brand | Author | [BP-01.md](./BP-01.md) |
| BP-02 | Lead Magnet | Brand | Book | [BP-02.md](./BP-02.md) |
| BP-03 | Social Media | Brand | Author | [BP-03.md](./BP-03.md) |
| BP-04 | Author Website | Brand | Book | [BP-04.md](./BP-04.md) |
| BP-05 | Webinars | Brand | Book | [BP-05.md](./BP-05.md) |
| BP-06 | Workbook | Brand | Book | [BP-06.md](./BP-06.md) |
| BP-07 | Home Study Course | Brand | Book | [BP-07.md](./BP-07.md) |
| BP-08 | Special Editions | Brand | Book | [BP-08.md](./BP-08.md) |
| BP-09 | Book Sales | Brand | Book | [BP-09.md](./BP-09.md) |
| BA-10 | Online Course | Build | Book | [BA-10.md](./BA-10.md) |
| BA-11 | Audiobook | Build | Book | [BA-11.md](./BA-11.md) |
| BA-12 | Membership | Build | Book | [BA-12.md](./BA-12.md) |
| BA-13 | Group Coaching | Build | Book | [BA-13.md](./BA-13.md) |
| BA-14 | Podcast | Build | Author | [BA-14.md](./BA-14.md) |
| BA-15 | Media & PR | Build | Author | [BA-15.md](./BA-15.md) |
| BA-16 | Affiliates | Build | Author | [BA-16.md](./BA-16.md) |
| BA-17 | Bundles | Build | Book | [BA-17.md](./BA-17.md) |
| BA-18 | JV Partnerships | Build | Author | [BA-18.md](./BA-18.md) |
| YR-19 | 1-on-1 Coaching | Yield | Author | [YR-19.md](./YR-19.md) |
| YR-20 | Big Ticket Consulting | Yield | Author | [YR-20.md](./YR-20.md) |
| YR-21 | Speaking | Yield | Author | [YR-21.md](./YR-21.md) |
| YR-22 | Corporate Training | Yield | Author | [YR-22.md](./YR-22.md) |
| YR-23 | Mastermind | Yield | Author | [YR-23.md](./YR-23.md) |
| YR-24 | Retreats | Yield | Author | [YR-24.md](./YR-24.md) |
| YR-25 | Certification | Yield | Author | [YR-25.md](./YR-25.md) |
| YR-26 | Conference | Yield | Author | [YR-26.md](./YR-26.md) |
| YR-27 | Fundraising | Yield | Author | [YR-27.md](./YR-27.md) |
| YR-28 | Sponsors | Yield | Author | [YR-28.md](./YR-28.md) |

## Authoring template

When adding a new node:

```markdown
# <ID> · <Label>

_Version <v> · <date>_

**Category:** Brand | Build | Yield
**Scope:** Author | Book

## 1. What it is

## 2. What ABBY builds

## 3. What the author does

## 4. What the reader experiences

## 5. Readiness gate

## 6. Revenue model

## 7. Dependencies
```
