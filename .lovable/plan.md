

# Audit: GHL White-Labeling Compliance

## Findings

GHL is **not fully white-labeled**. The brand name "GoHighLevel" and internal terminology like "GHL funnel" leak into the author-facing UI in three files.

### Exposed GHL References (Author-Visible)

| File | Line | What the author sees |
|------|------|---------------------|
| `ConnectedAccountsTab.tsx` | 147 | **"GoHighLevel"** as the connection label |
| `BP02Builder.tsx` | 156 | Toast: *"Connect GoHighLevel in Settings to activate..."* |
| `BP02Builder.tsx` | 450 | Helper text: *"Publishing creates your GHL funnel, contact tags..."* |

### Internal-Only References (Not Author-Visible — OK)

Code comments, variable names (`ghlStatus`, `ensureGhlProvisioned`), console logs, and edge function internals all reference GHL. These are fine — authors never see them.

## Fix Plan

Three lines of copy to change:

1. **`src/components/settings/ConnectedAccountsTab.tsx` line 147**
   - Change `"GoHighLevel"` → `"Authors Bureau Marketing Engine"` (or simply `"Marketing Automation"`)

2. **`src/components/dashboard/builders/bp02/BP02Builder.tsx` line 156**
   - Change `"Lead magnet saved. Connect GoHighLevel in Settings to activate your live opt-in page."` → `"Lead magnet saved. Connect your Marketing Hub in Settings to activate your live opt-in page."`

3. **`src/components/dashboard/builders/bp02/BP02Builder.tsx` line 450**
   - Change `"Publishing creates your GHL funnel, contact tags, and lead capture workflow automatically."` → `"Publishing creates your opt-in funnel, contact tags, and lead capture workflow automatically."`

No structural or backend changes needed. Three string replacements across two files.

