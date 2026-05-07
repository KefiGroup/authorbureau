## Sprint 7 — Rename BA-14 canonical label "Podcast Tour" → "Podcast"

### Files to edit

1. **`src/components/dashboard/builders/builderNodeConfig.ts`** (line 47)
   - `label: "Podcast Tour"` → `label: "Podcast"`

2. **`docs/03-abby-ai/02-system-prompt-current.md`** (lines 71, 82, 91, 131)
   - Replace all 4 occurrences of "Podcast Tour" with "Podcast"

3. **`docs/01-architecture/01-master-architecture-reference.md`** (line 81)
   - Registry table entry

4. **`docs/01-architecture/04-node-connector-map.md`** (line 31)

5. **`docs/02-business-rules/02-node-readiness-gates-full-spec.md`** (lines 89, 198)

6. **`docs/02-business-rules/05-author-vs-book-level-registry.md`** (line 26)

7. **`docs/04-node-frameworks/BA-14.md`** (line 1 heading)

8. **`docs/05-sprint-records/03-bug-registry.md`** — add Sprint 7 entry resolving the canonical rename

9. **Memory update** — `mem://index.md` Core "Canonical Node Names" line: append `BA-14 = Podcast` to the explicit list so future sessions don't drift back.

### Verification

- Run `rg -ni "podcast tour"` — must return zero hits across `src/` and `docs/`.
- Confirm `src/lib/__tests__/canonical-labels-parity.test.ts` still passes (it reads from `builderNodeConfig.ts`, so it will auto-track the new label).
- Spot-check builder header in BA-14 builder UI — should auto-render "Podcast" (it consumes `getCanonicalNodeLabel("BA-14")`).

### Out of scope

- No DB migration (canonical labels are FK-tracked by node ID, not label string).
- No edge-function code changes (they all import `getCanonicalNodeLabel` from `_shared/canonical-node-labels.ts` which derives from the same source — will verify during build that the shared registry is regenerated).
- No user-facing toast change (already says "Your Podcast is now live!" from Sprint 6).
