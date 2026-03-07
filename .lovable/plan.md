

# Fix: Non-Clickable "Generate from AI Engine → Build My Business" Badge

## Problem

The "Generate from AI Engine → Build My Business" element in `WorkbooksManager.tsx` (and `WebinarsManager.tsx`) is a `<Badge>` — a non-interactive display component with no `onClick` handler. Users expect it to navigate to the "Build My Business" section.

## Fix

### `src/components/dashboard/WorkbooksManager.tsx` (line 194)

Replace the `<Badge>` with a `<Button>` that navigates to the `build-business` section. The component needs to accept an `onNavigate` prop (same pattern used throughout the dashboard).

- Add `onNavigate?: (section: string) => void` prop to the component
- Replace `<Badge variant="secondary">Generate from AI Engine → Build My Business</Badge>` with:
  ```tsx
  <Button variant="secondary" onClick={() => onNavigate?.("build-business")}>
    Generate from AI Engine → Build My Business
  </Button>
  ```

### `src/components/dashboard/WebinarsManager.tsx` (line 97)

Same fix — replace `<Badge>` with a clickable `<Button>` that navigates to `build-business`.

### `src/pages/AuthorDashboard.tsx` (lines 228, 230)

Pass `handleNavigate` to both components:
- `<WorkbooksManager onNavigate={handleNavigate} />`
- `<WebinarsManager onNavigate={handleNavigate} />`

