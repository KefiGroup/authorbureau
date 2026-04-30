import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, Send, Headphones, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { toAbbyError } from "@/lib/abby-error";
import DistributeAudiobookModal from "@/components/dashboard/audiobook/DistributeAudiobookModal";
import AudiobookExportCard from "./AudiobookExportCard";

interface Chapter {
  index: number;
  title: string;
  text: string;
  status: string;
  audioUrl: string;
}

interface Props {
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function AudiobookPublishStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const chapters: Chapter[] = stepData.chapters ?? [];
  const ready = chapters.filter((c) => c.status === "audio-generated" && c.audioUrl);
  const totalChars = ready.reduce((sum, c) => sum + c.text.length, 0);
  const estMinutes = Math.max(1, Math.round(totalChars / 14 / 60));
  const setup = stepData.setup ?? {};
  const voiceName = stepData.selectedVoiceName || "Selected voice";
  const published = !!stepData.publishedAt;

  const [distOpen, setDistOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const openDistribution = async () => {
    if (ready.length === 0) {
      toast({ title: "No audio ready", description: "Generate at least one chapter first.", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      // Mark draft as published locally — distribution modal handles the registry write via ba11-publish-audiobook.
      const next = { ...stepData, publishedAt: new Date().toISOString() };
      setStepData(next);
      onMarkEdited("publish");
      setDistOpen(true);
    } catch (e) {
      toast({ title: "Publish failed", description: toAbbyError(e), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{bookTitle || "Your audiobook"}</h3>
            <p className="text-xs text-muted-foreground">Narrated by {voiceName}</p>
          </div>
          {published && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Published</Badge>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Chapters" value={`${ready.length}/${chapters.length}`} />
          <Stat label="Total chars" value={totalChars.toLocaleString()} />
          <Stat label="Est. runtime" value={`~${estMinutes} min`} icon={<Clock className="h-3 w-3" />} />
          <Stat label="Retail" value={setup.retailPriceUsd ? `$${Number(setup.retailPriceUsd).toFixed(2)}` : "—"} />
        </div>
      </Card>

      <Button size="lg" className="w-full" onClick={openDistribution} disabled={publishing || ready.length === 0}>
        {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
         published ? <Send className="h-4 w-4 mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
        {published ? "Open distribution again" : "Publish & Open Distribution"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        We'll prepare retailer-specific packages for ACX (Audible), Spotify, Apple Books, Findaway and your own
        Authors Bureau storefront. You confirm metadata and we generate a downloadable ZIP per channel.
      </p>

      <AudiobookExportCard
        chapters={chapters}
        bookTitle={bookTitle}
        authorName={setup.authorName}
        voiceName={voiceName}
        retailPriceUsd={setup.retailPriceUsd}
      />

      <DistributeAudiobookModal
        open={distOpen}
        onOpenChange={setDistOpen}
        bookId={bookId}
        bookTitle={bookTitle}
        userId={userId}
        chapters={ready.map((c) => ({ index: c.index, title: c.title, audioUrl: c.audioUrl }))}
        onDistributed={() => {
          toast({ title: "Distribution package ready", description: "Check your library for the download links." });
        }}
      />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
