

## Goal
Eliminate the duplicate "Configure → Let Abby Build → Edit Content → Design → Preview & Publish" path so every node uses ONE flow:

**Introduction → Generating → Review → Publish → Live**

This is the path used by the 30 dedicated builders (`BP01Builder` … `YR28Builder`) reached via `/node-builder/:nodeId`. The legacy `UniversalBuilderStudio` flow is what's breaking BA/YR nodes after generation.

## Audit: where the two paths exist

**Path B — KEEP** (dedicated builders, 5 steps with "Live"):
- 30 builders in `src/components/dashboard/builders/{bp01..yr28}/`
- Routed through `src/pages/NodeBuilder.tsx` at `/node-builder/:nodeId`
- Each owns its own generate edge function (already hardened in last sprint)

**Path A — REMOVE** (`UniversalBuilderStudio`, 5 steps ending in "Preview & Publish"):
- `src/components/dashboard/builders/UniversalBuilderStudio.tsx`
- `src/components/dashboard/builders/builderNodeConfig.ts` (defines the 5-step `Configure / Let Abby Build / Edit Content / Design / Preview & Publish` schema)
- `src/components/dashboard/builders/builderUtils.ts`, `builderSystemPrompts.ts`
- Mounted in `AuthorDashboard.tsx` for these sections:
  - `?builder=<id>` generic mount (line 376–384)
  - `home-study`, `group-coaching`, `memberships`, `email-marketing`, `book-sales`, `special-editions`, `lead-magnet`, `big-ticket`
- Mounted in `CourseBuilder.tsx` for `online-course`

## Plan — 3 steps

### 1. Redirect every legacy entry point to the dedicated builder
Replace each `<UniversalBuilderStudio nodeConfig={…} />` mount with a `<Navigate to={`/node-builder/${NODE_ID}`} replace />` using this map:

| Dashboard section / `?builder=` value | Redirect target |
|---|---|
| `lead-magnet` / `?builder=lead-magnet` | `/node-builder/BP-02` |
| `social-media` related universal mounts | `/node-builder/BP-03` |
| `book-sales` | `/node-builder/BP-05` |
| `special-editions` | `/node-builder/BP-08` |
| `email-marketing` / `email-flows` | `/node-builder/BP-01` |
| `home-study` | `/node-builder/BA-?` (home study) |
| `online-course` (CourseBuilder) | `/node-builder/BA-10` |
| `memberships` | `/node-builder/BA-12` |
| `group-coaching` | `/node-builder/BA-13` |
| `big-ticket` | `/node-builder/YR-20` |

(Exact node IDs verified against `BUILDER_NODE_MAP` keys before writing the redirect.)

Also handle the generic `?builder=<id>` case in `AuthorDashboard.tsx` (lines 374–384) by mapping the legacy id → dedicated `NodeBuilder` route.

### 2. Delete the legacy code
Once nothing imports them, remove:
- `src/components/dashboard/builders/UniversalBuilderStudio.tsx`
- `src/components/dashboard/builders/builderNodeConfig.ts`
- `src/components/dashboard/builders/builderUtils.ts`
- `src/components/dashboard/builders/builderSystemPrompts.ts`
- `BUILDER_NODE_MAP` import in `AuthorDashboard.tsx` and `CourseBuilder.tsx`

`CourseBuilder.tsx` becomes a thin redirect to `/node-builder/BA-10`.

### 3. Verify nothing else imports the old path
Search-and-clean any remaining `UniversalBuilderStudio` / `BUILDER_NODE_MAP` / `builderNodeConfig` references; remove dead component folders that were only consumed by `UniversalBuilderStudio` (e.g. orphaned helper components inside `lead-magnet/`, `home-study/`, etc. that aren't imported by the dedicated `BPxxBuilder.tsx` files).

## Result
- One single visual flow everywhere: **Introduction → Generating → Review → Publish → Live**
- All BA/YR generators (already hardened with snapshot-restore + `parseAiJson`) become the only path users can reach, eliminating the post-generation breakage you've been seeing
- ~1,500 LOC of legacy duplicate logic removed

## Risk / verification
- Old links/bookmarks like `/dashboard?builder=lead-magnet` keep working via redirect
- After deploy, click each BP/BA/YR card from the hub and confirm the 5-step "Live" stepper renders and Save Draft auto-resumes (matches the second screenshot)

