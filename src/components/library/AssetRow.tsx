import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, ExternalLink, Loader2, Link2, ChevronDown, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  buildExportText, copyToClipboard, downloadAsTxt, downloadAsDocx, downloadAsPdf,
} from "@/lib/builder-export";
import { invokeWithTimeout } from "@/lib/invoke-with-timeout";
import { getMicrositeUrl, NO_MICROSITE_NODES, NODE_NAMES } from "@/lib/node-slug-map";
import type { NodeAsset, ExportFormat } from "@/lib/nodeAssetRegistry";

interface NodeRow {
  id: string;
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: string;
  content_json: any;
  microsite_url: string | null;
  book_id?: string | null;
}

interface Props {
  node: NodeRow;
  asset: NodeAsset;
  sizeHint?: string;
  authorSlug: string | null;
  penName: string | null;
  icon: React.ComponentType<{ className?: string }>;
  showNodeName?: boolean;
}

/** Pluck a value from content_json by dot-path. "*" returns the whole blob. */
function pluckByKey(content: any, key: string): any {
  if (!content) return null;
  if (key === "*") return content;
  return key.split(".").reduce((acc, p) => (acc == null ? acc : acc[p]), content);
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  copy: "Copy text",
  txt: "Download .txt",
  docx: "Download .docx",
  pdf: "Download .pdf",
  pptx: "Download .pptx",
  csv: "Download .csv",
  script_docx: "Download speaker script (.docx)",
};

const RUNTIME_OPTIONS: { value: string; minutes: number; slides: number; label: string; sub: string }[] = [
  { value: "30",  minutes: 30,  slides: 6,  label: "Short pitch",    sub: "30 min · ~6 slides · no exercises" },
  { value: "45",  minutes: 45,  slides: 8,  label: "Keynote",        sub: "45 min · ~6-8 slides · no exercises" },
  { value: "90",  minutes: 90,  slides: 12, label: "Workshop short", sub: "90 min · ~10-12 slides · light exercises" },
  { value: "240", minutes: 240, slides: 16, label: "Half-day",       sub: "240 min · ~14-16 slides · full exercises + breaks" },
  { value: "420", minutes: 420, slides: 22, label: "Full-day",       sub: "420 min · ~20-24 slides · deep facilitation" },
];

function defaultRuntimeForNode(nodeId: string): string {
  if (nodeId === "YR-22") return "240";
  if (nodeId === "BA-10") return "90";
  if (nodeId === "BP-05" || nodeId === "BA-13") return "90";
  if (nodeId === "BA-16" || nodeId === "BA-18") return "30";
  if (nodeId === "YR-23") return "90";
  if (nodeId === "YR-25" || nodeId === "YR-27" || nodeId === "YR-28") return "45";
  return "45";
}

