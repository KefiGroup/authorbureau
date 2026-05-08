---
name: Product Cover Generation
description: AI-generated product covers (workbook, home-study, course, special-edition) emulate the parent book cover via Nano Banana edit; stored on author_nodes.cover_image_url
type: feature
---
- Edge function `generate-product-cover` calls Lovable AI Gateway (`google/gemini-2.5-flash-image`) with the book's `cover_image_url` as reference image.
- Output PNG uploaded to public `product-covers` bucket at `{authorId}/{nodeId}-{ts}.png`.
- URL written to `author_nodes.cover_image_url`.
- Microsite renderer (`WorkbookSalesPage` and other product pages) prefers `data.node.cover_image_url`, falls back to SVG `WorkbookCoverArt`.
- Builders fire-and-forget the call inside their publish handler. BP-06 wired; extend to BP-07/BP-08/BP-09 the same way.
- Pass `force: true` to regenerate.
- Inputs: either `authorNodeId` OR `authorId + nodeId (+ bookId)`.
