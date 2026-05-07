## Sprint 6 — Audit Follow-Ups

Acting on the Manus 7 May 2026 Sprint Verification Report, with two corrections to the auditor's Sprint 3 framing (canonical labels confirmed as **Big Ticket Consulting** for YR-20 and **JV Partnerships** for BA-18).

### 1. Sprint 3 follow-up — canonical label drift (P1)

Single source of truth: `builderNodeConfig.ts`.

- **YR-20 builder header**: revert from "Big Ticket Offers" → **Big Ticket Consulting**. Toast already correct.
- **BA-18 builder header**: change from "Revenue Sharing" → **JV Partnerships**. Toast already correct.
- **BA-14 completion toast**: change "Your Podcast Tour is now live!" → **"Your Podcast is now live!"**. Header already correct.
- **`rg` sweep** for any remaining hardcoded label literals in builder components; replace with `getCanonicalNodeLabel(nodeId)`.
- **Investigate why the Sprint 51 parity test didn't catch these** — the test compares config vs. edge map vs. slug map, but doesn't scan rendered builder headers/toasts. Add a lightweight test that asserts each builder component imports its label from `builderNodeConfig` (no string literals matching legacy phrases).

### 2. Sprint 2 follow-up — YR-24 Transformation Arc renderer (P2)

`SafeBlock` currently silently drops the `transformation_arc` object, leaving the section blank on `/pauline-teo/retreat`. Add a structured renderer:

```tsx
{Array.isArray(transformationArc) && transformationArc.map((stage, i) => (
  <Card key={i}>
    <h4>{stage.stage}</h4>
    <p><strong>From:</strong> {stage.shift_from}</p>
    <p><strong>To:</strong> {stage.shift_to}</p>
    <p><strong>Proof:</strong> {stage.proof_of_progress}</p>
  </Card>
))}
```

Extract as a shared `<TransformationArc />` component if the same shape appears in YR-23 / YR-25.

### 3. Sprint 4 follow-up — YR-23 regression test (P3)

Add a Vitest case in `parseAiJsonResilient` test suite that feeds a truncated 16k-token mastermind payload and asserts successful repair (no throw, valid sections array).

### 4. Sprint 1 follow-up — counter regression test (P3)

Add a fixture-based test asserting `author-stats.perBook` returns `built: 28` when all 28 nodes carry a valid `library_asset`, and `built: 26` when BP-01 + BP-03 are missing — pinning current support@paulineteo.com behavior.

### Out of scope

- No changes to Sprint 5 (passing).
- No platform-wide rename of YR-20 / BA-18 (canonical confirmed; existing references already correct).
- No streaming / per-section progress UX (separate sprint).

### Acceptance

- YR-20 builder header reads "Big Ticket Consulting"; toast unchanged.
- BA-18 builder header reads "JV Partnerships"; toast unchanged.
- BA-14 toast reads "Your Podcast is now live!".
- `/pauline-teo/retreat` shows Transformation Arc as structured cards, not blank.
- New Vitest cases pass; existing parity test still green.
- `docs/05-sprint-records/03-bug-registry.md` updated with the resolved items.
