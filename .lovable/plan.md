

# Fix: Manuscript Upload Fails for All Document Types

## Root Cause (from logs)

Two distinct failures:
1. **EPUB**: Gemini AI returns `400 Unsupported MIME type: application/epub+zip` — it simply cannot process EPUB files
2. **PDF/DOCX**: AI extraction via Gemini times out (exceeds edge function wall-clock limit) or returns errors for large files

Both hit the same code path: binary file → base64 → send to AI gateway as `image_url`. This approach is fundamentally unreliable for document text extraction.

## Fix: Client-Side Extraction for PDF/DOCX + Native EPUB Parsing in Edge Function

### 1. `src/components/dashboard/ManuscriptUpload.tsx`
- For **PDF**: use `pdfjs-dist` (already installed) to extract text page-by-page in the browser
- For **DOCX**: use `mammoth` (already installed) to call `mammoth.extractRawText()`
- For **TXT**: use `file.text()`
- For **EPUB**: send as FormData to edge function (parsed server-side)
- After client-side extraction (PDF/DOCX/TXT), send the **extracted text** as JSON to a new edge function action `{ action: "upload-text", bookId, text, fileName }`
- Add `AbortController` with 3-minute timeout for EPUB fallback
- Wrap fetch response handling in try/catch for non-JSON responses (504 HTML pages)
- Update progress stage labels for client-side extraction flow

### 2. `supabase/functions/parse-manuscript/index.ts`
- Add new JSON action `upload-text`: accepts `{ action: "upload-text", bookId, text, fileName }`, verifies book access, stores text directly as `source_material` in `generated_assets` — no AI call needed
- For **EPUB via FormData**: replace AI extraction with native ZIP parsing — EPUB is a ZIP of XHTML files. Use Deno's `JSZip` or built-in `CompressionStream`/`fflate` to unzip, find content files from `container.xml` → `content.opf` → spine items, extract text by stripping HTML tags from each XHTML chapter
- Add 50s `AbortSignal.timeout` on any remaining AI fetch calls as safety net
- Add diagnostic logging after AI calls

### 3. Downstream QC
- `BookHubOverview.tsx` (line 85): queries `generated_assets` via local Cloud client with `author_id = userId` — the `userId` comes from shared backend session. The edge function stores with `book.author_id` which may differ. Fix: query by `book_id` only (remove `author_id` filter) since `asset_type` + `book_id` is already unique
- `AudiobookStudio.tsx` (line 70): same pattern — already filters by `book_id` + `asset_type` without `author_id`, so this is fine
- `BuildMyBusiness.tsx` (line 112-116): queries with `author_id = user.id` via Cloud client — shared backend users won't match. Fix: route through edge function or remove `author_id` filter

## Flow After Fix
```text
PDF/DOCX/TXT → Browser extracts text → JSON { action: "upload-text" } → Edge fn stores → Done (<5s)
EPUB → FormData to edge fn → Native ZIP parse → Extract XHTML text → Store → Done (<10s)
No AI gateway involved. No timeouts. No MIME type errors.
```

