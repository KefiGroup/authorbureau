import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, FileAudio, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface Chapter {
  index: number;
  title: string;
  text?: string;
  audioUrl: string;
  status?: string;
}

interface Props {
  chapters: Chapter[];
  bookTitle: string;
  authorName?: string;
  voiceName?: string;
  retailPriceUsd?: number | string;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "audiobook";

const safeName = (title: string, idx: number) =>
  `${String(idx + 1).padStart(2, "0")}-${slug(title || `chapter-${idx + 1}`)}.mp3`;

function buildAcxGuide(opts: {
  bookTitle: string;
  authorName?: string;
  voiceName?: string;
  chapters: Chapter[];
}): string {
  const { bookTitle, authorName, voiceName, chapters } = opts;
  const lines = [
    `ACX SUBMISSION GUIDE — ${bookTitle}`,
    `Author: ${authorName || "(your name)"}`,
    `Narrator credit: ${voiceName || "Digital narrator (ElevenLabs)"}`,
    "",
    "TECHNICAL REQUIREMENTS",
    "- Format: MP3, Constant Bit Rate (CBR), 192 kbps or higher",
    "- Sample rate: 44.1 kHz",
    "- Channels: Mono recommended for spoken word",
    "- Peak: -3dB max",
    "- RMS: between -23dB and -18dB",
    "- Noise floor: -60dB or lower",
    "- Each file: opens with 0.5-1s of room tone, ends with 1-5s of room tone",
    "",
    "FILE NAMING (this package follows ACX naming)",
    "- 00-opening-credits.mp3 (optional)",
    ...chapters.map((c, i) => `- ${safeName(c.title, i)}`),
    "- 99-closing-credits.mp3 (optional)",
    "",
    "OPENING CREDITS SCRIPT",
    `"${bookTitle}, written by ${authorName || "(author)"}, narrated by ${voiceName || "(narrator)"}."`,
    "",
    "CLOSING CREDITS SCRIPT",
    `"This has been ${bookTitle}, written by ${authorName || "(author)"} and narrated by ${voiceName || "(narrator)"}. Production by Authors Bureau."`,
    "",
    "SUBMISSION STEPS",
    "1. Go to https://www.acx.com and sign in (or create) your account.",
    "2. Claim your title (link your Kindle/print edition).",
    "3. Choose 'I already have a producer' / 'I will upload finished files'.",
    "4. Upload retail sample (≤ 5 minutes) — use chapter 1 from this package.",
    "5. Upload each chapter MP3 in order.",
    "6. Submit cover art (minimum 2400x2400, square, RGB JPG/PNG, ≤ 4MB).",
    "7. Confirm rights & royalty option, submit for QA review (typically 10-14 days).",
  ];
  return lines.join("\n");
}

function buildDistributionChecklist(opts: {
  bookTitle: string;
  authorName?: string;
  retailPriceUsd?: number | string;
  chapters: Chapter[];
}): string {
  const { bookTitle, authorName, retailPriceUsd, chapters } = opts;
  const totalChars = chapters.reduce((sum, c) => sum + (c.text?.length || 0), 0);
  const estMinutes = Math.max(1, Math.round(totalChars / 14 / 60));
  const lines = [
    `DISTRIBUTION CHECKLIST — ${bookTitle}`,
    `Author: ${authorName || "(your name)"}`,
    `Retail price (suggested): ${retailPriceUsd ? `$${Number(retailPriceUsd).toFixed(2)}` : "(set on each platform)"}`,
    `Chapters: ${chapters.length}`,
    `Estimated runtime: ~${estMinutes} minutes`,
    "",
    "PLATFORM CHECKLIST",
    "",
    "[ ] ACX / Audible (Amazon)",
    "    - URL: https://www.acx.com",
    "    - Royalty: 40% exclusive / 25% non-exclusive",
    "    - Use the included ACX_SUBMISSION_GUIDE.txt",
    "",
    "[ ] Spotify for Authors / Findaway Voices",
    "    - URL: https://findawayvoices.com",
    "    - Distributes to Spotify, Audible (non-exclusive), Apple Books, Google Play, Kobo, Scribd, libraries",
    "    - Royalty: 80% to author after retail/wholesale split",
    "",
    "[ ] Apple Books (direct)",
    "    - URL: https://authors.apple.com",
    "    - Requires Apple ID + tax info; upload via iTunes Producer or Findaway",
    "",
    "[ ] Google Play Books",
    "    - URL: https://play.google.com/books/publish",
    "    - Free to upload; Google sets retail price",
    "",
    "[ ] Authors Bureau native storefront",
    "    - Already wired to your microsite as a digital product",
    "    - Stripe handles checkout; you keep 92% (8% platform fee)",
    "",
    "ASSETS IN THIS ZIP",
    "- /audio/*.mp3 — every chapter MP3 (ACX-named)",
    "- ACX_SUBMISSION_GUIDE.txt — copy/paste ready credits + checklist",
    "- DISTRIBUTION_CHECKLIST.txt — this file",
    "- metadata.json — book + chapter metadata for ingestion tools",
  ];
  return lines.join("\n");
}

async function downloadOneMp3(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function AudiobookExportCard({
  chapters,
  bookTitle,
  authorName,
  voiceName,
  retailPriceUsd,
}: Props) {
  const [busy, setBusy] = useState<null | "zip" | string>(null);

  const ready = chapters.filter(
    (c) => c.audioUrl && (c.status === "audio-generated" || !c.status),
  );
  const hasAny = ready.length > 0;

  const handleZip = async () => {
    if (busy || !hasAny) return;
    setBusy("zip");
    try {
      const zip = new JSZip();
      const audioFolder = zip.folder("audio")!;
      let fetched = 0;
      for (let i = 0; i < ready.length; i++) {
        const c = ready[i];
        try {
          const res = await fetch(c.audioUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          audioFolder.file(safeName(c.title, c.index ?? i), blob);
          fetched++;
        } catch (e) {
          console.error(`[AudiobookExportCard] chapter ${i + 1} fetch failed`, e);
        }
      }
      if (fetched === 0) throw new Error("No chapter audio could be fetched.");

      zip.file(
        "ACX_SUBMISSION_GUIDE.txt",
        buildAcxGuide({ bookTitle, authorName, voiceName, chapters: ready }),
      );
      zip.file(
        "DISTRIBUTION_CHECKLIST.txt",
        buildDistributionChecklist({ bookTitle, authorName, retailPriceUsd, chapters: ready }),
      );
      zip.file(
        "metadata.json",
        JSON.stringify(
          {
            book_title: bookTitle,
            author: authorName || null,
            narrator_credit: voiceName || null,
            chapters: ready.map((c, i) => ({
              index: c.index ?? i,
              title: c.title,
              filename: safeName(c.title, c.index ?? i),
              characters: c.text?.length ?? null,
            })),
            generated_at: new Date().toISOString(),
            generated_by: "Authors Bureau",
          },
          null,
          2,
        ),
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug(bookTitle)}-audiobook-package.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(`ZIP ready: ${fetched} chapter${fetched === 1 ? "" : "s"} + ACX guide + checklist.`);
    } catch (err) {
      console.error("[AudiobookExportCard] zip failed", err);
      toast.error(err instanceof Error ? err.message : "ZIP export failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleSingle = async (c: Chapter) => {
    if (busy) return;
    setBusy(`mp3-${c.index}`);
    try {
      await downloadOneMp3(c.audioUrl, safeName(c.title, c.index));
    } catch (err) {
      console.error("[AudiobookExportCard] mp3 download failed", err);
      toast.error(err instanceof Error ? err.message : "MP3 download failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Export Audiobook Package
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download every chapter MP3, or grab the full ZIP with ACX submission guide and distribution checklist — ready for Audible, Spotify, Apple Books, and beyond.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          disabled={!hasAny || busy !== null}
          onClick={handleZip}
          className="w-full"
          aria-label="Download full audiobook ZIP package"
        >
          {busy === "zip" ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-1.5" />
          )}
          Download Full ZIP ({ready.length} chapter{ready.length === 1 ? "" : "s"} + ACX guide)
        </Button>

        {hasAny && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <p className="text-xs font-medium text-muted-foreground">Or download individual MP3s:</p>
            {ready.map((c) => (
              <div
                key={c.index}
                className="flex items-center gap-2 text-xs border border-border rounded-md px-2 py-1.5"
              >
                <FileAudio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0 truncate">
                  {String((c.index ?? 0) + 1).padStart(2, "0")}. {c.title}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={busy !== null}
                  onClick={() => handleSingle(c)}
                  aria-label={`Download chapter ${(c.index ?? 0) + 1} MP3`}
                >
                  {busy === `mp3-${c.index}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileDown className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!hasAny && (
          <p className="text-xs text-destructive">
            Generate at least one chapter audio in the previous step to enable downloads.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
