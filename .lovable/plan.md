

## Audit Summary

### Issue 1: Edit Step (Step 3) shows cards but content is not editable

The screenshot shows three section cards on the "Edit & Polish" step. These are rendered by `ContentSectionCards`, which parses the AI-generated text into collapsible cards. Each card has a pencil icon to enter edit mode — but you need to **click/expand the card first**, then click the pencil (Edit) icon to make the text editable.

However, the real problem is that the cards appear collapsed with only titles visible and no obvious edit affordance. For the "Edit & Polish" step specifically, the cards should be **expanded by default** and **in edit mode by default** so the author can immediately type changes.

### Issue 2: Lead Magnet → GHL → Marketing Hub flow is broken at multiple points

Here is the full intended flow and where it breaks:

```text
Step 1: Configure     → Pick type, title, audience
Step 2: Let Abby Build → AI generates content (saved to stepData.leadMagnetContent)
Step 3: Edit & Polish  → Author edits content (saved to stepData.leadMagnetEdited)
Step 4: Design         → Opt-in page visual builder (saved to stepData.leadMagnetPage)
Step 5: Preview & Publish → Click "Publish to Marketing Hub"
        ↓
     deploy-bp02-to-ghl edge function
        ↓
     Checks author_profiles.ghl_sub_account_id
        ↓
     ALL authors have ghl_provision_status = "pending", ghl_sub_account_id = NULL
        ↓
     Returns status: "published_pending_ghl"
        ↓
     UI shows "Content saved — not live yet" with "Go to Connected Accounts" button
        ↓
     Connected Accounts → "Connect Now" button → calls ghl-provision-author
        ↓
     GHL provisioning creates sub-account (or fails with 403 → uses shared fallback)
        ↓
     Back to Connected Accounts → "Re-deploy" button → calls deploy-bp02-to-ghl again
        ↓
     This time ghl_sub_account_id exists → creates funnel/workflow/tags in GHL
        ↓
     Returns status: "live" with microsite URL
        ↓
     UI shows live URL + "Go to Marketing Hub" button
        ↓
     BUT: "Go to Marketing Hub" button calls onNavigate("marketing-hub")
          which is NEVER PASSED from LeadMagnetStepRenderer → button does nothing
```

**Database confirms**: All 5 authors have `ghl_provision_status = 'pending'` and `ghl_sub_account_id = NULL`. No `author_nodes` records exist at all — meaning no one has successfully published yet.

## Plan

### 1. Make Edit & Polish cards editable by default

In `ContentSectionCards.tsx`, add an `autoExpand` prop. When `true`, all cards render expanded and in edit mode on mount. Pass `autoExpand={true}` from `SharedContentStep.tsx` when the step is the "edit" step (detected via `seedFromKey` being set, which is only used for the edit step).

### 2. Wire the "Go to Marketing Hub" button

In `LeadMagnetStepRenderer.tsx` at the `preview` case, pass `onNavigate` to `SharedPublishStep` using `useNavigate`:

```tsx
onNavigate={(section) => navigate(`/dashboard?section=${section}&highlight=lead-magnets`)}
```

### 3. Use `navigate()` as fallback in SharedPublishStep

Update the "Go to Marketing Hub" button in `SharedPublishStep.tsx` to use `navigate` directly if `onNavigate` is not provided, so it always works:

```tsx
onClick={() => onNavigate ? onNavigate("marketing-hub") : navigate("/dashboard?section=marketing-hub")}
```

### Files to change

1. **`src/components/dashboard/builders/shared/ContentSectionCards.tsx`** — Add `autoExpand` prop; when true, initialize all cards as expanded and in edit mode
2. **`src/components/dashboard/builders/shared/SharedContentStep.tsx`** — Pass `autoExpand={!!seedFromKey}` to `ContentSectionCards`
3. **`src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`** — Import `useNavigate`, pass `onNavigate` to `SharedPublishStep`
4. **`src/components/dashboard/builders/shared/SharedPublishStep.tsx`** — Fallback to `navigate()` when `onNavigate` is not provided

### Technical notes

- No database migration needed
- No edge function changes needed
- The GHL provisioning flow itself is correct — the issue is purely that no author has provisioned yet (all are "pending") and the UI buttons to complete the flow were not wired

