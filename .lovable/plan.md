## Root Cause

BA-15 Media Outreach is **not** actually stuck — Pauline has a complete record:
- `status = 'live'`
- `press_release` ✓
- `target_media_outlets` ✓ (5 real outlets with outlet name, type, audience, pitch_angle)

But `hasRequiredAssets("BA-15", content)` only checks `media_list` or `outlets` — it does **not** know about `target_media_outlets`, which is the field name the current BA-15 builder writes. So:

1. `useNodeLiveStats` downgrades `live → content_ready`
2. `STATUS_PROGRESS["content_ready"] = 60`
3. Card renders "🔨 Building · 60% done · Continue Building →"

This is the same pattern that hit BA-14: a readiness gate written before the builder finalised its field names. There is no real partial-generation problem here — the AI completed, the data is there, the gate is wrong.

A second, smaller issue: even when a node *is* genuinely stuck mid-build, there is no explicit "Restart Build" CTA. Today the user clicks "Continue Building" which routes to the builder, where they have to know to re-trigger generation themselves. That UX is opaque.

## Plan

### 1. Fix BA-15 readiness gate (resolves Pauline's case immediately)

`src/lib/node-readiness.ts` — accept `target_media_outlets` (current builder), `media_list`, or `outlets`:

```ts
case "BA-15": {
  const hasPressRelease = !!(
    content.press_release ||
    content.press_release_html ||
    content?.assets?.press_release
  );
  const outletArrays = [
    content.target_media_outlets, // current builder
    content.media_list,           // legacy
    content.outlets,              // legacy
  ];
  const hasOutlets = outletArrays.some(
    (a: any) => Array.isArray(a) && a.length > 0,
  );
  return hasPressRelease && hasOutlets;
}
```

After this change, Pauline's BA-15 row passes the gate → effective status stays `live` → card shows ✅ Live in both Build tab and Library.

### 2. Add a "Restart Build" affordance for in-progress nodes

`src/components/dashboard/SmartProductCard.tsx` — when `state === "in-progress"`, render a small secondary "Restart Build" link below the primary "Continue Building →" button.

```tsx
{state === "in-progress" && (
  <>
    <Button size="sm" className={...} onClick={onContinue}>
      <Wrench className="h-3 w-3 mr-1.5" /> Continue Building →
    </Button>
    {onRestart && (
      <button
        type="button"
        onClick={onRestart}
        className="w-full text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1"
      >
        Restart build
      </button>
    )}
  </>
)}
```

Add `onRestart?: () => void` to `SmartProductCardProps`.

### 3. Wire `onRestart` in `PortfolioStepView.tsx`

When clicked, ask the user to confirm, then:
1. Update the row: `status = 'draft'`, `current_step = 1`, `content_json = {}` for that `(author_id, node_id, book_id)`.
2. `progress.refresh()` and `liveStats.refresh()`.
3. Navigate to the builder via the existing `handleNav(n)` so the user lands on step 1.

```ts
async function handleRestart(n: NodeWithProgress) {
  const ok = window.confirm(
    `Restart ${n.label}? Your current draft will be cleared and you'll start over.`,
  );
  if (!ok) return;
  const code = n.code;
  const { data: profile } = await supabase
    .from("author_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!profile?.id) return;
  let q = supabase.from("author_nodes")
    .update({ status: "draft", current_step: 1, content_json: {} })
    .eq("author_id", profile.id).eq("node_id", code);
  if (primaryBookIdEarly) q = q.eq("book_id", primaryBookIdEarly);
  await q;
  progress.refresh();
  liveStats.refresh();
  handleNav(n);
}
```

Pass `onRestart={() => handleRestart(n)}` only when `n.state === "in-progress"`.

### 4. Verification

- BA-15 for Pauline → ✅ Live badge across Build tab, Library, Hub.
- Any other node genuinely stuck in `draft`/`content_ready` → user sees a small "Restart build" link under "Continue Building →".
- Restart confirms, clears the row to `draft / step 1 / {}`, refreshes both hooks, and routes into the builder.

### Files touched

- `src/lib/node-readiness.ts` — broaden BA-15 gate.
- `src/components/dashboard/SmartProductCard.tsx` — add optional `onRestart` prop and small link.
- `src/components/dashboard/PortfolioStepView.tsx` — implement `handleRestart` and pass to card.
- `mem://audits/manus-2026-04-23-corrections` — add BA-15 field-name note alongside BA-14.

### Out of scope

- No edge-function or DB-schema changes.
- No automatic AI re-trigger on Restart — Restart simply resets state and drops the user back into the builder, where the existing per-step Generate buttons handle re-runs. Auto-running AI on click would be unexpected and could double-charge.
