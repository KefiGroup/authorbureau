## Goal

Author downloads a ZIP containing the audiobook MP3s + a clear printed guide telling them exactly how to prep and upload to ACX, Spotify, Apple Books, and Findaway themselves.

No transcoding on our side. No new infrastructure. Two surgical changes only.

## Change 1 — Bump ElevenLabs output to 192 kbps

File: `supabase/functions/ba11-audiobook-generate/index.ts`, line 102.

```diff
- `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
+ `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_192`,
```

Why: 192 kbps is the bitrate ACX requires. Output is still stereo (ACX wants mono) — author handles that in Audacity per the guide below. Existing already-generated chapters keep working at 128 kbps; only new generations are 192.

## Change 2 — Add `ACX-UPLOAD-GUIDE.txt` to the ZIP

File: `supabase/functions/ba11-publish-audiobook/index.ts`, around line 331 where we write `README.txt`.

Add a second file `ACX-UPLOAD-GUIDE.txt` with this content (verbatim, no emdashes per microsite rule):

```
HOW TO UPLOAD YOUR AUDIOBOOK TO ACX, SPOTIFY, APPLE BOOKS AND FINDAWAY
======================================================================

WHAT YOU HAVE IN THIS PACK
--------------------------
- chapter-001.mp3 ... chapter-NNN.mp3   (your narrated chapters)
- chapter-urls.txt                       (direct download URLs)
- manifest.json                          (technical metadata)


STEP 1 - PREP YOUR FILES (10 minutes, free)
-------------------------------------------
The MP3s are 192 kbps stereo at 44.1 kHz. ACX and Findaway require MONO.
Spotify, Apple Books and Google Play accept stereo as is.

To convert to mono for ACX / Findaway:

  1. Download Audacity (free): https://www.audacityteam.org/
  2. File > Open > select all chapter-*.mp3 files
  3. For each file: Tracks > Mix > Mix Stereo Down to Mono
  4. Effect > Loudness Normalization > Target -20 LUFS
  5. Effect > Limiter > Soft Limit, Limit to -3 dB
  6. File > Export > Export as MP3 > 192 kbps, Constant
  7. Save back over the original filename

That is the full ACX spec: 192 kbps CBR, mono, 44.1 kHz,
peak <= -3 dB, RMS between -23 and -18 dB.

VERIFY before uploading: ACX has a free audio quality checker at
https://www.acx.com/help/narrators/200484930
Drop one chapter in. If it passes there, ACX will accept it.


STEP 2 - PER-RETAILER UPLOAD INSTRUCTIONS
-----------------------------------------

[ACX / AUDIBLE]
  1. Sign up: https://www.acx.com/
  2. Add your book (search by title, or claim it via your Amazon KDP account)
  3. Upload the mono 192 kbps files from Step 1
  4. Record a separate 1-5 minute "retail audio sample" (use chapter 1 intro)
  5. Add opening credits at the start of file 1:
       "{Book Title}, written by {Your Name}, narrated by {Narrator Name}"
  6. Add closing credits at the end of the final file:
       "The end of {Book Title} by {Your Name}"
  7. Submit for ACX QA review (typically 2 to 4 weeks)
  Royalty: 25% non-exclusive, 40% exclusive to Audible.

[FINDAWAY VOICES]  (distributes to Audible, Spotify, Scribd, Hoopla, libraries, 40+ retailers)
  1. Sign up: https://findawayvoices.com/
  2. Use the same mono 192 kbps files from Step 1
  3. Set your retail price (you keep 80%)
  4. Pick which retailers to distribute to
  Recommended if you want one upload to reach Audible AND everyone else.

[SPOTIFY FOR AUTHORS]
  Spotify ingests audiobooks via Findaway Voices only. See above.

[APPLE BOOKS]
  1. Sign up: https://authors.apple.com/
  2. Use the original 192 kbps stereo files (Apple accepts stereo)
  3. Cover art must be 3000 x 3000 px JPG or PNG
  4. Submit for review
  Royalty: 70% to you, 30% to Apple.

[GOOGLE PLAY BOOKS]
  1. Sign up: https://play.google.com/books/publish/
  2. Use the original 192 kbps stereo files
  Royalty: 52% to you, 48% to Google.


STEP 3 - WHAT IS ALREADY DONE FOR YOU
-------------------------------------
- Your audiobook is LIVE on your Authors Bureau site (Buy Now enabled)
- Saved to your Library
- This export pack is ready for retailer upload

You can take as long as you like to submit to retailers. Your Authors
Bureau storefront keeps selling in the meantime.


QUESTIONS? support@authorsbureau.com
```

That's it. No new functions, no migrations, no new dependencies, no UI changes. Two file edits.

## What stays exactly as-is

- Publish flow, "Live" status logic, microsite, Stripe link, library_asset stamping, distribution checklist UI you already approved — none of it touched.
- Existing 128 kbps chapters: still work, still sell, still in the ZIP. Author can either re-generate to get 192 kbps or upload the 128 kbps to Spotify/Apple/Google as-is.

## Risk

Effectively zero. The only behavior change is one URL parameter (128→192) and one extra text file in a ZIP. If 192 kbps somehow fails at ElevenLabs, we rollback the one-line change.

## Approval

Please approve and I'll make the two edits and redeploy `ba11-publish-audiobook` and `ba11-audiobook-generate`.