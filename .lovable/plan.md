## Reframe BA-11 "Send to PublishNow" → Publish + Export Pack

No backend logic change — the existing `ba11-publish-audiobook` edge function already saves to library, flips BA-11 to live on the author's microsite (with Stripe Buy button), and builds the ACX/Spotify/Apple submission ZIP. This sprint fixes the misleading author-facing copy and surfaces the export pack download.

### Edits

**`supabase/functions/ba11-publish-audiobook/index.ts`**
- Default `channels` → `["platform", "acx", "spotify", "apple"]` (drop google/findaway from default).
- README header: `Submission Package` → `Audiobook Export Pack`.

**`src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`**
- Step 3 title: "Ready to Distribute?" → **"Publish Your Audiobook"**.
- Step 3 body replaced with three bullets:
  1. Save to your Library
  2. Publish on your author site (readers can pay to download)
  3. Export Pack ready for ACX, Spotify & Apple Books (you upload)
- Primary button: "Send to PublishNow" → **"Publish Audiobook"**.
- Rights checkbox copy drops "all distribution platforms".
- Add a Step 4 success state showing **Download Export Pack (.zip)** + **View on your site** links (using `zipUrl` and `micrositeUrl` returned by the function) before closing.
- Success toast: "Audiobook published — live on your author site, export pack ready for ACX, Spotify & Apple Books."

### Verify after deploy
1. Modal step 3 shows new copy + "Publish Audiobook" button.
2. Click → success step shows zip + microsite links.
3. `/{authorSlug}/audiobook` renders with working Buy button.
4. ZIP contains manifest.json + README (ACX/Spotify/Apple sections) + chapter-urls.txt.
