

# Show Lead Magnet Content in Downstream Nodes + Navigation Flow

## Problem
When BP-02 publishes and pushes content to BP-03 (Social Media) and BP-04 (Email Marketing), there is **no visible indication** in those nodes that content has arrived. The node cards on the Brand Products Hub show generic status badges but don't mention the source. And there's no guided "next step" flow leading the author from one node to the next.

## What Changes

### 1. Brand Products Hub — "Fed by Lead Magnets" indicator on node cards
On the `BrandProductsHub.tsx` node cards for BP-03 and BP-04, when their `content_json` contains `source: "BP-02"`, show a small badge like:
- **BP-03 card**: `📱 Social Media` — badge: "📝 Content from Lead Magnets" + status changes to "Ready to Publish"
- **BP-04 card**: `📧 Email Marketing` — badge: "📝 Content from Lead Magnets" + status "Ready to Publish"

This requires fetching `content_json` (currently only `status` is used for badges). Add a lightweight check for `source` field.

### 2. BP-03 Builder — Show "pre-loaded from Lead Magnets" banner
When BP-03 loads and finds `content_json.source === "BP-02"`, show a banner at top of the Review step:
> "Abby has pre-loaded social posts from your Lead Magnet. Review and activate them below."

Skip the Introduction/Generate steps and go straight to Review.

### 3. BP-04 Builder — Same "pre-loaded" banner
Same pattern for BP-04 when nurture emails were pushed from BP-02.

### 4. BP-02 Success Screen — Clear "Next Steps" flow
The success screen already shows clickable cards for Email Nurture and Social Media. Enhance these to be more prominent with:
- Arrow indicators showing the flow: BP-02 → BP-04 → BP-03
- "Continue to next step" primary CTA pointing to the first activated downstream node
- Numbered progression: "Step 1 of 3 complete"

### Files to Edit

| File | Change |
|---|---|
| `src/pages/BrandProductsHub.tsx` | Fetch `content_json` alongside status. Show "Content from Lead Magnets" badge on BP-03/BP-04 cards when `source === "BP-02"`. |
| `src/components/dashboard/builders/bp03/BP03Builder.tsx` | On load, if `content_json.source === "BP-02"`, show pre-loaded banner and skip to Review step. |
| `src/components/dashboard/builders/bp02/BP02Builder.tsx` | Enhance PublishSuccessStep with sequential flow CTA: primary button → next downstream node. Add numbered progression indicator. |

No database or edge function changes needed — the `source: "BP-02"` field is already being written to `content_json` during publish.

