import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Send, CheckCircle2, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

interface Chapter {
  index: number;
  title: string;
  audioUrl?: string;
  audioUrls?: string[];
}

interface DistributeAudiobookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
  chapters: Chapter[];
  onDistributed: (result?: { zipUrl?: string; micrositeUrl?: string }) => void;
  voiceName?: string;
}

const DEFAULT_CREDIT = "Narrated by a digital voice using ElevenLabs technology";

export default function DistributeAudiobookModal({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  userId,
  chapters,
  onDistributed,
  voiceName,
}: DistributeAudiobookModalProps) {
  const recommendedCredit = voiceName && voiceName !== "Selected voice"
    ? `${voiceName} (ElevenLabs AI voice)`
    : DEFAULT_CREDIT;

  const [step, setStep] = useState(1);
  const [narratorCredit, setNarratorCredit] = useState(recommendedCredit);
  const [previewChapterIndex, setPreviewChapterIndex] = useState("0");
  const [description, setDescription] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [resultZipUrl, setResultZipUrl] = useState<string>("");
  const [resultMicrositeUrl, setResultMicrositeUrl] = useState<string>("");

  const trimmed = narratorCredit.trim();
  const matchesBookTitle = !!bookTitle && trimmed.toLowerCase() === bookTitle.trim().toLowerCase();
  const isEmpty = trimmed.length === 0;
  const validationError = isEmpty
    ? "Narrator name is required."
    : matchesBookTitle
    ? `This looks like your book title, not a narrator name. Try "${recommendedCredit}".`
    : null;

  // Load book metadata when modal opens
  useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmed(false);
      return;
    }
    // Prefill recommended narrator credit if empty or still on the legacy default
    setNarratorCredit((prev) => {
      const t = prev.trim();
      if (!t || t === DEFAULT_CREDIT) return recommendedCredit;
      return prev;
    });
    (async () => {
      setLoadingMeta(true);
      try {
        const { data } = await supabase
          .from("books")
          .select("description, author_name, cover_image_url")
          .eq("id", bookId)
          .single();
        if (data) {
          setDescription(data.description || "");
          setAuthorName(data.author_name || "");
          setCoverImageUrl(data.cover_image_url || "");
        }
      } catch (error) { console.error(error); }
      setLoadingMeta(false);
    })();
  }, [open, bookId, recommendedCredit]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${bookId}/cover-audiobook.${ext}`;
    const { error } = await supabase.storage.from("book-covers").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(path);
    setCoverImageUrl(urlData.publicUrl);
    toast({ title: "Cover updated" });
  };

  const callPublish = async (token: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/ba11-publish-audiobook`;
    return fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId,
          narratorCredit: narratorCredit.trim(),
          previewChapterIndex: parseInt(previewChapterIndex),
          description: description.trim(),
          coverImageUrl,
          mode: "publish",
        }),
      },
      90000,
    );
  };

  const handleSend = async () => {
    setSending(true);
    try {
      let token = await getActiveToken();
      if (!token) {
        toast({ title: "Please sign in again", description: "Your session has expired.", variant: "destructive" });
        setSending(false);
        return;
      }
      let res = await callPublish(token);
      if (res.status === 401) {
        const refreshed = await getActiveToken({ forceRefresh: true });
        if (refreshed) {
          token = refreshed;
          res = await callPublish(token);
        }
      }
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      if (data?.error) throw new Error(data.error);
      if (data && data.success === false) throw new Error(data.message || "Publish failed");
      setResultZipUrl(data?.zipUrl || "");
      setResultMicrositeUrl(data?.micrositeUrl || data?.publicAuthorPageUrl || "");
      toast({ title: "Audiobook published", description: "Live on your author site. Export pack ready for ACX, Spotify & Apple Books." });
      setStep(4);
      onDistributed();
    } catch (e: any) {
      toast({ title: "Distribution failed", description: e?.message || "Please try again.", variant: "destructive" });
    }
    setSending(false);
  };

  const doneChapters = chapters.filter(c => c.audioUrl || (c.audioUrls && c.audioUrls.length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Prepare Your Audiobook for Distribution</DialogTitle>
              <DialogDescription>Set narrator credits and select a preview chapter for storefronts.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Narrator Name for Credits</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 px-2 text-xs"
                    onClick={() => setNarratorCredit(recommendedCredit)}
                    disabled={trimmed === recommendedCredit}
                  >
                    Reset to recommended
                  </Button>
                </div>
                <Input
                  value={narratorCredit}
                  onChange={e => setNarratorCredit(e.target.value)}
                  maxLength={200}
                  className={validationError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {validationError ? (
                  <p className="text-xs text-destructive mt-1.5">{validationError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Shown as "Narrated by …" on Audible, Spotify, Apple Books and your microsite. ACX requires you
                    to disclose AI/synthetic narration — keep "ElevenLabs AI voice" (or similar wording) in the credit.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Chapter for Audio Preview</label>
                <Select value={previewChapterIndex} onValueChange={setPreviewChapterIndex}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map(ch => (
                      <SelectItem key={ch.index} value={String(ch.index)}>
                        {ch.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  A 5-minute preview of this chapter will be used on storefronts like Audible and Spotify.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!!validationError}>
                Next: Review Metadata <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Review Your Audiobook Details</DialogTitle>
              <DialogDescription>Confirm the metadata that will be sent to distribution platforms.</DialogDescription>
            </DialogHeader>
            {loadingMeta ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {/* Cover Art */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Cover Art</label>
                  <div className="flex items-center gap-4">
                    {coverImageUrl ? (
                      <img src={coverImageUrl} alt="Cover" className="w-20 h-28 object-cover rounded-md border border-border shadow-sm" />
                    ) : (
                      <div className="w-20 h-28 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span><Upload className="h-3.5 w-3.5 mr-1.5" />Upload New Cover</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </label>
                  </div>
                </div>
                {/* Title */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Book Title</label>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{bookTitle}</p>
                </div>
                {/* Author */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Author Name</label>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{authorName || "—"}</p>
                </div>
                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Book Description</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    maxLength={4000}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Confirm & Send <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Publish Your Audiobook</DialogTitle>
              <DialogDescription>Here's what happens when you publish.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
                <p>
                  <span className="font-semibold">{bookTitle}</span> ({doneChapters.length} chapter
                  {doneChapters.length !== 1 ? "s" : ""}) will be:
                </p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>Saved to your Library</strong> for future reuse and edits.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>Published on your author site</strong> with a Buy button so readers can pay to download.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span><strong>Packaged as an Export Pack</strong> formatted for ACX, Spotify, and Apple Books — you upload to each retailer when ready.</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <Checkbox
                  id="confirm-rights"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="confirm-rights" className="text-sm leading-snug cursor-pointer">
                  I confirm that I have the rights to publish this audiobook on my author site and to upload it to any retailer I choose.
                </label>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSend} disabled={!confirmed || sending}>
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Publishing…</>
                ) : (
                  <><Send className="h-4 w-4 mr-1.5" />Publish Audiobook</>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Audiobook Published
              </DialogTitle>
              <DialogDescription>
                Your audiobook is saved to your Library and live on your author site.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4 text-sm">
              {resultMicrositeUrl && (
                <a
                  href={resultMicrositeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">View on your author site</p>
                    <p className="text-xs text-muted-foreground">Readers can buy and download here.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {resultZipUrl && (
                <a
                  href={resultZipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">Download Export Pack (.zip)</p>
                    <p className="text-xs text-muted-foreground">
                      Manifest + per-channel specs + chapter URLs for ACX, Spotify, Apple Books.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                Authors Bureau does not submit to retailers on your behalf. Use the Export Pack to upload to ACX, Findaway/Spotify, or Apple Books for Authors when you're ready.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
