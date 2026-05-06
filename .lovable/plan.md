## Fix: BA-15, BA-16, BA-17, BA-18, YR-26, YR-28 stuck on "Coming Soon"

### Cause
`useBookNodeProgress.ts` ignores DB gating for any node hard-coded as `status: "planned"` in `abbyFrameworkConfig.ts`. The companion helper `getEffectiveNodeStatus` already handles this correctly — the hook just diverged.

### Change (1 file, 1 line)
**`src/hooks/useBookNodeProgress.ts`** (around line 188–190)

Replace:
```ts
const isOpen = !openNodeIds || openNodeIds.has(n.id) || n.status === "available";
const effectiveStatus: AbbyNode["status"] =
  n.status === "planned" ? "planned" : isOpen ? "available" : (n.status as any);
```

With:
```ts
const isOpen = !openNodeIds || openNodeIds.has(n.id) || n.status === "available";
const effectiveStatus: AbbyNode["status"] = isOpen
  ? "available"
  : (n.status as any);
```

This mirrors the canonical rule already used in `getEffectiveNodeStatus()`: if `node_gating.is_open = true`, lift the status to `"available"` regardless of whether the hard-coded default was `"coming-soon"` or `"planned"`.

### Result
After the fix the six BA/YR cards will render as **Ready to Build** with their normal "Build This Product →" CTA on the Brand/Build/Yield product hubs and Book Hub stepper, matching their existing `node_gating.is_open = true` state in the DB.

### Out of scope
No DB changes (gating is already correct). No config changes (hard-coded `"planned"` defaults stay as the safe fallback when DB hasn't loaded). No changes to other consumers — `BusinessFramework.tsx` and `StepDetailView.tsx` already use the correct helper.