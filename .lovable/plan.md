

# Sprint 27 Bug Fixes — Test Report Remediation

```
ARCHITECTURE CHECKLIST:
✅ SharedPublishStep.tsx touched? → NO
✅ UniversalBuilderStudio.tsx touched? → NO
✅ New sidebar item added? → NO
✅ New GHL edge function created? → NO
✅ author_nodes touched? → NO
✅ Author-facing text contains banned words? → Zero
✅ Subscription tier values used? → N/A
```

## Bugs from Test Report

### Bug 1 (Critical) — Lead Magnet Quiz Does Not Advance After Form Submission

**File:** `src/pages/MicrositePage.tsx`

**Root cause:** The `handleGateSubmit` function calls `await onSubmit(e)`, which internally catches errors without re-throwing. On **success**, `submitted` is set to `true` and `setStage("quiz")` runs — this should work. However, there are two issues:

1. If `microsite-action` returns an error (e.g. missing `author_id`), the catch block swallows it but `setStage("quiz")` still runs, putting the user on a quiz with no lead captured.
2. If the function call succeeds but the component re-renders with `submitted=true` before `setStage("quiz")` takes effect, there may be a race condition.

**Fix:**
- Make `handleGateSubmit` check the outcome before advancing. The parent `handleSubmit` should return a boolean (or the child should check `submitted` state).
- Refactor: have `handleSubmit` return `true`/`false` instead of setting state. `handleGateSubmit` checks the return value before calling `setStage("quiz")`.
- Add error handling so if the lead capture fails, the user sees a toast but stays on the gate form.

```typescript
// In handleSubmit — return success boolean
const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
  e.preventDefault();
  if (!email || submitting) return false;
  setSubmitting(true);
  try {
    const res = await supabase.functions.invoke("microsite-action", { ... });
    if (res.error) throw res.error;
    setSubmitted(true);
    toast({ title: "Success!", description: res.data?.message || "Thank you!" });
    return true;
  } catch (err) {
    console.error("Submit error:", err);
    toast({ title: "Something went wrong", variant: "destructive" });
    return false;
  } finally {
    setSubmitting(false);
  }
};

// In LeadMagnetPage handleGateSubmit
const handleGateSubmit = async (e: React.FormEvent) => {
  const success = await onSubmit(e);
  if (success && isQuiz && questions.length > 0) {
    setStage("quiz");
  }
};
```

- Update the `FormPageProps` type so `onSubmit` returns `Promise<boolean>`.

---

### Bug 2 (Critical) — Connect Settings Navigation

**Finding after code review:** The Connect Settings sidebar item correctly calls `onSectionChange("connect-settings")` → `dashboardNavigate("/account-settings?tab=connections")`. This is standard React Router navigation, NOT an SSO redirect.

**However**, the test report says it triggers a PublishNow SSO redirect. This could happen if the click event somehow bubbles to the sister links section below, or if there's a CSS overlap issue.

**Fix:**
- Add `e.stopPropagation()` to the Connect Settings button click handler as a safety measure.
- Verify the rendered order: Connect Settings button is rendered BEFORE the sister platform links in the DOM, so no overlap should occur. If the tester clicked the wrong button (AI Writing Studio or AI Publishing Studio), that would explain the SSO redirect.
- No code change needed unless the overlap is confirmed. I will add a defensive `e.stopPropagation()` to all `revenueToolsItems` buttons.

---

### Bug 3 (High) — `?section=connect-settings` URL Not Handled

**File:** `src/pages/AuthorDashboard.tsx`

**Root cause:** When the URL is `/dashboard?section=connect-settings`, the `useEffect` sync (line 108-113) sets `activeSection` to `"connect-settings"`. But the redirect logic that converts `connect-settings` to `/account-settings?tab=connections` only runs inside `setActiveSection` (the manual click handler, lines 142-144). The URL sync effect bypasses that handler.

**Fix:** Add a check in the URL sync effect:

```typescript
useEffect(() => {
  const urlSection = searchParams.get("section") as DashboardSection | null;
  if (urlSection && urlSection !== activeSection) {
    if (urlSection === "connect-settings") {
      dashboardNavigate("/account-settings?tab=connections", { replace: true });
      return;
    }
    setActiveSectionState(urlSection);
  }
}, [searchParams]);
```

---

### Bug 4 (Medium) — Stale Brand Products Counter

**File:** `src/hooks/useAuthorStats.ts`

**Root cause:** Module-level cache (`cachedStats`) with a 30-second TTL means navigating from sidebar → Brand Products shows stale data until the cache expires.

**Fix:** Force-refetch stats when navigating to Brand Products hub. In `BrandProductsHub.tsx` (or wherever the counter is displayed), call `refetch()` on mount.

Alternatively, reduce the cache TTL from 30s to 10s, or invalidate the cache when navigating between sections.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/MicrositePage.tsx` | `handleSubmit` returns boolean; `handleGateSubmit` only advances on success; update `FormPageProps` |
| `src/pages/AuthorDashboard.tsx` | URL sync effect handles `connect-settings` redirect |
| `src/hooks/useAuthorStats.ts` | Reduce cache TTL or expose cache invalidation |

## What This Fixes

- Quiz form reliably advances only after successful lead capture
- `/dashboard?section=connect-settings` URL correctly redirects to Account Settings connections tab
- Brand Products counter stays consistent across navigation

