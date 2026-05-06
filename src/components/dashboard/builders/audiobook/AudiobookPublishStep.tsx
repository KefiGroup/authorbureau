import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Rocket, Send, Headphones, Clock, Library, CheckCircle2,
  ExternalLink, Copy, Save, Loader2, Circle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import DistributeAudiobookModal from "@/components/dashboard/audiobook/DistributeAudiobookModal";
import AudiobookExportCard from "./AudiobookExportCard";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

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

type ChannelKey = "acx" | "spotify" | "apple";
const CHANNEL_LABELS: Record<ChannelKey, string> = {
  acx: "Submitted to ACX (Audible)",
  spotify: "Submitted to Spotify / Findaway",
  apple: "Submitted to Apple Books",
};

async function callPublishMode(payload: Record<string, unknown>) {
  const token = await getActiveToken();
  if (!token) throw new Error("Please sign in again.");
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetchWithTimeout(
    `https://${projectId}.supabase.co/functions/v1/ba11-publish-audiobook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    30000,
  );
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export default function AudiobookPublishStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const chapters: Chapter[] = stepData.chapters ?? [];
  const ready = chapters.filter((c) => c.status === "audio-generated" && c.audioUrl);
  const totalChars = ready.reduce((sum, c) => sum + c.text.length, 0);
  const estMinutes = Math.max(1, Math.round(totalChars / 14 / 60));
  const setup = stepData.setup ?? {};
  const voiceName = stepData.selectedVoiceName || "Selected voice";
  const published = !!stepData.publishedAt;
  const micrositeUrl: string = stepData.micrositeUrl || "";
  const zipUrl: string = stepData.zipUrl || "";
  const distributionStatus: Record<string, boolean> =
    stepData.distributionStatus ?? {};

  const [distOpen, setDistOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState<string>(String(setup.retailPriceUsd ?? "14.99"));
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);

  useEffect(() => {
    setPriceDraft(String(setup.retailPriceUsd ?? "14.99"));
  }, [setup.retailPriceUsd]);

  const fullMicrositeUrl = useMemo(() => {
    if (!micrositeUrl) return "";
    if (micrositeUrl.startsWith("http")) return micrositeUrl;
    return `${window.location.origin}${micrositeUrl}`;
  }, [micrositeUrl]);

  const openDistribution = () => {
    if (ready.length === 0) {
      toast({ title: "No audio ready", description: "Generate at least one chapter first.", variant: "destructive" });
      return;
    }
    setDistOpen(true);
  };

  const savePrice = async () => {
    const newPrice = parseFloat(priceDraft);
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      toast({ title: "Invalid price", description: "Enter a positive number.", variant: "destructive" });
      return;
    }
    setSavingPrice(true);
    try {
      await callPublishMode({ bookId, mode: "update_price", retailPriceUsd: newPrice });
      const nextSetup = { ...setup, retailPriceUsd: newPrice };
      setStepData({ ...stepData, setup: nextSetup, retailPriceUsd: newPrice });
      onMarkEdited("publish");
      setEditingPrice(false);
      toast({ title: "Price updated", description: `Now $${newPrice.toFixed(2)} on your author site.` });
    } catch (e: any) {
      toast({ title: "Could not update price", description: e?.message || "Try again.", variant: "destructive" });
    }
    setSavingPrice(false);
  };

  const toggleChannel = async (key: ChannelKey) => {
    const next = !distributionStatus[key];
    const optimistic = { ...distributionStatus, [key]: next };
    setStepData({ ...stepData, distributionStatus: optimistic });
    setSavingChannel(key);
    try {
      await callPublishMode({
        bookId,
        mode: "update_distribution_status",
        distributionStatus: { [key]: next },
      });
    } catch (e: any) {
      // revert
      setStepData({ ...stepData, distributionStatus });
      toast({ title: "Could not save", description: e?.message || "Try again.", variant: "destructive" });
    }
    setSavingChannel(null);
  };

  const copyUrl = async () => {
    if (!fullMicrositeUrl) return;
    try {
      await navigator.clipboard.writeText(fullMicrositeUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
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
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Retail price (USD)</div>
            {editingPrice ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                />
                <Button size="sm" className="h-7 px-2" onClick={savePrice} disabled={savingPrice}>
                  {savingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingPrice(true)}
                className="font-semibold text-left hover:underline"
              >
                {setup.retailPriceUsd ? `$${Number(setup.retailPriceUsd).toFixed(2)}` : "—"}
                <span className="text-[10px] text-muted-foreground ml-1.5">(edit)</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      <Button size="lg" className="w-full" onClick={openDistribution} disabled={ready.length === 0}>
        {published ? <Send className="h-4 w-4 mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
        {published ? "Open distribution again" : "Publish & Open Distribution"}
      </Button>

      {published && fullMicrositeUrl && (
        <Card className="p-4 space-y-3 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Live on your author site
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border rounded px-2 py-1.5 truncate">{fullMicrositeUrl}</code>
            <Button size="sm" variant="outline" onClick={copyUrl}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={fullMicrositeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/dashboard?section=library" className="inline-flex items-center gap-1 underline text-emerald-800">
              <Library className="h-3.5 w-3.5" /> Open My Library
            </Link>
            {zipUrl && (
              <a
                href={zipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline text-emerald-800"
              >
                Download Export Pack (.zip)
              </a>
            )}
          </div>
        </Card>
      )}

      {published && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold">Distribution checklist</div>
          <ul className="space-y-2 text-sm">
            <ChecklistRow done label="Saved to My Library" />
            <ChecklistRow done label="Live on your author site (Buy Now enabled)" />
            <ChecklistRow done label="Export Pack (ZIP + ACX guide) generated" />
            {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((key) => (
              <li key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {distributionStatus[key] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={distributionStatus[key] ? "" : "text-muted-foreground"}>
                    {CHANNEL_LABELS[key]}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={distributionStatus[key] ? "outline" : "secondary"}
                  className="h-7 text-xs"
                  onClick={() => toggleChannel(key)}
                  disabled={savingChannel === key}
                >
                  {savingChannel === key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : distributionStatus[key] ? (
                    "Mark unsubmitted"
                  ) : (
                    "Mark as submitted"
                  )}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            ACX, Spotify and Apple Books require manual upload — Authors Bureau does not submit on your behalf.
            Use the Export Pack above to upload to each retailer, then check them off here to track progress.
          </p>
        </Card>
      )}

      {!published && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Library className="h-3.5 w-3.5" />
          <span>Your audiobook ZIP + ACX guide will be saved to <strong>My Library</strong> automatically when you publish.</span>
        </div>
      )}

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
        voiceName={voiceName}
        chapters={ready.map((c) => ({ index: c.index, title: c.title, audioUrl: c.audioUrl }))}
        onDistributed={(result) => {
          // Backend (ba11-publish-audiobook) is the source of truth: it has already
          // saved the audiobook row, the BA-11 author_nodes row (status=live, with a
          // canonical library_asset) and built the export ZIP by the time this fires.
          const next = {
            ...stepData,
            publishedAt: new Date().toISOString(),
            micrositeUrl: result?.micrositeUrl || stepData.micrositeUrl || "",
            zipUrl: result?.zipUrl || stepData.zipUrl || "",
          };
          setStepData(next);
          onMarkEdited("publish");
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

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
