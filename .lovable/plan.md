

## Fix: Add In-Dashboard Editing to Author Profile

### Problem
When a user clicks "Author Profile" in the sidebar, the `ProfileEditor` component renders in **view mode**. The only edit action available is "Edit on PublishNow" which opens an external site via SSO. There is no button to edit the profile directly within the dashboard, even though the full edit form already exists in the code (behind `editMode` state).

### Solution
Add an "Edit Profile" button alongside the existing "Edit on PublishNow" button in the ProfileEditor's view mode header. This gives users two clear options:
1. **Edit Profile** — opens the inline editor (already built, just unreachable)
2. **Edit on PublishNow** — keeps the existing SSO redirect for users who prefer that flow

### Changes

**File: `src/components/dashboard/ProfileEditor.tsx`**

In the view mode header (around line 627-635), add an "Edit Profile" button that sets `editMode(true)`:

```
Before:
  <Button size="sm" ... onClick={handleEditOnPublishNow}>
    <Pencil .../> Edit on PublishNow
  </Button>

After:
  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
    <Pencil .../> Edit Profile
  </Button>
  <Button size="sm" ... onClick={handleEditOnPublishNow}>
    <ExternalLink .../> Edit on PublishNow
  </Button>
```

This is a single-file, ~3-line change. The edit form, save logic, and cancel button already exist and work correctly.

### What Won't Change
- No routing changes
- No database changes
- The PublishNow SSO flow remains intact
- The "Sync" button stays as-is
- The new-profile setup flow (Route 1 / Route 2 cards) is untouched