export default function AssetRow({
  node, asset, sizeHint, authorSlug, penName, icon: Icon, showNodeName,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [runtimeDialogOpen, setRuntimeDialogOpen] = useState(false);
  const [runtimeForceRegen, setRuntimeForceRegen] = useState(false);
  const [runtimeChoice, setRuntimeChoice] = useState<string>(defaultRuntimeForNode(node.node_id));

  const nodeName = node.personalised_name || NODE_NAMES[node.node_id] || node.node_name;
  const bookTitle = nodeName;
  const subContent = pluckByKey(node.content_json, asset.key) ?? node.content_json;
  const opts = { content: subContent, nodeName: asset.label, bookTitle, authorName: penName ?? undefined };

  const publicUrl = !NO_MICROSITE_NODES.has(node.node_id) && authorSlug
    ? getMicrositeUrl(authorSlug, node.node_id)
    : null;

  const hasScript = !!node.content_json?.speaker_script?.slides?.length;

  const handleOpen = () => {
    navigate(`/node-builder/${node.node_id}`);
  };

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied");
  };

  const downloadScript = async (target_minutes?: number, target_slide_count?: number, force_regenerate?: boolean) => {
    if (busy) return;
    setBusy("script_docx");
    try {
      if (!hasScript || force_regenerate) {
        toast.info(
          target_minutes && target_minutes >= 240
            ? "Generating a half-day speaker script — this can take up to 2 minutes…"
            : "Generating speaker script — this can take up to 60 seconds…",
        );
      }
      const { data, error } = await invokeWithTimeout<{ filename: string; base64: string }>(
        "export-speaker-script",
        {
          node_id: node.node_id,
          book_id: node.book_id ?? null,
          target_minutes: target_minutes ?? null,
          target_slide_count: target_slide_count ?? null,
          force_regenerate: !!force_regenerate,
        },
        180000,
      );
      if (error) throw error;
      if (!data?.base64) throw new Error("No script returned");
      const blob = base64ToBlob(data.base64, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      triggerDownload(blob, data.filename || `${asset.label}.docx`);
    } catch (err: any) {
      console.error("AssetRow export error", err);
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const run = async (fmt: ExportFormat) => {
    if (busy) return;
    if (fmt === "script_docx") {
      // First time: ask for runtime. After that: use existing script.
      if (!hasScript) {
        setRuntimeForceRegen(false);
        setRuntimeDialogOpen(true);
        return;
      }
      await downloadScript();
      return;
    }
    setBusy(fmt);
    try {
      if (fmt === "copy") {
        await copyToClipboard(opts);
      } else if (fmt === "txt") {
        downloadAsTxt(opts);
      } else if (fmt === "docx") {
        await downloadAsDocx(opts);
      } else if (fmt === "pdf") {
        await downloadAsPdf(opts);
      } else if (fmt === "pptx") {
        // Universal pro-slides exporter — works for any node with slides
        const { data, error } = await invokeWithTimeout<{ filename: string; base64: string }>(
          "export-pro-slides",
          { node_id: node.node_id, asset_key: asset.key, theme: "editorial" },
          120000,
        );
        if (error) throw error;
        if (!data?.base64) throw new Error("No slides returned");
        const blob = base64ToBlob(data.base64, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        triggerDownload(blob, data.filename || `${asset.label}.pptx`);
      } else if (fmt === "csv") {
        // basic CSV: rows of strings if subContent is array
        const csv = toCsv(subContent);
        const blob = new Blob([csv], { type: "text/csv" });
        triggerDownload(blob, `${asset.label.replace(/\s+/g, "_")}.csv`);
      }
    } catch (err: any) {
      console.error("AssetRow export error", err);
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRuntimeConfirm = async () => {
    const opt = RUNTIME_OPTIONS.find(o => o.value === runtimeChoice) ?? RUNTIME_OPTIONS[0];
    setRuntimeDialogOpen(false);
    await downloadScript(opt.minutes, opt.slides, runtimeForceRegen);
  };

  const primaryFormat = asset.formats[0];
  const supportsScript = asset.formats.includes("script_docx");

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-3 py-2 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{asset.label}</span>
            {sizeHint && (
              supportsScript && sizeHint === "Generate on demand" ? (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] cursor-help">{sizeHint}</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Downloads a .docx speaker script. You'll pick the session length (keynote · workshop · half-day · full-day) and ABBY scales the talking points, exercises and break cues to match. First generation takes 30-120 seconds.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Badge variant="outline" className="text-[10px]">{sizeHint}</Badge>
              )
            )}
            <Badge variant="secondary" className="text-[10px] uppercase">{asset.type}</Badge>
          </div>
          {showNodeName && (
            <p className="text-[11px] text-muted-foreground truncate">{nodeName} · {node.node_id}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {publicUrl && (
          <Button variant="ghost" size="sm" onClick={handleCopyLink} aria-label="Copy public link">
            <Link2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          <ExternalLink className="h-4 w-4 mr-1" />Open
        </Button>
        {asset.formats.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={busy !== null}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {primaryFormat?.toUpperCase()}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {asset.formats.map(f => (
                <DropdownMenuItem key={f} onClick={() => run(f)}>
                  {FORMAT_LABELS[f]}
                </DropdownMenuItem>
              ))}
              {supportsScript && hasScript && (
                <DropdownMenuItem
                  onClick={() => {
                    setRuntimeForceRegen(true);
                    setRuntimeDialogOpen(true);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Regenerate at different length…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Runtime picker dialog (script_docx only) */}
      <Dialog open={runtimeDialogOpen} onOpenChange={setRuntimeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose session length</DialogTitle>
            <DialogDescription>
              ABBY will reshape the slide deck itself (expanding or contracting slides) AND scale talking points, exercises and break cues so the deck and the speaker script stay in sync. A 240-min half-day grows the deck to ~16 slides with ~30,000 words of script; a 30-min pitch keeps it tight at ~6 slides.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={runtimeChoice} onValueChange={setRuntimeChoice} className="gap-3 py-2">
            {RUNTIME_OPTIONS.map(opt => (
              <Label
                key={opt.value}
                htmlFor={`rt-${opt.value}`}
                className="flex items-start gap-3 rounded-md border bg-card/50 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
              >
                <RadioGroupItem id={`rt-${opt.value}`} value={opt.value} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.sub}</div>
                </div>
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRuntimeDialogOpen(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button onClick={handleRuntimeConfirm} disabled={busy !== null}>
              {busy === "script_docx" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <>Generate script</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── helpers ──
function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function toCsv(value: any): string {
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (typeof value[0] === "string") return value.map(v => `"${String(v).replace(/"/g, '""')}"`).join("\n");
    if (typeof value[0] === "object") {
      const keys = Object.keys(value[0]);
      const head = keys.join(",");
      const rows = value.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","));
      return [head, ...rows].join("\n");
    }
  }
  return JSON.stringify(value, null, 2);
}
