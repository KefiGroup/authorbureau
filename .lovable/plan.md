## Spot-check results — adopter builder silent-catch audit

I checked the publish flow in all 6 remaining adopter builders (BP-01, BP-03, BP-04, BP-06, BA-11, BA-14) for the same swallowed-`catch` pattern that left Pauline's BP-08/BP-09 stuck.

### Findings

| Builder | Status | Notes |
|---|---|---|
| **BP-01** | 🔴 Same bug | `handlePublish` (lines 207-219) wraps `uploadAndRegisterLibraryAsset` in `try { … } catch { console.warn(…); libraryAsset = null }` and still calls `publishNodeToSite`. |
| **BP-03** | 🔴 Same bug | `handleActivate` (lines 397-411) wraps the upload in the same swallowed `catch` and still calls `persistNodeState("live", …)`. |
| **BP-04** | ✅ Clean | No upload — relies on `deriveLibraryAsset` to stamp `kind=external_url` from the microsite URL. Correct by design. |
| **BP-06** | ✅ Fixed | Already corrected in Sprint 55c (lines 297-313): surfaces upload error, calls `setStep(2)`, returns. **This is the pattern to mirror.** |
| **BA-11** | ✅ Out of scope | Publish lives in the Audiobook Studio "Save & Distribute" flow, not in `BA11Builder.tsx`. The new server-side 422 guard in `save-author-node:publish` will now block any path that tries to flip BA-11 live without a `library_asset`. |
| **BA-14** | ✅ Trusted to server guard | `handlePublish` calls `publishNodeToSite` without a `libraryAsset` argument. Today the row's `library_asset` (kind=`podcast_pack`) is written elsewhere when the podcast pack is generated. Server-side 422 guard now blocks publish if that pack is missing — correct fail-fast behavior. |

### What to fix

Two builders, same one-line pattern. Mirror BP-06's fixed shape (toast + `setStep(2)` + return on upload failure).

### 1. `BP01Builder.tsx` `handlePublish`
Replace the swallowed `catch` (lines 207-219) with:
```ts
let libraryAsset: Record<string, unknown> | null = null;
try {
  const txtBlob = buildBp01Txt(content, authorName, bookTitle || detectedBookTitle || "your book");
  const safe = (bookTitle || "email-marketing").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
  const asset = await uploadAndRegisterLibraryAsset({
    authorId: authorId!,
    nodeId: "BP-01",
    title: content?.lead_magnet_offer?.title || "Email Marketing Kit",
    primary: { blob: txtBlob, filename: `${safe}-email-kit.txt`, kind: "email_sequence" },
  });
  libraryAsset = asset as unknown as Record<string, unknown>;
} catch (uploadErr) {
  const msg = (uploadErr as Error)?.message || "Upload failed";
  console.error("[BP-01] publish: library upload failed", uploadErr);
  toast.error("Couldn't save email kit to your Library", {
    description: `${msg}. Publish was cancelled — try again or contact support.`,
    duration: 14000,
  });
  setError(msg);
  setStep(2);
  return;
}
```

### 2. `BP03Builder.tsx` `handleActivate`
Replace the swallowed `catch` (lines 397-411) with the same pattern (toast, `setStep(2)`, `setIsActivating(false)` via the existing `finally`, return). Do not proceed to `persistNodeState("live", …)` if the upload failed.

### 3. Memory update
Add a one-line note to `mem://architecture/library-asset-adoption`:
> Sprint 55d: BP-01 and BP-03 silent-catch removed (same bug class as BP-08/09). All 6 file-uploading adopters (BP-01/03/06/08/09 + workbook PDF) now fail fast on upload errors. BP-04/BA-11/BA-14 covered by the server-side 422 guard.

### 4. Verification
- Re-run `daily-audit` — expect green/amber unchanged. The fix is preventative; no current authors are stuck on BP-01 or BP-03 (already verified during the platform sweep on Pauline).
- No data repair needed.

### Files touched
- `src/components/dashboard/builders/bp01/BP01Builder.tsx`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- Memory: `mem://architecture/library-asset-adoption`

### Out of scope
- BP-04, BP-06, BA-11, BA-14 (already correct or covered by server guard).
- Refactoring the duplicated try/catch shape into a shared helper — worth doing in a later cleanup sprint, not here.
